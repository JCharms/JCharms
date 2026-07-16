import { Link, NavLink, Outlet } from 'react-router-dom'
import { ShoppingBag, Instagram, Sparkles, User } from 'lucide-react'
import { useCart } from '@/features/cart/useCart'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useCategoryTree } from '@/features/products/hooks'
import { CartDrawer } from '@/features/cart/CartDrawer'
import { Toaster } from '@/components/ui'
import { instagramProfileUrl } from '@/lib/links'
import { cn } from '@/lib/cn'

export function StorefrontLayout() {
  const { count, openCart } = useCart()
  const { data: config } = useSiteConfig()
  const { data: categories } = useCategoryTree()

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
          <Link
            to="/"
            className="stitch-underline font-display text-2xl font-semibold text-indigo"
          >
            J Charms
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
            <NavLinkItem to="/shop" label="Shop all" />
            {categories?.slice(0, 3).map((cat) => (
              <NavLinkItem key={cat.id} to={`/shop/${cat.slug}`} label={cat.name} />
            ))}
            <NavLinkItem to="/track" label="Track order" />
          </nav>

          <div className="flex items-center gap-1">
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
              <Instagram size={16} /> @{config?.instagramHandle ?? 'j_.charms'}
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

      <CartDrawer />
      <Toaster />
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
