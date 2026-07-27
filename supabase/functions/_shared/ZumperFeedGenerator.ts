// Copia dentro de supabase/functions/_shared/ del generador canónico en
// lib/integrations/zumper/ZumperFeedGenerator.ts — necesaria porque el
// bundler de deploy de Supabase (`supabase functions deploy`) solo empaqueta
// archivos dentro de supabase/functions/, no rutas fuera de ese árbol.
// Confirmado empíricamente: importar desde ../../../lib/... funcionaba con
// `deno check`/`deno test`/`deno run` en local, pero el deploy real fallaba
// silenciosamente ("failed to open eszip") por esta razón. Si tocas la lógica
// de generación del feed, actualiza también lib/integrations/zumper/
// ZumperFeedGenerator.ts (la usa app/api/zumper-feed+api.ts en dev local) —
// no hay un solo archivo fuente porque ambos runtimes no pueden compartir uno.
export interface ZumperListing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  zipCode: string;
  city: string;
  state: string;
  address: string;
  propertyType: 'apartment' | 'house' | 'room';
  bedrooms: number;
  bathrooms: number;
  images: string[];
  contactEmail: string;
}

// Genera el feed XML de listados en el formato esperado por Zumper
export class ZumperFeedGenerator {

  /**
   * Genera el Feed XML de Zumper a partir de listings ya mapeados al shape
   * ZumperListing. No consulta la base de datos por sí mismo.
   */
  async generateXMLFeed(listings: ZumperListing[]): Promise<string> {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ZumperFeed>\n`;

    for (const listing of listings) {
      xml += `  <Property>\n`;
      xml += `    <PropertyID>${listing.id}</PropertyID>\n`;
      xml += `    <Title>${this.escapeXML(listing.title)}</Title>\n`;
      xml += `    <Description>${this.escapeXML(listing.description)}</Description>\n`;
      xml += `    <Price currency="${listing.currency}">${listing.price}</Price>\n`;
      xml += `    <Location>\n`;
      xml += `      <Address>${this.escapeXML(listing.address)}</Address>\n`;
      xml += `      <City>${this.escapeXML(listing.city)}</City>\n`;
      xml += `      <State>${this.escapeXML(listing.state)}</State>\n`;
      xml += `      <ZipCode>${this.escapeXML(listing.zipCode)}</ZipCode>\n`;
      xml += `    </Location>\n`;
      xml += `    <Details>\n`;
      xml += `      <PropertyType>${listing.propertyType}</PropertyType>\n`;
      xml += `      <Bedrooms>${listing.bedrooms}</Bedrooms>\n`;
      xml += `      <Bathrooms>${listing.bathrooms}</Bathrooms>\n`;
      xml += `    </Details>\n`;
      xml += `    <Images>\n`;
      for (const img of listing.images) {
        xml += `      <Image url="${this.escapeXML(img)}" />\n`;
      }
      xml += `    </Images>\n`;
      xml += `    <ContactEmail>${this.escapeXML(listing.contactEmail)}</ContactEmail>\n`;
      xml += `  </Property>\n`;
    }

    xml += `</ZumperFeed>`;
    return xml;
  }

  // Escapa caracteres especiales para incrustar texto de forma segura en el XML
  private escapeXML(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}
