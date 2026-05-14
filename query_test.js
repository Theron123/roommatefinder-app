const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('profiles').select('*, listings(id)').limit(2);
  console.log("With listings:", { data, error });
  
  if (error) {
    const { data: d2, error: e2 } = await supabase.from('profiles').select('*').limit(2);
    console.log("Without listings:", { data: d2, error: e2 });
  }
}
test();
