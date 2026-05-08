import fs from 'fs';

const envStr = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function test() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const json = await res.json();
  console.log('JSON:', json);
}

test();
