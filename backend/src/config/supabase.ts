import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Public Supabase client using the anon key.
 * Suitable for operations that should respect Row Level Security.
 */
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Admin Supabase client using the service-role key.
 * Bypasses RLS - use only for trusted server-side operations.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
