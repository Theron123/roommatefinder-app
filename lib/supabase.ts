import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://TU_PROYECTO_ID.supabase.co';
const supabaseAnonKey = 'TU_PUBLIC_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

