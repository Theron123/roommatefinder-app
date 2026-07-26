// Jala el inventario de un proveedor externo (hoy: Zumper) y lo deposita en
// `listings_staging` para que un admin lo apruebe/rechace desde el dashboard
// (app/(admin)/listings.tsx, tab "Staging") antes de que llegue a `listings`.
//
// Corre en modo MOCK mientras no existan credenciales reales de Zumper —
// devuelve un par de listings de ejemplo para poder probar el flujo de
// aprobación end-to-end sin depender de un tercero. En cuanto se configuren
// los secrets de abajo, cambia solo a modo real sin tocar el resto del código.
//
// Secrets requeridos para modo real (`supabase secrets set ...`):
//   ZUMPER_FEED_URL   - URL del feed/API de importación que Zumper entregue
//   ZUMPER_API_TOKEN  - token/API key para autenticar contra ese feed
//
// Nota: Zumper normalmente no ofrece un feed de "pull" a terceros (su modelo
// es al revés: tú les mandas un feed, ver lib/integrations/zumper/
// ZumperFeedGenerator.ts). Confirmar con su equipo de partnerships que este
// endpoint de importación existe antes de asumir que solo falta el secret.
//
// La lógica de mock/fetch/mapeo vive en helpers.ts para poder testearla con
// `deno test` sin depender de Deno.serve — ver helpers.test.ts.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { SOURCE, getMockListings, getRealListings } from './helpers.ts';

// Endpoint admin-only que jala el inventario externo (mock o real según los secrets
// configurados) y lo hace upsert en `listings_staging` para revisión manual.
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: isAdmin, error: adminCheckErr } = await admin.rpc('is_admin', { user_id: user.id });
    if (adminCheckErr || !isAdmin) {
      return new Response(JSON.stringify({ success: false, message: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const feedUrl = Deno.env.get('ZUMPER_FEED_URL');
    const apiToken = Deno.env.get('ZUMPER_API_TOKEN');
    const mode = feedUrl && apiToken ? 'live' : 'mock';

    const externalListings = mode === 'live'
      ? await getRealListings(feedUrl!, apiToken!)
      : getMockListings();

    let imported = 0;
    const errors: string[] = [];

    for (const item of externalListings) {
      const { error } = await admin.from('listings_staging').upsert(
        {
          source: SOURCE,
          external_id: item.external_id,
          title: item.title,
          address: item.address,
          description: item.description ?? null,
          price: item.price,
          currency: item.currency || 'USD',
          latitude: item.latitude ?? null,
          longitude: item.longitude ?? null,
          utilities_included: item.utilities_included ?? false,
          images: item.images ?? [],
          raw_payload: item,
          imported_at: new Date().toISOString(),
        },
        { onConflict: 'source,external_id' }
      );
      if (error) errors.push(`${item.external_id}: ${error.message}`);
      else imported++;
    }

    return new Response(JSON.stringify({ success: true, mode, imported, errors }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('import-listings-sync error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Unexpected server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
