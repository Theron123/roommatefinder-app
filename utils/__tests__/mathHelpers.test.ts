import { getSimilarityScore, getDistanceFromLatLonInKm } from '../mathHelpers';

describe('getSimilarityScore', () => {
  it('devuelve 0 si falta cualquiera de los dos textos', () => {
    expect(getSimilarityScore(null, 'hola mundo')).toBe(0);
    expect(getSimilarityScore('hola mundo', undefined)).toBe(0);
    expect(getSimilarityScore('', 'hola')).toBe(0);
  });

  it('cuenta palabras compartidas ignorando mayúsculas', () => {
    expect(getSimilarityScore('Hello World', 'hello world')).toBe(2);
  });

  it('quita puntuación antes de comparar', () => {
    expect(getSimilarityScore('Dogs, cats & birds!', 'dogs cats')).toBe(2);
  });

  it('devuelve 0 cuando no hay palabras en común', () => {
    expect(getSimilarityScore('gatos perros', 'aves peces')).toBe(0);
  });

  it('cuenta cualquier palabra compartida, aunque sea una palabra corta como una conjunción', () => {
    expect(getSimilarityScore('gatos y perros', 'aves y peces')).toBe(1);
  });

  it('cuenta repetidos del segundo texto una vez por cada aparición (no deduplica)', () => {
    // Comportamiento real de la función: al filtrar words2 contra el set de words1,
    // una palabra repetida en text2 se cuenta más de una vez.
    expect(getSimilarityScore('cat', 'cat cat')).toBe(2);
  });
});

describe('getDistanceFromLatLonInKm', () => {
  it('devuelve 0 para el mismo punto', () => {
    expect(getDistanceFromLatLonInKm(9.9281, -84.0907, 9.9281, -84.0907)).toBeCloseTo(0, 5);
  });

  it('calcula ~10007.5 km entre dos puntos separados 90° de longitud sobre el ecuador', () => {
    // Un cuarto de la circunferencia terrestre con R=6371km: 6371 * (Math.PI / 2)
    const expected = 6371 * (Math.PI / 2);
    expect(getDistanceFromLatLonInKm(0, 0, 0, 90)).toBeCloseTo(expected, 1);
  });

  it('es simétrica (A→B == B→A)', () => {
    const ab = getDistanceFromLatLonInKm(9.9281, -84.0907, 40.7128, -74.006);
    const ba = getDistanceFromLatLonInKm(40.7128, -74.006, 9.9281, -84.0907);
    expect(ab).toBeCloseTo(ba, 8);
  });
});
