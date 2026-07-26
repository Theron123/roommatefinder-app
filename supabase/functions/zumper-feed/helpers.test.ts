import { assertEquals } from 'jsr:@std/assert@1';
import { splitAddress, timingSafeEqual, mapRowToZumperListing, ListingRow } from './helpers.ts';

Deno.test('splitAddress - separa ciudad, estado y código postal de una dirección de EE.UU.', () => {
  const result = splitAddress('123 Main St, New York, NY 10001');
  assertEquals(result, { city: 'New York', state: 'NY', zipCode: '10001' });
});

Deno.test('splitAddress - sin código postal (dirección internacional) deja zipCode vacío', () => {
  const result = splitAddress('Escazú, San José, Costa Rica');
  assertEquals(result, { city: 'San José', state: 'Costa Rica', zipCode: '' });
});

Deno.test('splitAddress - dirección de un solo segmento usa ese segmento como ciudad', () => {
  const result = splitAddress('Downtown');
  assertEquals(result, { city: 'Downtown', state: '', zipCode: '' });
});

Deno.test('splitAddress - string vacío no revienta', () => {
  const result = splitAddress('');
  assertEquals(result, { city: '', state: '', zipCode: '' });
});

Deno.test('timingSafeEqual - true cuando ambos strings son idénticos', () => {
  assertEquals(timingSafeEqual('mi-token-secreto', 'mi-token-secreto'), true);
});

Deno.test('timingSafeEqual - false cuando difieren en contenido', () => {
  assertEquals(timingSafeEqual('mi-token-secreto', 'otro-token-distinto'), false);
});

Deno.test('timingSafeEqual - false cuando difieren en longitud', () => {
  assertEquals(timingSafeEqual('corto', 'un-token-mucho-mas-largo'), false);
});

Deno.test('timingSafeEqual - false contra un string vacío (token no configurado)', () => {
  assertEquals(timingSafeEqual('', 'algun-token'), false);
});

Deno.test('mapRowToZumperListing - usa defaults razonables y separa la dirección', () => {
  const row: ListingRow = {
    id: 'abc-123',
    title: 'Cuarto soleado',
    address: '123 Main St, New York, NY 10001',
    description: 'Cerca del centro',
    price: 850,
    images: ['https://x/a.jpg'],
  };
  const listing = mapRowToZumperListing(row);
  assertEquals(listing.id, 'abc-123');
  assertEquals(listing.city, 'New York');
  assertEquals(listing.state, 'NY');
  assertEquals(listing.zipCode, '10001');
  assertEquals(listing.propertyType, 'room');
  assertEquals(listing.bedrooms, 1);
  assertEquals(listing.bathrooms, 1);
  assertEquals(listing.contactEmail, 'listings@roomiemates.com');
});

Deno.test('mapRowToZumperListing - usa fallbacks cuando la fila tiene campos nulos', () => {
  const row: ListingRow = {
    id: 'abc-456',
    title: null,
    address: null,
    description: null,
    price: null,
    images: null,
  };
  const listing = mapRowToZumperListing(row);
  assertEquals(listing.title, 'Untitled listing');
  assertEquals(listing.description, '');
  assertEquals(listing.price, 0);
  assertEquals(listing.images, []);
  assertEquals(listing.address, '');
});
