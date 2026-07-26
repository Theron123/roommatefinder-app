// Feed XML público que Zumper (o cualquier ILS) crawlea periódicamente para
// traer nuestro inventario activo. Esta es la dirección push — el modelo
// público real de Zumper: nosotros les damos esta URL, ellos la consultan.
// No requiere ninguna credencial de Zumper para funcionar; solo necesita que
// nosotros protejamos el endpoint con un token propio (ver abajo), porque
// `listings` solo es legible por usuarios `authenticated` vía RLS y este
// endpoint necesita exponer un subconjunto de esos datos sin login.
//
// Secret requerido (`supabase secrets set ...`):
//   ZUMPER_FEED_ACCESS_TOKEN - token que tú generas (ej. openssl rand -hex 32).
//   Sin este secret configurado, el endpoint responde 403 siempre — es
//   deliberado, para no exponer listings públicamente por accidente antes de
//   decidir protegerlo. Una vez seteado, la URL a entregarle a Zumper es:
//   https://<project-ref>.supabase.co/functions/v1/zumper-feed?token=<ese-token>
//
// Limitación de datos conocida: `listings` no tiene columnas de
// bedrooms/bathrooms/propertyType/city/state/zip separadas (solo un campo
// `address` de texto libre). Se rellenan con defaults razonables abajo; si
// Zumper exige esos campos con precisión, hay que agregar esas columnas a
// `listings` antes de dar de alta el feed con ellos.
//
// La lógica pura (parseo de address, comparación de token, mapeo de fila)
// vive en helpers.ts para poder testearla con `deno test` sin necesitar un
// servidor HTTP ni una base de datos — ver helpers.test.ts.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ZumperFeedGenerator } from '../../../lib/integrations/zumper/ZumperFeedGenerator.ts';
import { ListingRow, mapRowToZumperListing, timingSafeEqual } from './helpers.ts';

// Endpoint público (protegido por token) que arma y sirve el feed XML de Zumper
// a partir de los listings activos y verificados.
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || '';
    const expectedToken = Deno.env.get('ZUMPER_FEED_ACCESS_TOKEN');

    if (!expectedToken || !timingSafeEqual(token, expectedToken)) {
      return new Response('Forbidden', { status: 403 });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Solo listings verificados por un admin — no exponemos al feed público
    // de un tercero cualquier anuncio activo sin ese control de calidad.
    const { data, error } = await admin
      .from('listings')
      .select('id, title, address, description, price, images')
      .eq('status', 'active')
      .eq('is_property_verified', true);

    if (error) throw error;

    const zumperListings = ((data as ListingRow[]) || []).map(mapRowToZumperListing);
    const generator = new ZumperFeedGenerator();
    const xml = await generator.generateXMLFeed(zumperListings);

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (err) {
    console.error('zumper-feed error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate feed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
