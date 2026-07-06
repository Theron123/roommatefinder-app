import { supabase } from '../lib/supabase';

async function testQuery() {
  console.log('Testing query...');
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, address, price, user_id, images')
      .in('status', ['active', 'available']);

    if (error) {
      console.error('Query failed:', error);
    } else {
      console.log('Query succeeded! Found', data.length, 'listings.');
      if (data.length > 0) {
        console.log('First listing:', data[0]);
      }
    }

    console.log('Testing joined query with profiles...');
    const { data: dataJoin, error: errorJoin } = await supabase
      .from('listings')
      .select('id, title, address, price, user_id, images, profiles:user_id(name)')
      .in('status', ['active', 'available']);

    if (errorJoin) {
      console.error('Joined query failed:', errorJoin);
    } else {
      console.log('Joined query succeeded! Found', dataJoin.length, 'listings.');
      if (dataJoin.length > 0) {
        console.log('First joined listing:', dataJoin[0]);
      }
    }
  } catch (e) {
    console.error('Exception in testQuery:', e);
  }
}

testQuery();
