import { zumperFeedGenerator } from '../../lib/integrations/zumper/ZumperFeedGenerator';

/**
 * Endpoint público de Zumper para consumir el Feed XML.
 * Ruta accesible en: https://tu-dominio.com/api/zumper-feed
 */
export async function GET(request: Request) {
  try {
    const xmlContent = await zumperFeedGenerator.generateXMLFeed();

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
