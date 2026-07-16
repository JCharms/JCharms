import { useParams, Link } from 'react-router-dom'
import { useProducts, useCategory, useCategoryTree } from '../hooks'
import { ProductGrid } from '../components/ProductGrid'
import { RunningStitch } from '@/components/ui/RunningStitch'
import { cn } from '@/lib/cn'

/** Shop-all (`/shop`) and per-category (`/shop/:categorySlug`) listing. */
export function ShopPage() {
  const { categorySlug } = useParams()
  const { data: products, isLoading } = useProducts({ categorySlug })
  const { data: category } = useCategory(categorySlug ?? '')
  const { data: categories } = useCategoryTree()

  const title = categorySlug ? (category?.name ?? 'Shop') : 'Everything handmade'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-indigo">{title}</h1>
        <RunningStitch className="mt-3 max-w-[120px] text-pink" />
        {category?.description && (
          <p className="mt-3 max-w-xl text-ink-muted">{category.description}</p>
        )}
      </header>

      {/* Category pills */}
      {categories && (
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Categories">
          <CategoryPill to="/shop" active={!categorySlug} label="All" />
          {categories.map((cat) => (
            <CategoryPill
              key={cat.id}
              to={`/shop/${cat.slug}`}
              active={categorySlug === cat.slug}
              label={cat.name}
            />
          ))}
        </nav>
      )}

      <ProductGrid products={products} isLoading={isLoading} />
    </div>
  )
}

function CategoryPill({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
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
