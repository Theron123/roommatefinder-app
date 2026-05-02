import { createClient } from '@supabase/supabase-js';

const url = 'https://jwzcvozwygsfkouclhrz.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3emN2b3p3eWdzZmtvdWNsaHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NDEsImV4cCI6MjA4Mjk4MTg0MX0.orkIs_LSdKNNmUxvNq4GbRsJsxRbYSjcqYpcc2kX0Pg';

const supabase = createClient(url, key);

const mockProfiles = [
  {
    name: 'Carlos', age: 24, bio: "Hey! I'm a software engineer who loves a calm environment. Seeking someone who respects quiet hours but is down for occasional gaming sessions.", photoUrl: 'https://i.pravatar.cc/300?img=11', likes: '🎮 Video Games, 📚 Reading, 🎵 Music, Coding', preferences: '🧹 Clean daily, 🤫 Quiet evenings, 🌅 Early bird', dealbreakers: '🚬 Smoking indoors, 🐈 Pets, 🗑️ Messy areas', latOffset: 0.015, lngOffset: -0.010
  },
  {
    name: 'Sofia', age: 22, bio: "Student by day, surfer by weekend. I love making meals together and having a dynamic, social household.", photoUrl: 'https://i.pravatar.cc/300?img=5', likes: 'Movies, Hiking, Surfing, 🍳 Cooking', preferences: '🗑️ Clean weekly, 🦉 Night owl, 🎉 Guests allowed', dealbreakers: 'Strict rules, 🤫 Quiet evenings', latOffset: 0.005, lngOffset: 0.005
  },
  {
    name: 'David', age: 27, bio: "Marketing professional working mostly from home. Need a designated workspace and a neat common area. Big coffee enthusiast.", photoUrl: 'https://i.pravatar.cc/300?img=8', likes: '📚 Reading, 🎵 Music, Coffee', preferences: '🗑️ Clean weekly, 🤫 Quiet evenings, Working from home', dealbreakers: '🔊 Loud music, 🥳 Late parties, 🚬 Smoking indoors', latOffset: 0.05, lngOffset: 0.05
  },
  {
    name: 'Valeria', age: 25, bio: "Culinary student looking for a shared apartment. I will cook for you! Just please do the dishes.", photoUrl: 'https://i.pravatar.cc/300?img=9', likes: '🍳 Cooking, 🎮 Video Games, Board Games', preferences: '🧹 Clean daily, 🎉 Guests allowed', dealbreakers: 'Leaving dishes out, 🗑️ Messy areas', latOffset: 0.1, lngOffset: -0.05
  }
];

async function seed() {
  for (const p of mockProfiles) {
    const email = `${p.name.toLowerCase()}@example.com`;
    console.log(`Signing up ${email}...`);
    let user = null;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: 'Password123!',
    });
    
    if (authError) {
      console.error(`Error signing up ${email}:`, authError.message);
      console.log(`Attempting login for ${email}...`);
      const { data: loginData } = await supabase.auth.signInWithPassword({ email, password: 'Password123!' });
      if (loginData?.user) {
        user = loginData.user;
      }
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
    
    await supabase.auth.signOut();
  }
}

seed();
