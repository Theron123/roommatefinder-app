// Lógica pura de import-listings-sync, separada de index.ts a propósito:
// index.ts llama Deno.serve(...) como efecto de módulo, lo que arrancaría un
// servidor HTTP con solo importarlo — inútil para tests unitarios. Este
// archivo se puede testear con `deno test` (getRealListings sí usa `fetch`,
// pero se puede stubbear fácilmente en el test).
export interface ExternalListing {
  external_id: string;
  title: string;
  address: string;
  description?: string;
  price: number;
  currency?: string;
  latitude?: number | null;
  longitude?: number | null;
  utilities_included?: boolean;
  images?: string[];
}

export const SOURCE = 'zumper';

// Genera listings de ejemplo para el modo mock (mientras no haya credenciales reales de Zumper).
export function getMockListings(): ExternalListing[] {
  return [
    {
      external_id: 'zumper-mock-001',
      title: 'Cuarto privado cerca del centro (mock)',
      address: '123 Main St, New York, NY 10001',
      description: 'Listing de ejemplo generado en modo mock — no es un dato real de Zumper.',
      price: 850,
      currency: 'USD',
      latitude: 40.7128,
      longitude: -74.006,
      utilities_included: true,
      images: [],
    },
    {
      external_id: 'zumper-mock-002',
      title: 'Apartamento de 1 habitación (mock)',
      address: '456 Oak Ave, Brooklyn, NY 11201',
      description: 'Listing de ejemplo generado en modo mock — no es un dato real de Zumper.',
      price: 1600,
      currency: 'USD',
      latitude: 40.6928,
      longitude: -73.9903,
      utilities_included: false,
      images: [],
    },
  ];
}

// Implementación de referencia — ajustar al shape real del feed cuando se
// confirme con Zumper. Asume JSON con un array de propiedades; si el feed
// real es XML habría que parsearlo aquí en vez de response.json().
export async function getRealListings(feedUrl: string, apiToken: string): Promise<ExternalListing[]> {
  const response = await fetch(feedUrl, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Zumper feed respondió ${response.status}: ${await response.text()}`);
  }
  const body = await response.json();
  const items = Array.isArray(body) ? body : body.listings || [];
  return items.map((item: any) => ({
    external_id: String(item.id ?? item.external_id),
    title: item.title,
    address: item.address,
    description: item.description,
    price: Number(item.price),
    currency: item.currency || 'USD',
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    utilities_included: Boolean(item.utilities_included),
    images: item.images || [],
  }));
}
