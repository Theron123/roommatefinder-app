import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { getMockListings, getRealListings, SOURCE } from './helpers.ts';

Deno.test('SOURCE - el identificador de proveedor es "zumper"', () => {
  assertEquals(SOURCE, 'zumper');
});

Deno.test('getMockListings - devuelve 2 listings de ejemplo con external_id únicos', () => {
  const listings = getMockListings();
  assertEquals(listings.length, 2);
  const ids = listings.map((l) => l.external_id);
  assertEquals(new Set(ids).size, ids.length); // sin duplicados
  for (const listing of listings) {
    assertEquals(typeof listing.title, 'string');
    assertEquals(typeof listing.price, 'number');
  }
});

Deno.test('getRealListings - mapea una respuesta JSON tipo array al shape ExternalListing', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify([
          { id: 'ext-1', title: 'Depto real', address: 'Calle 1', price: '950', currency: 'USD' },
        ]),
        { status: 200 }
      )
    )) as typeof fetch;

  try {
    const listings = await getRealListings('https://example.com/feed', 'test-token');
    assertEquals(listings.length, 1);
    assertEquals(listings[0].external_id, 'ext-1');
    assertEquals(listings[0].price, 950); // Number(item.price) convierte el string
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('getRealListings - mapea una respuesta JSON tipo { listings: [...] }', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify({ listings: [{ external_id: 'ext-2', title: 'Otro', address: 'Calle 2', price: 700 }] }), {
        status: 200,
      })
    )) as typeof fetch;

  try {
    const listings = await getRealListings('https://example.com/feed', 'test-token');
    assertEquals(listings.length, 1);
    assertEquals(listings[0].external_id, 'ext-2');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('getRealListings - lanza un error descriptivo si el feed responde con error HTTP', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response('Unauthorized', { status: 401 }))) as typeof fetch;

  try {
    await assertRejects(
      () => getRealListings('https://example.com/feed', 'bad-token'),
      Error,
      'respondió 401'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
