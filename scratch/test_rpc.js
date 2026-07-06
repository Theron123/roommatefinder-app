require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('mark_messages_read', { sender_id_param: 'some-id' });
  console.log("RPC error:", error);
}
run();
