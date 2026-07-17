import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useAuthStore } from './authStore'
import { Button, EmptyState, LoadingBlock } from '@/components/ui'

/**
 * Client-side guard. Waits for auth to hydrate, then redirects guests to login.
 * NOTE: this is UX only — real protection is RLS + admin_profiles at the data
 * layer (spec §5). Never rely on route guarding alone.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!initialized) return <LoadingBlock label="Just a moment…" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

/**
 * Guard for the admin tree — requires an authenticated admin.
 *
 * The three states are deliberately distinct. Collapsing them into one
 * redirect is what made admins bounce back to /login: an in-flight admin check
 * looks identical to "not an admin" unless you wait for `adminChecked`.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized)
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const adminChecked = useAuthStore((s) => s.adminChecked)
  const location = useLocation()

  // 1. Auth hasn't hydrated, or we're still asking whether they're an admin.
  if (!initialized || (user && !adminChecked)) {
    return <LoadingBlock label="Checking access…" />
  }

  // 2. Signed out → log in, then come back here.
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // 3. Signed in, but not on the allow-list. Say so plainly — silently
  //    redirecting a logged-in customer to /login is an infinite loop.
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <EmptyState
          icon={ShieldOff}
          title="This area is for the shop owner"
          description="Your account doesn't have admin access. If this looks wrong, double-check you're signed in with the right email."
          action={
            <Link to="/">
              <Button>Back to the shop</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return <>{children}</>
}
