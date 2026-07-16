import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from './env'

/**
 * The single browser Supabase client, typed against the generated schema.
 *
 * IMPORTANT: this client uses the *anon* key and is subject to RLS. It may
 * read public catalogue/review rows and manage the logged-in user's own auth
 * session — nothing more. All order reads/writes and any privileged operation
 * go through Edge Functions (see src/data/orders.ts), never this client.
 *
 * Components must not import this directly — go through the repository layer
 * in src/data/* so query logic stays in one place.
 */
export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
