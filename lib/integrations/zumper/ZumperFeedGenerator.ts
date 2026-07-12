// Zumper Feed XML Generator (Simulated)
// Basado en las especificaciones comunes de Feeds de Zumper para listados de propiedades.

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

export class ZumperFeedGenerator {
  
  /**
   * Genera el Feed XML de Zumper basado en los listados activos de la aplicación.
   * Por ahora usa datos Mock, pero luego se conectará a la base de datos real.
   */
  async generateXMLFeed(): Promise<string> {
    // 1. Aquí haríamos la consulta a la base de datos de RoommateFinder
    // const activeListings = await db.query("SELECT * FROM apartments WHERE status = 'active'");
    
    // MOCK DATA
    const mockListings: ZumperListing[] = [
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

    // 2. Construir el XML string
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ZumperFeed>\n`;
    
    for (const listing of mockListings) {
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
