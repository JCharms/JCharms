import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import {
  ChevronDown,
  LayoutDashboard,
  Menu,
  ShoppingBag,
  Sparkles,
  User,
} from 'lucide-react'
// lucide deprecated its brand icons (removed in v1.0) and points at Simple
// Icons; react-icons ships those and is already a dependency.
import { SiInstagram } from 'react-icons/si'
import { useCart } from '@/features/cart/useCart'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useAuthStore } from '@/features/auth/authStore'
import { CartDrawer } from '@/features/cart/CartDrawer'
import { CategoryPanel } from './CategoryPanel'
import { Toaster } from '@/components/ui'
import { instagramProfileUrl } from '@/lib/links'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/cn'

export function StorefrontLayout() {
  const { count, openCart } = useCart()
  const { data: config } = useSiteConfig()
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const openCategories = useUIStore((s) => s.setCategoryMenuOpen)

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      {/* Announcement banner (admin-editable). */}
      {config?.announcement.enabled && config.announcement.text && (
        <div className="bg-indigo px-4 py-2 text-center text-xs font-medium text-ivory sm:text-sm">
          {config.announcement.text}
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-ivory-300/60 bg-ivory/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Phones have no room for the nav below — this is their way in. */}
            <button
              onClick={() => openCategories(true)}
              aria-label="Open menu"
              className="rounded-full p-2 text-indigo transition hover:bg-ivory-300 md:hidden"
            >
              <Menu size={22} />
            </button>
            <Link
              to="/"
              className="stitch-underline font-display text-2xl font-semibold text-indigo"
            >
              J Charms
            </Link>
          </div>

          {/* One "Categories" control instead of one link per category: the
              catalogue is expected to grow well past what a bar can hold. */}
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
            <button
              onClick={() => openCategories(true)}
              className="stitch-underline inline-flex items-center gap-1 transition hover:text-indigo"
            >
              Categories <ChevronDown size={15} aria-hidden />
            </button>
            <NavLinkItem to="/shop" label="Shop all" />
            <NavLinkItem to="/track" label="Track order" />
            <NavLinkItem to="/policies" label="Shipping & returns" />
          </nav>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden rounded-full p-2 text-indigo transition hover:bg-ivory-300 sm:inline-flex"
                aria-label="Admin panel"
                title="Admin panel"
              >
                <LayoutDashboard size={20} />
              </Link>
            )}
            <Link
              to="/account"
              className="hidden rounded-full p-2 text-ink-muted transition hover:bg-ivory-300 hover:text-indigo sm:inline-flex"
              aria-label="My account"
            >
              <User size={20} />
            </Link>
            <button
              onClick={openCart}
              className="relative rounded-full p-2 text-indigo transition hover:bg-ivory-300"
              aria-label={`Open bag${count ? `, ${count} items` : ''}`}
            >
              <ShoppingBag size={22} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pink px-1 font-mono text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-24 border-t border-ivory-300/60 bg-indigo text-ivory">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl">J Charms</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ivory-200">
              <Sparkles size={14} /> Handmade with love, in India.
            </p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-ivory-200">Explore</p>
            <ul className="space-y-1.5 text-ivory-100/80">
              <li><Link to="/shop" className="hover:text-pink-200">Shop all</Link></li>
              <li><Link to="/track" className="hover:text-pink-200">Track your order</Link></li>
              <li><Link to="/policies" className="hover:text-pink-200">Shipping &amp; returns</Link></li>
              <li><Link to="/account" className="hover:text-pink-200">My account</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-ivory-200">Say hello</p>
            <a
              href={instagramProfileUrl(config?.instagramHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-ivory-100/80 hover:text-pink-200"
            >
              <SiInstagram size={15} aria-hidden /> @{config?.instagramHandle ?? 'j_.charms'}
            </a>
            {config?.supportEmail && (
              <a
                href={`mailto:${config.supportEmail}`}
                className="mt-2 block text-ivory-100/80 hover:text-pink-200"
              >
                {config.supportEmail}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-indigo-400/30 px-4 py-4 text-center text-xs text-ivory-200/70">
          © {new Date().getFullYear()} J Charms · Individual seller · Made to order
        </div>
      </footer>

      <CategoryPanel />
      <CartDrawer />
      <Toaster />

      {/* New pages open at the top; Back/Forward restores where you were. */}
      <ScrollRestoration />
    </div>
  )
}

function NavLinkItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('stitch-underline transition hover:text-indigo', isActive && 'text-indigo')
      }
    >
      {label}
    </NavLink>
  )
}
