import { supabase } from '@/lib/supabaseClient'
import { siteUrl } from '@/lib/siteUrl'
import type { Session, User } from '@supabase/supabase-js'

/**
 * Auth repository — thin wrapper over Supabase Auth. Password reset uses
 * Supabase's built-in email + token flow (spec §5); we never build custom
 * forgot-password logic.
 *
 * Every emailed link is built with `siteUrl()` so it points at the canonical
 * domain. Supabase ignores a redirect that isn't on the project's allow-list
 * and quietly substitutes the Site URL, which is how these end up on
 * localhost — see lib/siteUrl.ts.
 */
export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      // Where the "confirm your email" link lands once clicked — the landing
      // page, which establishes the session and fires the welcome email.
      emailRedirectTo: siteUrl('/'),
    },
  })
  if (error) throw new Error(error.message)
  return data
}

/** Re-send the signup confirmation email (used by the "resend link" button). */
export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: siteUrl('/') },
  })
  if (error) throw new Error(error.message)
}

/**
 * Ask the backend to send the one-time welcome email. Safe to call more than
 * once — the Edge Function is idempotent (guarded by an app_metadata flag).
 */
export async function sendWelcomeEmail() {
  const { error } = await supabase.functions.invoke('send-welcome-email')
  if (error) throw new Error(error.message)
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/** Kick off Supabase's native password-reset email. */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl('/account/reset'),
  })
  if (error) throw new Error(error.message)
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Subscribe to auth state changes. Returns the unsubscribe handle. */
export function onAuthChange(cb: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => cb(session))
}

/**
 * Is this user an admin? Checks admin_profiles (RLS: self-readable by admins).
 *
 * Resolves false rather than throwing: this runs on every session change, and a
 * transient network error must degrade to "not an admin" instead of wedging
 * app startup. RLS is the real boundary either way — a false positive here
 * would still be refused by the database.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('[checkIsAdmin]', error.message)
      return false
    }
    return !!data
  } catch (err) {
    console.error('[checkIsAdmin]', err)
    return false
  }
}

export type { Session, User }
