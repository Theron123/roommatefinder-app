import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Database } from './database.types';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jwzcvozwygsfkouclhrz.supabase.co') as string;
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3emN2b3p3eWdzZmtvdWNsaHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NDEsImV4cCI6MjA4Mjk4MTg0MX0.orkIs_LSdKNNmUxvNq4GbRsJsxRbYSjcqYpcc2kX0Pg') as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? typeof window !== 'undefined' ? window.localStorage : undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
