import { useParams, Link } from 'react-router-dom'
import { useProducts, useCategory, useCategories } from '../hooks'
import { ProductGrid } from '../components/ProductGrid'
import { RunningStitch } from '@/components/ui/RunningStitch'
import { rootAncestorOf } from '@/lib/categoryTree'
import { cn } from '@/lib/cn'

/**
 * Shop-all (`/shop`) and per-category (`/shop/:categorySlug`) listing.
 *
 * Categories nest one or more levels, so the filter is two-tier: top-level
 * categories on the first row, and the selected one's subcategories on the
 * second. Choosing a parent shows everything beneath it (see listProducts).
 */
export function ShopPage() {
  const { categorySlug } = useParams()
  const { data: products, isLoading } = useProducts({ categorySlug })
  const { data: category } = useCategory(categorySlug ?? '')
  const { data: categories } = useCategories()

  const all = categories ?? []
  const tops = all
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

  // Keep the parent tab highlighted even when a child category is selected.
  const activeTop = categorySlug ? rootAncestorOf(all, categorySlug) : undefined
  const children = activeTop
    ? all
        .filter((c) => c.parent_id === activeTop.id)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    : []

  const isChildSelected = !!activeTop && activeTop.slug !== categorySlug
  const title = categorySlug ? (category?.name ?? 'Shop') : 'Everything handmade'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        {/* Breadcrumb makes it obvious where you are in the hierarchy. */}
        {isChildSelected && activeTop && (
          <p className="mb-1 text-sm text-ink-faint">
            <Link to="/shop" className="hover:text-indigo">Shop</Link>
            <span className="px-1.5">›</span>
            <Link to={`/shop/${activeTop.slug}`} className="hover:text-indigo">
              {activeTop.name}
            </Link>
          </p>
        )}
        <h1 className="font-display text-4xl text-indigo">{title}</h1>
        <RunningStitch className="mt-3 max-w-[120px] text-pink" />
        {category?.description && (
          <p className="mt-3 max-w-xl text-ink-muted">{category.description}</p>
        )}
      </header>

      {/* Tier 1 — top-level categories */}
      {tops.length > 0 && (
        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Categories">
          <CategoryPill to="/shop" active={!categorySlug} label="All" />
          {tops.map((cat) => (
            <CategoryPill
              key={cat.id}
              to={`/shop/${cat.slug}`}
              active={activeTop?.id === cat.id}
              label={cat.name}
            />
          ))}
        </nav>
      )}

      {/* Tier 2 — subcategories of the selected top-level category */}
      {activeTop && children.length > 0 && (
        <nav
          className="mb-8 flex flex-wrap items-center gap-2 rounded-xl bg-ivory-200/70 px-3 py-2.5"
          aria-label={`${activeTop.name} subcategories`}
        >
          <span className="pr-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {activeTop.name}
          </span>
          <SubPill
            to={`/shop/${activeTop.slug}`}
            active={!isChildSelected}
            label={`All ${activeTop.name}`}
          />
          {children.map((child) => (
            <SubPill
              key={child.id}
              to={`/shop/${child.slug}`}
              active={categorySlug === child.slug}
              label={child.name}
            />
          ))}
        </nav>
      )}

      <div className={activeTop && children.length > 0 ? '' : 'mt-5'}>
        <ProductGrid
          products={products}
          isLoading={isLoading}
          emptyLabel={
            categorySlug ? `Nothing in ${category?.name ?? 'this category'} yet` : 'No products here just yet'
          }
        />
      </div>
    </div>
  )
}

function CategoryPill({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-full border px-4 py-1.5 text-sm font-medium transition',
        active
          ? 'border-pink bg-pink text-white'
          : 'border-ivory-300 bg-white text-ink-muted hover:border-pink-200 hover:text-indigo',
      )}
    >
      {label}
    </Link>
  )
}

function SubPill({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-full px-3 py-1 text-sm transition',
        active
          ? 'bg-indigo text-ivory'
          : 'bg-white text-ink-muted hover:text-indigo',
      )}
    >
      {label}
    </Link>
  )
}
