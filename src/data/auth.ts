import { supabase } from '@/lib/supabaseClient'
import type { Session, User } from '@supabase/supabase-js'

/**
 * Auth repository — thin wrapper over Supabase Auth. Password reset uses
 * Supabase's built-in email + token flow (spec §5); we never build custom
 * forgot-password logic.
 */
export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      // Where the "confirm your email" link lands once clicked — the landing page.
      emailRedirectTo: `${window.location.origin}/`,
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
    options: { emailRedirectTo: `${window.location.origin}/` },
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
    redirectTo: `${window.location.origin}/account/reset`,
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

/** Is this user an admin? Checks admin_profiles (RLS: self-readable by admins). */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('admin_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export type { Session, User }
