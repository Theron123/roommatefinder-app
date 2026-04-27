export type MockProfile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  photoUrl: string;
  likes: string;
  preferences: string;
  dealbreakers: string;
  latOffset: number;
  lngOffset: number;
};

export const MOCK_PROFILES: MockProfile[] = [
  {
    id: 'mock-1',
    name: 'Carlos',
    age: 24,
    bio: "Hey! I'm a software engineer who loves a calm environment. Seeking someone who respects quiet hours but is down for occasional gaming sessions.",
    photoUrl: 'https://i.pravatar.cc/300?img=11',
    likes: '🎮 Video Games, 📚 Reading, 🎵 Music, Coding',
    preferences: '🧹 Clean daily, 🤫 Quiet evenings, 🌅 Early bird',
    dealbreakers: '🚬 Smoking indoors, 🐈 Pets, 🗑️ Messy areas',
    latOffset: 0.015,
    lngOffset: -0.010,
  },
  {
    id: 'mock-2',
    name: 'Sofia',
    age: 22,
    bio: "Student by day, surfer by weekend. I love making meals together and having a dynamic, social household.",
    photoUrl: 'https://i.pravatar.cc/300?img=5',
    likes: 'Movies, Hiking, Surfing, 🍳 Cooking',
    preferences: '🗑️ Clean weekly, 🦉 Night owl, 🎉 Guests allowed',
    dealbreakers: 'Strict rules, 🤫 Quiet evenings',
    latOffset: 0.005,
    lngOffset: 0.005,
  },
  {
    id: 'mock-3',
    name: 'David',
    age: 27,
    bio: "Marketing professional working mostly from home. Need a designated workspace and a neat common area. Big coffee enthusiast.",
    photoUrl: 'https://i.pravatar.cc/300?img=8',
    likes: '📚 Reading, 🎵 Music, Coffee',
    preferences: '🗑️ Clean weekly, 🤫 Quiet evenings, Working from home',
    dealbreakers: '🔊 Loud music, 🥳 Late parties, 🚬 Smoking indoors',
    latOffset: 0.05,
    lngOffset: 0.05,
  },
  {
    id: 'mock-4',
    name: 'Valeria',
    age: 25,
    bio: "Culinary student looking for a shared apartment. I will cook for you! Just please do the dishes.",
    photoUrl: 'https://i.pravatar.cc/300?img=9',
    likes: '🍳 Cooking, 🎮 Video Games, Board Games',
    preferences: '🧹 Clean daily, 🎉 Guests allowed',
    dealbreakers: 'Leaving dishes out, 🗑️ Messy areas',
    latOffset: 0.1,
    lngOffset: -0.05,
  }
];

export const mockCurrentUserConfig = {
  profile: null as any,
};
