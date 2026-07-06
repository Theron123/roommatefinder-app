require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('messages').select('is_read').limit(1);
  console.log('is_read:', error);
  const { data: d2, error: e2 } = await supabase.from('messages').select('read').limit(1);
  console.log('read:', e2);
  const { data: d3, error: e3 } = await supabase.from('messages').select('read_at').limit(1);
  console.log('read_at:', e3);
  const { data: d4, error: e4 } = await supabase.from('activity').select('*').limit(1);
  console.log('activity:', e4);
}
run();
