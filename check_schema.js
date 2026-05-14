const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('listings').select('*').limit(1);
  console.log("Listings:", data);
  
  // Since there is no data, let's fetch column names from information_schema if possible, or just insert a dummy and rollback? Wait, Supabase js doesn't have an easy schema fetch without admin.
  // Actually, I can just use a raw query or try to insert a failing row to get errors, but let me check if there's a typescript type file for database.
}
test();
