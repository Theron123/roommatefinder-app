import { createClient } from '@supabase/supabase-js';

const url = 'https://jwzcvozwygsfkouclhrz.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3emN2b3p3eWdzZmtvdWNsaHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NDEsImV4cCI6MjA4Mjk4MTg0MX0.orkIs_LSdKNNmUxvNq4GbRsJsxRbYSjcqYpcc2kX0Pg';

const supabase = createClient(url, key);

const mockProfiles = [
  { name: 'Alejandro', age: 24, bio: "Tech enthusiast and weekend hiker.", photoUrl: 'https://i.pravatar.cc/300?img=12', likes: '🎮 Video Games, ✈️ Traveling', preferences: '🧹 Clean daily, 🦉 Night owl', dealbreakers: '🚬 Smoking indoors', latOffset: 0.011, lngOffset: -0.012 },
  { name: 'Valentina', age: 23, bio: "Art student looking for a creative space.", photoUrl: 'https://i.pravatar.cc/300?img=16', likes: '🎨 Art, 📸 Photography', preferences: '🎉 Guests allowed, 🌅 Early bird', dealbreakers: '🔊 Loud music', latOffset: -0.015, lngOffset: 0.010 },
  { name: 'Mateo', age: 26, bio: "Gym rat and meal prep master.", photoUrl: 'https://i.pravatar.cc/300?img=33', likes: '🏋️ Fitness, 🍳 Cooking', preferences: '🗑️ Clean weekly, 🤫 Quiet evenings', dealbreakers: '🗑️ Messy areas', latOffset: 0.020, lngOffset: 0.025 },
  { name: 'Camila', age: 21, bio: "Dog mom! Very social and love hosting.", photoUrl: 'https://i.pravatar.cc/300?img=47', likes: '🐶 Pets, 🎵 Music', preferences: '🎉 Guests allowed, 🍷 Social drinker', dealbreakers: 'No pets allowed', latOffset: -0.022, lngOffset: -0.005 },
  { name: 'Lucas', age: 28, bio: "Remote worker, quiet and respectful.", photoUrl: 'https://i.pravatar.cc/300?img=53', likes: '📚 Reading, ✈️ Traveling', preferences: '🤫 Quiet evenings, 🌅 Early bird', dealbreakers: '🥳 Late parties', latOffset: 0.008, lngOffset: 0.018 },
  { name: 'Isabella', age: 25, bio: "Musician, love jamming on weekends.", photoUrl: 'https://i.pravatar.cc/300?img=43', likes: '🎵 Music, 🎨 Art', preferences: '🦉 Night owl, 🎉 Guests allowed', dealbreakers: '🤫 Quiet evenings', latOffset: 0.030, lngOffset: -0.020 },
  { name: 'Thiago', age: 22, bio: "Huge football fan. Chill vibes.", photoUrl: 'https://i.pravatar.cc/300?img=15', likes: '⚽ Sports, 🎮 Video Games', preferences: '🍷 Social drinker, 🗑️ Clean weekly', dealbreakers: '💸 Unpaid bills', latOffset: -0.010, lngOffset: -0.030 },
  { name: 'Martina', age: 27, bio: "Photographer seeking neat roommate.", photoUrl: 'https://i.pravatar.cc/300?img=32', likes: '📸 Photography, ✈️ Traveling', preferences: '🧹 Clean daily, 🤫 Quiet evenings', dealbreakers: '🗑️ Messy areas', latOffset: 0.012, lngOffset: 0.015 },
  { name: 'Benjamin', age: 24, bio: "Gamer and foodie.", photoUrl: 'https://i.pravatar.cc/300?img=59', likes: '🎮 Video Games, 🍳 Cooking', preferences: '🦉 Night owl, 🗑️ Clean weekly', dealbreakers: '🔊 Loud music', latOffset: -0.005, lngOffset: 0.022 },
  { name: 'Emma', age: 26, bio: "Yoga instructor, early riser.", photoUrl: 'https://i.pravatar.cc/300?img=35', likes: '🏋️ Fitness, 📚 Reading', preferences: '🌅 Early bird, 🧹 Clean daily', dealbreakers: '🚬 Smoking indoors', latOffset: 0.018, lngOffset: -0.008 },
  { name: 'Santiago', age: 23, bio: "Med student, study a lot.", photoUrl: 'https://i.pravatar.cc/300?img=11', likes: '📚 Reading, 🎵 Music', preferences: '🤫 Quiet evenings, 🧹 Clean daily', dealbreakers: '🥳 Late parties', latOffset: -0.018, lngOffset: -0.018 },
  { name: 'Lucia', age: 29, bio: "Graphic designer, work from home.", photoUrl: 'https://i.pravatar.cc/300?img=44', likes: '🎨 Art, 📸 Photography', preferences: '🗑️ Clean weekly, 🦉 Night owl', dealbreakers: '🔊 Loud music', latOffset: 0.025, lngOffset: 0.005 },
  { name: 'Joaquin', age: 21, bio: "College student, love sports.", photoUrl: 'https://i.pravatar.cc/300?img=60', likes: '⚽ Sports, ✈️ Traveling', preferences: '🎉 Guests allowed, 🍷 Social drinker', dealbreakers: '🧹 Clean daily', latOffset: -0.025, lngOffset: 0.025 },
  { name: 'Victoria', age: 24, bio: "Software dev. Dog lover.", photoUrl: 'https://i.pravatar.cc/300?img=26', likes: '🐶 Pets, 🎮 Video Games', preferences: '🤫 Quiet evenings, 🌅 Early bird', dealbreakers: '🚬 Smoking indoors', latOffset: 0.005, lngOffset: -0.025 },
  { name: 'Diego', age: 25, bio: "Easy-going guy, love a good BBQ.", photoUrl: 'https://i.pravatar.cc/300?img=65', likes: '🍳 Cooking, ⚽ Sports', preferences: '🎉 Guests allowed, 🗑️ Clean weekly', dealbreakers: '💸 Unpaid bills', latOffset: -0.002, lngOffset: 0.002 },
];

async function seed() {
  console.log('Seeding 15 new profiles...');
  for (const p of mockProfiles) {
    const email = `mock_${p.name.toLowerCase()}@example.com`;
    console.log(`Signing up ${email}...`);
    
    // Attempt sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: 'Password123!'
    });

    let user = null;
    if (authError) {
      console.log(`${email} might exist, trying to login...`);
      const { data: loginData } = await supabase.auth.signInWithPassword({ email, password: 'Password123!' });
      if (loginData?.user) user = loginData.user;
    } else if (authData?.user) {
      user = authData.user;
    }

    if (user) {
      console.log(`Creating profile for ${p.name}...`);
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        name: p.name,
        age: p.age,
        bio: p.bio,
        photoUrl: p.photoUrl,
        likes: p.likes,
        preferences: p.preferences,
        dealbreakers: p.dealbreakers,
        latOffset: p.latOffset,
        lngOffset: p.lngOffset
      });

      if (profileError) {
        console.error(`Error inserting profile for ${p.name}:`, profileError.message);
      } else {
        console.log(`Profile ${p.name} created successfully!`);
      }
    }
  }
  console.log('Done seeding new users!');
}

seed();
