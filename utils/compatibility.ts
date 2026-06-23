export const calculateCompatibility = (user1: any, user2: any) => {
  if (!user1?.lifestyle || !user2?.lifestyle) return null;
  
  const l1 = typeof user1.lifestyle === 'string' ? JSON.parse(user1.lifestyle) : user1.lifestyle;
  const l2 = typeof user2.lifestyle === 'string' ? JSON.parse(user2.lifestyle) : user2.lifestyle;
  
  if (!l1 || !l2) return null;

  let score = 0;
  let totalFields = 0;

  const keysToCompare = ['sleep', 'cleanliness', 'social', 'parties', 'pets', 'smoking', 'music', 'work', 'occupation', 'cooking'];
  
  for (const key of keysToCompare) {
    if (l1[key] && l2[key]) {
      totalFields++;
      if (l1[key] === l2[key]) score += 1;
    }
  }

  if (totalFields === 0) return null;
  
  let percentage = 40 + Math.round((score / totalFields) * 60);
  return percentage;
};
