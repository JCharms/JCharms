import { create } from 'zustand'
import { checkIsAdmin, getSession, onAuthChange, sendWelcomeEmail } from '@/data/auth'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isAdmin: boolean
  /**
   * False while the admin lookup for the current user is still in flight.
   * Guards must wait for this rather than reading `isAdmin` early — an
   * unfinished check is "don't know yet", not "not an admin".
   */
  adminChecked: boolean
  initialized: boolean
  setSession: (session: Session | null) => void
}

/**
 * Global auth state, hydrated once from Supabase and kept in sync via
 * onAuthStateChange (wired in initAuth). Guest = user null; that's the default
 * path everywhere (spec §5).
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAdmin: false,
  adminChecked: false,
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
}))

/** Call once at app start (main.tsx) before rendering routes. */
export async function initAuth() {
  try {
    await applySession(await getSession())
  } catch (err) {
    // Never leave the app stuck on "Just a moment…" because auth hiccupped —
    // treat a failed hydrate as "signed out" and let the user retry.
    console.error('[initAuth] falling back to signed-out:', err)
  } finally {
    useAuthStore.setState({ initialized: true })
  }

  onAuthChange((next) => {
    void applySession(next)
  })
}

/**
 * Apply a freshly signed-in session and resolve the admin check before
 * returning, so the caller can route on a settled store.
 *
 * Sign-in would otherwise race: `onAuthStateChange` fires asynchronously, so a
 * redirect issued right after signIn() could reach RequireAdmin while the store
 * still says `user: null` — bouncing the admin straight back to /login.
 */
export async function applySignIn(session: Session | null): Promise<boolean> {
  await applySession(session)
  return useAuthStore.getState().isAdmin
}

async function applySession(session: Session | null) {
  const user = session?.user ?? null
  const prev = useAuthStore.getState()
  const sameUser = !!user && prev.user?.id === user.id

  // Publish the session *synchronously*. The admin lookup below is a second
  // network round-trip; waiting for it before exposing `user` is what made
  // route guards see a signed-out store immediately after sign-in.
  useAuthStore.setState({
    session,
    user,
    // A token refresh re-runs this for the same person — keep the answer we
    // already have instead of flashing back to "not an admin".
    isAdmin: sameUser ? prev.isAdmin : false,
    adminChecked: sameUser ? prev.adminChecked : !user,
  })

  if (!user) return

  const isAdmin = await checkIsAdmin(user.id)
  // A newer session may have landed while this was in flight — don't clobber it.
  if (useAuthStore.getState().user?.id !== user.id) return
  useAuthStore.setState({ isAdmin, adminChecked: true })

  // First confirmed session for this account → fire the one-time welcome email.
  // The client-side flag skips the network call for already-welcomed users; the
  // Edge Function is the real idempotency guard for the token-refresh race.
  if (user.email_confirmed_at && !user.app_metadata?.welcomed) {
    void sendWelcomeEmail().catch((err) => {
      console.error('[welcome-email] skipped:', err)
    })
  }
}
