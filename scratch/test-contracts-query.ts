import { supabase } from '../lib/supabase';

async function testContractsQuery() {
  console.log('Testing contracts query...');
  const { data, error } = await supabase
    .from('contracts')
    .select('*, initiator:initiator_id(name), contract_participants(user_id, profiles(name)), listings:listing_id(*, owner:profiles(name))')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Query failed:', error);
  } else {
    console.log('Query succeeded! Found', data.length, 'contracts.');
    console.log('Contracts:', JSON.stringify(data, null, 2));
  }
}

testContractsQuery();
