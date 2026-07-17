import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, PackageSearch, ScrollText, User, X } from 'lucide-react'
import { useCategories } from '@/features/products/hooks'
import { CategoryNav } from '@/features/products/components/CategoryNav'
import { useAuthStore } from '@/features/auth/authStore'
import { useUIStore } from '@/store/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'
import { cn } from '@/lib/cn'

/**
 * Slide-over category browser.
 *
 * The header can't list an unbounded number of categories, so it holds one
 * "Categories" button and the full tree lives here. It doubles as the mobile
 * nav — the header links are desktop-only, so without this a phone user has no
 * way to reach anything but the logo and the bag.
 */
export function CategoryPanel() {
  const open = useUIStore((s) => s.categoryMenuOpen)
  const setOpen = useUIStore((s) => s.setCategoryMenuOpen)
  const { data: categories } = useCategories()
  const location = useLocation()
  const isAdmin = useAuthStore((s) => s.isAdmin)

  // Read the slug off the path rather than useParams(): this panel lives in the
  // layout route, which only sees params matched at its own level — the child
  // route's :categorySlug never reaches it.
  const activeSlug = /^\/shop\/([^/]+)/.exec(location.pathname)?.[1]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  // Route changes close the panel — otherwise it hangs around over the page the
  // user just asked for (e.g. via browser Back).
  useEffect(() => setOpen(false), [location.pathname, setOpen])

  const close = () => setOpen(false)

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 transition',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-indigo-900/40 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={close}
      />
      <aside
        className={cn(
          'absolute left-0 top-0 flex h-full w-full max-w-xs flex-col bg-ivory shadow-lift transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Browse categories"
      >
        <header className="flex items-center justify-between border-b border-ivory-300 px-5 py-4">
          <div>
            <h2 className="font-display text-xl text-indigo">Browse</h2>
            <RunningStitch className="mt-1.5 max-w-[70px] text-pink" />
          </div>
          <button
            onClick={close}
            aria-label="Close menu"
            className="rounded-full p-1.5 text-ink-muted hover:bg-ivory-300"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <CategoryNav
            categories={categories ?? []}
            activeSlug={activeSlug}
            onNavigate={close}
            searchable
          />
        </div>

        {/* Everything the desktop header shows, for phones. */}
        <footer className="space-y-0.5 border-t border-ivory-300 px-3 py-3 md:hidden">
          <PanelLink to="/track" icon={PackageSearch} label="Track your order" onClick={close} />
          <PanelLink to="/policies" icon={ScrollText} label="Shipping & returns" onClick={close} />
          <PanelLink to="/account" icon={User} label="My account" onClick={close} />
          {isAdmin && (
            <PanelLink to="/admin" icon={LayoutDashboard} label="Admin panel" onClick={close} />
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  )
}

function PanelLink({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string
  icon: typeof User
  label: string
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-muted transition hover:bg-ivory-200 hover:text-indigo"
    >
      <Icon size={16} /> {label}
    </Link>
  )
}
