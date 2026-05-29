require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  // Let's get any unread message
  const { data: msgs } = await supabase.from('messages').select('*').limit(1);
  if (msgs && msgs.length > 0) {
    console.log("Trying to update message:", msgs[0].id);
    const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', msgs[0].id);
    console.log("Update error:", error);
  } else {
    console.log("No messages");
  }
}
run();
