import { create } from 'zustand'
import { checkIsAdmin, getSession, onAuthChange, sendWelcomeEmail } from '@/data/auth'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isAdmin: boolean
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
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
}))

/** Call once at app start (main.tsx) before rendering routes. */
export async function initAuth() {
  const session = await getSession()
  await applySession(session)
  useAuthStore.setState({ initialized: true })

  onAuthChange((next) => {
    void applySession(next)
  })
}

async function applySession(session: Session | null) {
  const user = session?.user ?? null
  const isAdmin = user ? await checkIsAdmin(user.id) : false
  useAuthStore.setState({ session, user, isAdmin })

  // First confirmed session for this account → fire the one-time welcome email.
  // The client-side flag skips the network call for already-welcomed users; the
  // Edge Function is the real idempotency guard for the token-refresh race.
  if (user?.email_confirmed_at && !user.app_metadata?.welcomed) {
    void sendWelcomeEmail().catch((err) => {
      console.error('[welcome-email] skipped:', err)
    })
  }
}
