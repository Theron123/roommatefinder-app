require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: listings, error } = await supabase.from('listings').select('id, title, images, user_id');
  if (error) {
    console.error("Error fetching listings:", error);
    return;
  }
  console.log(`Found ${listings.length} listings in the database:`);
  listings.forEach((lst, i) => {
    console.log(`\nListing ${i+1}:`);
    console.log(`- ID: ${lst.id}`);
    console.log(`- Title: ${lst.title}`);
    console.log(`- User ID: ${lst.user_id}`);
    console.log(`- Images Array Size: ${lst.images ? lst.images.length : 'null'}`);
    console.log(`- Images:`, lst.images);
  });
}

inspect();
