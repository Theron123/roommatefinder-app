/**
 * Calculates the number of shared words between two strings.
 * Used for matching hobbies, preferences, and dealbreakers.
 */
export const getSimilarityScore = (text1: string | null | undefined, text2: string | null | undefined) => {
  if (!text1 || !text2) return 0;
  const words1 = text1.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const words2 = text2.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const set1 = new Set(words1);
  const overlap = words2.filter((word) => set1.has(word));
  return overlap.length;
};

/**
 * Calculates distance between two coordinates in kilometers using the Haversine formula.
 */
export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};
