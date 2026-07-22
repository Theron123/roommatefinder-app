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
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ZumperFeedGenerator, ZumperListing } from '../../../lib/integrations/zumper/ZumperFeedGenerator.ts';

const CONTACT_EMAIL = 'listings@roomiemates.com';

type ListingRow = {
  id: string;
  title: string | null;
  address: string | null;
  description: string | null;
  price: number | null;
  images: string[] | null;
};

// Best-effort: nuestro `address` es un solo string de texto libre (ej.
// "123 Main St, New York, NY 10001"), no columnas separadas. Se parte por
// comas para aproximar city/state/zip; si el feed real de Zumper requiere
// precisión aquí, hace falta agregar columnas dedicadas a `listings`.
// El último segmento suele ser "ESTADO CODIGO_POSTAL" (o solo un país sin
// código postal, ej. "Costa Rica") — se separa el código postal de ese
// segmento cuando hay un patrón numérico al final, en vez de dejarlo pegado
// al estado.
function splitAddress(address: string): { city: string; state: string; zipCode: string } {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  const city = parts[1] || parts[0] || '';
  const lastPart = parts[2] || '';
  const zipMatch = lastPart.match(/^(.*?)\s+(\d[\d-]{3,9})$/);
  const state = zipMatch ? zipMatch[1].trim() : lastPart;
  const zipCode = zipMatch ? zipMatch[2] : '';
  return { city, state, zipCode };
}

// Comparación en tiempo constante para el token — evita filtrar por timing
// cuánto del token coincide (String !== ya sería suficiente en la práctica
// para este caso de uso, pero es una defensa barata y correcta de hacer).
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  const len = Math.max(bufA.length, bufB.length);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

function mapRowToZumperListing(row: ListingRow): ZumperListing {
  const address = row.address || '';
  const { city, state, zipCode } = splitAddress(address);
  return {
    id: row.id,
    title: row.title || 'Untitled listing',
    description: row.description || '',
    price: row.price || 0,
    currency: 'USD',
    zipCode,
    city,
    state,
    address,
    // Defaults por la limitación de esquema descrita arriba.
    propertyType: 'room',
    bedrooms: 1,
    bathrooms: 1,
    images: row.images || [],
    contactEmail: CONTACT_EMAIL,
  };
}

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
