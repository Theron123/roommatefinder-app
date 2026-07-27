// Lógica pura de zumper-feed, separada de index.ts a propósito: index.ts llama
// Deno.serve(...) como efecto de módulo, lo que arrancaría un servidor HTTP con
// solo importarlo — inútil (y peligroso) para tests unitarios. Este archivo no
// importa Deno.serve ni hace red/DB, así que se puede testear con `deno test`
// sin infraestructura.
import { ZumperFeedGenerator, ZumperListing } from '../_shared/ZumperFeedGenerator.ts';

export const CONTACT_EMAIL = 'listings@roomiemates.com';

export type ListingRow = {
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
export function splitAddress(address: string): { city: string; state: string; zipCode: string } {
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
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  const len = Math.max(bufA.length, bufB.length);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

// Convierte una fila de `listings` al shape ZumperListing que espera el generador de XML.
export function mapRowToZumperListing(row: ListingRow): ZumperListing {
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
