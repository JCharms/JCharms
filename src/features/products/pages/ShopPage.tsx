import { useParams, Link } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useProducts, useCategory, useCategories } from '../hooks'
import { ProductGrid } from '../components/ProductGrid'
import { CategoryNav } from '../components/CategoryNav'
import { RunningStitch } from '@/components/ui/RunningStitch'
import { rootAncestorOf } from '@/lib/categoryTree'
import { useUIStore } from '@/store/ui'

/**
 * Shop-all (`/shop`) and per-category (`/shop/:categorySlug`) listing.
 *
 * The category filter is a collapsible sidebar rather than a row of pills: the
 * shop is expected to carry dozens of categories, which a wrapping pill row
 * can't hold legibly. On phones the same tree opens as a slide-over.
 * Choosing a parent shows everything beneath it (see listProducts).
 */
export function ShopPage() {
  const { categorySlug } = useParams()
  const { data: products, isLoading } = useProducts({ categorySlug })
  const { data: category } = useCategory(categorySlug ?? '')
  const { data: categories } = useCategories()
  const openCategories = useUIStore((s) => s.setCategoryMenuOpen)

  const all = categories ?? []
  // Keep the parent highlighted even when a child category is selected.
  const activeTop = categorySlug ? rootAncestorOf(all, categorySlug) : undefined
  const isChildSelected = !!activeTop && activeTop.slug !== categorySlug
  const title = categorySlug ? (category?.name ?? 'Shop') : 'Everything handmade'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
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

      <div className="grid gap-8 lg:grid-cols-[210px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Categories
            </p>
            <CategoryNav categories={all} activeSlug={categorySlug} searchable />
          </div>
        </aside>

        <div>
          {/* Mobile entry point into the same tree. */}
          {all.length > 0 && (
            <button
              onClick={() => openCategories(true)}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-ivory-300 bg-white px-4 py-2 text-sm font-medium text-ink-muted transition hover:border-pink-200 hover:text-indigo lg:hidden"
            >
              <SlidersHorizontal size={15} aria-hidden />
              {categorySlug ? (category?.name ?? 'Browse categories') : 'Browse categories'}
            </button>
          )}

          <ProductGrid
            products={products}
            isLoading={isLoading}
            emptyLabel={
              categorySlug
                ? `Nothing in ${category?.name ?? 'this category'} yet`
                : 'No products here just yet'
            }
          />
        </div>
      </div>
    </div>
  )
}
