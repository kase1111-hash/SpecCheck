/**
 * Supabase Client
 *
 * Database client initialization.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 */
export function getSupabase(url: string, key: string): SupabaseClient {
  if (!supabase) {
    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * Database table names
 */
export const tables = {
  datasheets: 'datasheets',
  submissions: 'submissions',
  users: 'users',
  votes: 'votes',
} as const;
