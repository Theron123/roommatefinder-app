// RM-2026-016: antes esto era un wildcard '*'. Restringido a los orígenes
// reales de la app (dominio de producción + servidor de desarrollo local
// de Expo Web). Las apps nativas no envían header Origin, así que no les
// afecta este cambio.
const ALLOWED_ORIGINS = new Set([
  'https://roomiemates.com',
  'https://www.roomiemates.com',
  'http://localhost:8081',
]);

// Devuelve los headers CORS a usar en la respuesta, reflejando el origin de la
// request solo si está en la allowlist; si no, cae al dominio de producción.
export function getCorsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://roomiemates.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}
