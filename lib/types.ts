import { Database } from './database.types';

export type DbProfile = Database['public']['Tables']['profiles']['Row'];
export type DbListing = Database['public']['Tables']['listings']['Row'];
export type DbContract = Database['public']['Tables']['contracts']['Row'];
export type DbMessage = Database['public']['Tables']['messages']['Row'];
export type DbSwipe = Database['public']['Tables']['swipes']['Row'];
export type DbMatch = Database['public']['Tables']['matches']['Row'];
export type DbVerification = Database['public']['Tables']['verifications']['Row'];

// Mantenemos Profile como alias de DbProfile para que la aplicación use los tipos reales de la BD
export type Profile = DbProfile;
