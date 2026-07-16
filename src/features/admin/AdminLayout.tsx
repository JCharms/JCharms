import { NavLink, Outlet, Link, useNavigate, ScrollRestoration } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package2,
  Star,
  Settings,
  ExternalLink,
  LogOut,
} from 'lucide-react'
import { signOut } from '@/data/auth'
import { useAuthStore } from '@/features/auth/authStore'
import { Toaster } from '@/components/ui'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, end: false },
  { to: '/admin/catalogue', label: 'Catalogue', icon: Package2, end: false },
  { to: '/admin/reviews', label: 'Reviews', icon: Star, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-ivory-200">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ivory-300 bg-white p-4 md:flex">
        <Link to="/admin" className="mb-8 px-2 font-display text-2xl text-indigo">
          J Charms
          <span className="block text-xs font-sans font-normal text-ink-faint">admin</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-pink-50 text-pink-600'
                    : 'text-ink-muted hover:bg-ivory-200 hover:text-indigo',
                )
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 space-y-1 border-t border-ivory-300 pt-4">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-muted hover:bg-ivory-200"
          >
            <ExternalLink size={16} /> View store
          </a>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-muted hover:bg-ivory-200"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ivory-300 bg-white px-4 py-3 md:hidden">
          <Link to="/admin" className="font-display text-xl text-indigo">
            J Charms admin
          </Link>
          <button onClick={handleSignOut} aria-label="Sign out" className="text-ink-muted">
            <LogOut size={18} />
          </button>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-ivory-300 bg-white px-2 py-2 md:hidden">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
                  isActive ? 'bg-pink-50 text-pink-600' : 'text-ink-muted',
                )
              }
            >
              <Icon size={14} /> {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <p className="mb-4 text-xs text-ink-faint md:hidden">Signed in as {user?.email}</p>
          <Outlet />
        </main>
      </div>

      <Toaster />
      <ScrollRestoration />
    </div>
  )
}
