import { zumperFeedGenerator, getMockZumperListings } from '../../lib/integrations/zumper/ZumperFeedGenerator';

/**
 * Endpoint de Zumper para pruebas en dev local únicamente — sirve datos mock.
 * NO corre en producción (deploy es SPA estática, estas rutas +api.ts no se
 * ejecutan). El feed real de producción es la Edge Function
 * supabase/functions/zumper-feed/index.ts, que sí lee `listings` real.
 */
export async function GET(request: Request) {
  try {
    const xmlContent = await zumperFeedGenerator.generateXMLFeed(getMockZumperListings());

    return new Response(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate' // Cachear por 1 hora
      }
    });
  } catch (error) {
    console.error("[ZUMPER FEED ERROR]", error);
    return new Response(JSON.stringify({ error: "Failed to generate feed" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
