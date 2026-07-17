import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search, X } from 'lucide-react'
import { rootAncestorOf } from '@/lib/categoryTree'
import { cn } from '@/lib/cn'
import type { Category } from '@/types/database'

/**
 * Collapsible category browser, shared by the header slide-over and the shop
 * sidebar so the two can never drift apart.
 *
 * Built to scale: the owner expects dozens of categories, so main categories
 * stay collapsed by default (the group holding the current page auto-opens) and
 * a filter box shortcuts straight to a name once the list gets long.
 */
export function CategoryNav({
  categories,
  activeSlug,
  onNavigate,
  searchable = false,
}: {
  /** Flat list of active categories. */
  categories: Category[]
  activeSlug?: string
  /** Called after any link is followed — lets the slide-over close itself. */
  onNavigate?: () => void
  searchable?: boolean
}) {
  const [query, setQuery] = useState('')

  const byOrder = (a: Category, b: Category) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name)

  const tops = useMemo(
    () => categories.filter((c) => !c.parent_id).sort(byOrder),
    [categories],
  )
  const childrenOf = useMemo(() => {
    const map = new Map<string, Category[]>()
    for (const cat of categories) {
      if (!cat.parent_id) continue
      const list = map.get(cat.parent_id)
      if (list) list.push(cat)
      else map.set(cat.parent_id, [cat])
    }
    for (const list of map.values()) list.sort(byOrder)
    return map
  }, [categories])

  // Whichever main category the current page sits under starts open.
  const activeTop = activeSlug ? rootAncestorOf(categories, activeSlug) : undefined
  const [manual, setManual] = useState<Record<string, boolean>>({})
  const isOpen = (id: string) => manual[id] ?? activeTop?.id === id
  const toggle = (id: string) => setManual((m) => ({ ...m, [id]: !isOpen(id) }))

  const trimmed = query.trim().toLowerCase()
  const matches = trimmed
    ? categories.filter((c) => c.name.toLowerCase().includes(trimmed)).sort(byOrder)
    : []

  return (
    <div className="space-y-3">
      {searchable && categories.length > 6 && (
        <div className="relative">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories…"
            aria-label="Search categories"
            className="w-full rounded-full border border-ivory-300 bg-white py-2 pl-9 pr-8 text-sm text-ink placeholder:text-ink-faint focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-faint hover:text-indigo"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {trimmed ? (
        // Flat results: with a filter active, hierarchy is noise — the name is
        // what they're hunting for. The parent is shown as context instead.
        <ul className="space-y-0.5">
          {matches.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-ink-faint">
              No category called “{query.trim()}”.
            </li>
          )}
          {matches.map((cat) => {
            const parent = cat.parent_id
              ? categories.find((c) => c.id === cat.parent_id)
              : undefined
            return (
              <li key={cat.id}>
                <Link
                  to={`/shop/${cat.slug}`}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition hover:bg-ivory-200',
                    activeSlug === cat.slug ? 'bg-pink-50 font-semibold text-pink-600' : 'text-ink',
                  )}
                >
                  {cat.name}
                  {parent && (
                    <span className="ml-1.5 text-xs text-ink-faint">in {parent.name}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="space-y-0.5">
          <li>
            <Link
              to="/shop"
              onClick={onNavigate}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-ivory-200',
                !activeSlug ? 'bg-pink-50 text-pink-600' : 'text-ink',
              )}
            >
              Shop all
            </Link>
          </li>

          {tops.map((top) => {
            const children = childrenOf.get(top.id) ?? []
            const open = isOpen(top.id)
            return (
              <li key={top.id}>
                <div
                  className={cn(
                    'flex items-center rounded-lg transition hover:bg-ivory-200',
                    activeTop?.id === top.id && 'bg-ivory-200/70',
                  )}
                >
                  <Link
                    to={`/shop/${top.slug}`}
                    onClick={onNavigate}
                    className={cn(
                      'flex-1 rounded-lg px-3 py-2 text-sm font-medium',
                      activeSlug === top.slug ? 'text-pink-600' : 'text-ink',
                    )}
                  >
                    {top.name}
                  </Link>
                  {/* Separate control: tapping the name should shop the whole
                      category, not merely expand it. */}
                  {children.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggle(top.id)}
                      aria-expanded={open}
                      aria-label={`${open ? 'Collapse' : 'Expand'} ${top.name}`}
                      className="mr-1 rounded-lg p-1.5 text-ink-faint hover:text-indigo"
                    >
                      <ChevronRight
                        size={15}
                        className={cn('transition-transform', open && 'rotate-90')}
                      />
                    </button>
                  )}
                </div>

                {children.length > 0 && open && (
                  <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-ivory-300 pl-2">
                    {children.map((child) => (
                      <li key={child.id}>
                        <Link
                          to={`/shop/${child.slug}`}
                          onClick={onNavigate}
                          className={cn(
                            'block rounded-lg px-3 py-1.5 text-sm transition hover:bg-ivory-200',
                            activeSlug === child.slug
                              ? 'bg-pink-50 font-semibold text-pink-600'
                              : 'text-ink-muted',
                          )}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
