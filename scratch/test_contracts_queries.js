require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log("--- Test: user_reports query ---");
  const myId = 'cda32f70-b4b6-41fb-aadc-92d89046fc33'; // Sebastian's id
  const { data, error } = await supabase
    .from('user_reports')
    .select('*, reporter:reporter_id(name), reported:reported_id(name)')
    .or(`reporter_id.eq.${myId},reported_id.eq.${myId}`);
  console.log("Success:", !!data, "Error:", error);
}
run();
