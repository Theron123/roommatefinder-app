import { calculateCompatibility } from '../compatibility';

describe('calculateCompatibility', () => {
  it('devuelve null si a alguno de los dos usuarios le falta lifestyle', () => {
    expect(calculateCompatibility({}, { lifestyle: { sleep: 'early' } })).toBeNull();
    expect(calculateCompatibility({ lifestyle: { sleep: 'early' } }, {})).toBeNull();
    expect(calculateCompatibility(null, { lifestyle: {} })).toBeNull();
  });

  it('devuelve null si no hay ningún campo comparable entre ambos', () => {
    const user1 = { lifestyle: { sleep: 'early' } };
    const user2 = { lifestyle: { cleanliness: 'tidy' } };
    expect(calculateCompatibility(user1, user2)).toBeNull();
  });

  it('devuelve 100 cuando todos los campos comparables coinciden', () => {
    const lifestyle = {
      sleep: 'early', cleanliness: 'tidy', social: 'outgoing', parties: 'no',
      pets: 'yes', smoking: 'no', music: 'rock', work: 'remote',
      occupation: 'engineer', cooking: 'yes',
    };
    const user1 = { lifestyle };
    const user2 = { lifestyle: { ...lifestyle } };
    expect(calculateCompatibility(user1, user2)).toBe(100);
  });

  it('devuelve 40 (el piso) cuando hay campos comparables pero ninguno coincide', () => {
    const user1 = {
      lifestyle: { sleep: 'early', cleanliness: 'tidy', social: 'outgoing', parties: 'no', pets: 'yes' },
    };
    const user2 = {
      lifestyle: { sleep: 'late', cleanliness: 'messy', social: 'quiet', parties: 'yes', pets: 'no' },
    };
    expect(calculateCompatibility(user1, user2)).toBe(40);
  });

  it('calcula un porcentaje intermedio proporcional a los campos que coinciden', () => {
    // 2 campos comparables (ambos presentes), 1 de 2 coincide -> 40 + round((1/2)*60) = 70
    const user1 = { lifestyle: { sleep: 'early', cleanliness: 'tidy' } };
    const user2 = { lifestyle: { sleep: 'early', cleanliness: 'messy' } };
    expect(calculateCompatibility(user1, user2)).toBe(70);
  });

  it('acepta lifestyle como string JSON y lo parsea', () => {
    const user1 = { lifestyle: JSON.stringify({ sleep: 'early' }) };
    const user2 = { lifestyle: { sleep: 'early' } };
    expect(calculateCompatibility(user1, user2)).toBe(100);
  });

  it('ignora campos fuera de la lista de keysToCompare', () => {
    const user1 = { lifestyle: { sleep: 'early', favoriteColor: 'blue' } };
    const user2 = { lifestyle: { sleep: 'early', favoriteColor: 'red' } };
    // Solo "sleep" cuenta -> coincide -> 100, "favoriteColor" no está en keysToCompare
    expect(calculateCompatibility(user1, user2)).toBe(100);
  });
});
