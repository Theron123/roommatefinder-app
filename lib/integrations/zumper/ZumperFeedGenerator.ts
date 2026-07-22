// Zumper Feed XML Generator
// Basado en las especificaciones comunes de Feeds de Zumper para listados de propiedades.
// El modelo público real de Zumper es push: nosotros les damos la URL de este feed y
// ellos la crawlean periódicamente (no exponen una API para que nosotros "importemos"
// su inventario — ver lib/integrations/zumper/ZumperImporter/staging para esa otra
// dirección, que sigue en mock hasta confirmar con su equipo de partnerships).
//
// Este generador ya no inventa datos: recibe los listings reales como parámetro.
// Quien llama (supabase/functions/zumper-feed/index.ts en producción, o el mock de
// abajo en dev local) es responsable de traer los datos y mapearlos a ZumperListing.

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

// Usado solo para pruebas locales (app/api/zumper-feed+api.ts) — no representa
// datos reales de `listings`.
export function getMockZumperListings(): ZumperListing[] {
  return [
    {
      id: "room-101",
      title: "Cuarto privado en apartamento moderno",
      description: "Excelente cuarto con baño privado en el centro de la ciudad.",
      price: 800,
      currency: "USD",
      zipCode: "10001",
      city: "New York",
      state: "NY",
      address: "123 Main St",
      propertyType: "room",
      bedrooms: 1,
      bathrooms: 1,
      images: ["https://example.com/photo1.jpg"],
      contactEmail: "admin@roommatefinder.com"
    }
  ];
}

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

export const zumperFeedGenerator = new ZumperFeedGenerator();
