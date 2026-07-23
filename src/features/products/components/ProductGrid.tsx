import { PackageOpen } from 'lucide-react'
import { ProductCard } from './ProductCard'
import { ProductCardSkeleton, EmptyState } from '@/components/ui'
import type { ProductWithRelations } from '@/types/domain'

/** Responsive product grid with loading + empty states and staggered reveal. */
export function ProductGrid({
  products,
  isLoading,
  emptyLabel = 'No products here just yet',
}: {
  products?: ProductWithRelations[]
  isLoading?: boolean
  emptyLabel?: string
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={emptyLabel}
        description="New handmade pieces are added often — check back soon!"
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
      {products.map((product, i) => (
        <div
          key={product.id}
          className="animate-stitch-in"
          style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}
