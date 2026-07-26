import { ZumperFeedGenerator, ZumperListing, getMockZumperListings } from '../ZumperFeedGenerator';

const baseListing: ZumperListing = {
  id: 'room-1',
  title: 'Cuarto soleado',
  description: 'Cerca del centro',
  price: 800,
  currency: 'USD',
  zipCode: '10001',
  city: 'New York',
  state: 'NY',
  address: '123 Main St',
  propertyType: 'room',
  bedrooms: 1,
  bathrooms: 1,
  images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  contactEmail: 'listings@roomiemates.com',
};

describe('ZumperFeedGenerator.generateXMLFeed', () => {
  const generator = new ZumperFeedGenerator();

  it('genera un feed vacío válido cuando no hay listings', async () => {
    const xml = await generator.generateXMLFeed([]);
    expect(xml).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<ZumperFeed>\n</ZumperFeed>');
  });

  it('incluye todos los campos esperados de un listing', async () => {
    const xml = await generator.generateXMLFeed([baseListing]);
    expect(xml).toContain('<PropertyID>room-1</PropertyID>');
    expect(xml).toContain('<Title>Cuarto soleado</Title>');
    expect(xml).toContain('<Price currency="USD">800</Price>');
    expect(xml).toContain('<City>New York</City>');
    expect(xml).toContain('<State>NY</State>');
    expect(xml).toContain('<ZipCode>10001</ZipCode>');
    expect(xml).toContain('<PropertyType>room</PropertyType>');
    expect(xml).toContain('<Bedrooms>1</Bedrooms>');
    expect(xml).toContain('<Image url="https://example.com/a.jpg" />');
    expect(xml).toContain('<Image url="https://example.com/b.jpg" />');
    expect(xml).toContain('<ContactEmail>listings@roomiemates.com</ContactEmail>');
  });

  it('escapa caracteres especiales de XML en campos de texto libre', async () => {
    const xml = await generator.generateXMLFeed([{
      ...baseListing,
      title: 'Cuarto & Baño <privado> "grande"',
    }]);
    expect(xml).toContain('<Title>Cuarto &amp; Baño &lt;privado&gt; &quot;grande&quot;</Title>');
    expect(xml).not.toContain('<privado>'); // no debe colarse markup sin escapar
  });

  it('serializa múltiples listings en el mismo feed', async () => {
    const second = { ...baseListing, id: 'room-2', title: 'Otro cuarto' };
    const xml = await generator.generateXMLFeed([baseListing, second]);
    expect((xml.match(/<Property>/g) || []).length).toBe(2);
    expect(xml).toContain('<PropertyID>room-1</PropertyID>');
    expect(xml).toContain('<PropertyID>room-2</PropertyID>');
  });
});

describe('getMockZumperListings', () => {
  it('devuelve datos de ejemplo con el shape completo de ZumperListing', () => {
    const mocks = getMockZumperListings();
    expect(mocks).toHaveLength(1);
    expect(mocks[0]).toMatchObject({
      id: 'room-101',
      propertyType: 'room',
      currency: 'USD',
    });
  });
});
