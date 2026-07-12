// Sanity check: confirm an unauthenticated (anon) client cannot read/write
// data it shouldn't, on the tables touched by supabase/admin_rls_policies.sql.
// Uses only the public anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY) — no privileged
// credentials. Does NOT confirm the admin_* policies specifically ran (that
// needs an authenticated admin account or direct DB access), only that
// nothing is wide open to a fully anonymous caller.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function check(label, fn) {
  const { data, error } = await fn();
  console.log(`\n[${label}]`);
  console.log('  error:', error ? `${error.code} - ${error.message}` : null);
  console.log('  rows affected/returned:', Array.isArray(data) ? data.length : data);
}

async function firstId(table) {
  const { data, error } = await supabase.from(table).select('id').limit(1);
  if (error || !data?.length) return null;
  return data[0].id;
}

async function main() {
  await check('SELECT profiles (anon)', () =>
    supabase.from('profiles').select('id, role').limit(3)
  );
  await check("SELECT profiles WHERE role='admin' (anon)", () =>
    supabase.from('profiles').select('id, role').eq('role', 'admin').limit(3)
  );

  const tables = ['profiles', 'listings', 'contracts', 'verifications', 'user_reports'];
  const patch = {
    profiles: { bio: 'rls-test' },
    listings: { status: 'rls-test' },
    contracts: { status: 'rls-test' },
    verifications: { status: 'rls-test' },
    user_reports: { status: 'rls-test' },
  };

  for (const table of tables) {
    const id = await firstId(table);
    if (!id) {
      console.log(`\n[UPDATE ${table} (anon)] skipped — no readable row to target`);
      continue;
    }
    await check(`UPDATE ${table} id=${id} (anon, should be 0 rows)`, () =>
      supabase.from(table).update(patch[table]).eq('id', id).select()
    );
  }

  const listingId = await firstId('listings');
  if (listingId) {
    await check(`DELETE listings id=${listingId} (anon, should be 0 rows)`, () =>
      supabase.from('listings').delete().eq('id', listingId).select()
    );
  }
}

main();
