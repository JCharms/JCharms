// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Service-role Supabase client for Edge Functions. Bypasses RLS, so it is ONLY
 * ever created server-side inside a function — the service-role key must never
 * reach the browser (spec §4).
 */
export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Resolve the calling user from the request's Authorization header and confirm
 * they are an admin (present in admin_profiles). Used to gate admin-only
 * functions against direct invocation with the public anon key.
 */
export async function requireAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return false
  const admin = createAdminClient()
  const { data } = await admin
    .from('admin_profiles')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  return !!data
}

export type AdminClient = ReturnType<typeof createAdminClient>
