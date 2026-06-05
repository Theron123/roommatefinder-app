require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Curated Cohesive Sets (5 high-quality related photos per set)
const THEMED_SETS = {
  artistic_female: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80", // Portrait
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80", // Art/Paint supplies
    "https://images.unsplash.com/photo-1501183007986-d0d080b147f9?w=600&auto=format&fit=crop&q=80", // Cozy home/aesthetic room
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80", // Sketching in museum
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&auto=format&fit=crop&q=80"  // Art gallery/exhibit
  ],
  tech_outdoors_male: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80", // Portrait
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80", // Clean developer workspace
    "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=600&auto=format&fit=crop&q=80", // Scenic hiking trail
    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80", // Gadgets/coding at desk
    "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&auto=format&fit=crop&q=80"  // Relaxed in coffee shop with laptop
  ],
  social_active_female: [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80", // Portrait
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80", // Beach/surf sunset
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&auto=format&fit=crop&q=80", // Cozy dining with friends
    "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80", // Sunlight room with green houseplants
    "https://images.unsplash.com/photo-1485199645743-c6ec49d5001e?w=600&auto=format&fit=crop&q=80"  // Laughing outdoors/cafe
  ],
  coffee_active_male: [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80", // Portrait
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80", // Coffee brewing detail
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&auto=format&fit=crop&q=80", // Modern living room/apartment
    "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80", // Cycling/riding outdoors
    "https://images.unsplash.com/photo-1469033090071-3a3d07e77885?w=600&auto=format&fit=crop&q=80"  // Reading/chill evening view
  ],
  culinary_cozy_female: [
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80", // Portrait
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&auto=format&fit=crop&q=80", // Cooking in modern kitchen
    "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=600&auto=format&fit=crop&q=80", // Baking pastry detail
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&auto=format&fit=crop&q=80", // Cozy morning bed view
    "https://images.unsplash.com/photo-1517433456452-f9633a875f6f?w=600&auto=format&fit=crop&q=80"  // Relaxed reading with hot tea
  ]
};

const MALE_NAMES = ["carlos", "david", "alejandro", "mateo", "lucas", "thiago", "benjamin", "santiago", "joaquin", "diego", "sebastian", "juanjo", "ignacio", "juan"];
const FEMALE_NAMES = ["sofia", "valeria", "valentina", "camila", "isabella", "martina", "emma", "lucia", "victoria", "rachel", "dorsa"];

function getThemeForUser(name, index) {
  const normName = name.toLowerCase();
  const isFemale = FEMALE_NAMES.some(f => normName.includes(f));
  
  if (isFemale) {
    if (index % 3 === 0) return THEMED_SETS.artistic_female;
    if (index % 3 === 1) return THEMED_SETS.social_active_female;
    return THEMED_SETS.culinary_cozy_female;
  } else {
    if (index % 2 === 0) return THEMED_SETS.tech_outdoors_male;
    return THEMED_SETS.coffee_active_male;
  }
}

async function run() {
  const { data: profiles, error: err } = await supabase
    .from('profiles')
    .select('id, name');

  if (err) {
    console.error("Error fetching profiles:", err);
    return;
  }

  console.log(`Fetched ${profiles.length} profiles to generate SQL for...`);

  let sqlStatements = [];
  
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const name = profile.name || "User";
    const photos = getThemeForUser(name, i);

    // Escape single quotes for SQL safety
    const escapedName = name.replace(/'/g, "''");
    const escapedPhotoUrl = photos[0].replace(/'/g, "''");
    const escapedPhotosArray = photos.map(url => `'${url.replace(/'/g, "''")}'`).join(', ');

    const sql = `UPDATE profiles SET "photoUrl" = '${escapedPhotoUrl}', photos = ARRAY[${escapedPhotosArray}]::text[] WHERE id = '${profile.id}';`;
    sqlStatements.push(sql);
  }

  fs.writeFileSync('seed_profiles.sql', sqlStatements.join('\n'));
  console.log("Successfully wrote seed_profiles.sql");
}

run();
