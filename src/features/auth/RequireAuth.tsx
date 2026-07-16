import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './authStore'
import { LoadingBlock } from '@/components/ui'

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

/** Guard for the admin tree — requires an authenticated admin. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized)
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  if (!initialized) return <LoadingBlock label="Checking access…" />
  if (!user || !isAdmin) return <Navigate to="/login" replace />
  return <>{children}</>
}
