require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const images = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1e5240980c?w=800&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80"
];

async function seed() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, name').limit(5);
  if (pErr) {
    console.error("Error fetching profiles:", pErr);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log("No profiles found to assign apartments to.");
    return;
  }

  const listings = profiles.map((p, i) => ({
    user_id: p.id,
    title: `Beautiful Apartment hosted by ${p.name || 'User'}`,
    description: `A lovely place to stay with great natural light and modern amenities. Looking for a neat and respectful roommate!`,
    price: 500 + (i * 150),
    address: `Downtown District ${i + 1}`,
    images: [images[i % images.length], images[(i + 1) % images.length]],
    utilities_included: i % 2 === 0,
    status: 'available'
  }));

  const { data, error } = await supabase.from('listings').upsert(listings, { onConflict: 'user_id' });
  if (error) {
    console.error("Error inserting listings:", error);
  } else {
    console.log(`Successfully seeded ${listings.length} apartments!`);
  }
}

seed();
