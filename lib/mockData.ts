export const MOCK_PROFILES = [
  {
    id: 'mock-1',
    likes: 'Video Games, Reading, Music, Coding',
    preferences: 'Clean daily, Quiet after 10PM, Early riser',
    dealbreakers: 'Smoking indoors, Pets, Messy kitchen',
    // Offsets to construct coordinates near the user dynamically
    latOffset: 0.015,
    lngOffset: -0.010,
  },
  {
    id: 'mock-2',
    likes: 'Movies, Hiking, Surfing, Cooking',
    preferences: 'Relaxed cleaning, Late nights ok, Social weekends',
    dealbreakers: 'Strict rules, Quiet hours before midnight',
    latOffset: 0.005,
    lngOffset: 0.005,
  },
  {
    id: 'mock-3',
    likes: 'Reading, Music, Coffee',
    preferences: 'Clean weekly, Quiet after 10PM, Working from home',
    dealbreakers: 'Loud music, Parties, Smoking',
    latOffset: 0.05,
    lngOffset: 0.05,
  },
  {
    id: 'mock-4',
    likes: 'Cooking, Video Games, Board Games',
    preferences: 'Clean kitchen immediately, Occasional friends over',
    dealbreakers: 'Leaving dishes out, Untidy common areas',
    latOffset: 0.1,
    lngOffset: -0.05,
  }
];

export const mockCurrentUserConfig = {
  profile: null as any,
};
