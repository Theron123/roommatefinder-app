module.exports = {
  preset: 'jest-expo',
  // Por ahora solo cubrimos lógica de negocio pura (utils/, lib/integrations/).
  // Los componentes/pantallas se van agregando incrementalmente (ver plan de
  // testing en el historial del proyecto).
  testPathIgnorePatterns: [
    '/node_modules/', '/.expo/', '/dist/', '/scratch/',
    // Estos usan sintaxis de Deno (Deno.test, imports jsr:) y corren con
    // `deno test`, no con Jest — ver .github/workflows/ci.yml.
    '/supabase/functions/',
  ],
};
