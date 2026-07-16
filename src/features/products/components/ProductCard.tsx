import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MessageCircle } from 'lucide-react'
import { Price } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { ProductImage } from './ProductImage'
import { useCart } from '@/features/cart/useCart'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { instagramDmUrl } from '@/lib/links'
import { cn } from '@/lib/cn'
import type { ProductWithRelations } from '@/types/domain'

/**
 * The highest-leverage surface (spec §7): warm, tactile, a soft hover lift like
 * picking up a physical item, and a satisfying pop on Add to Cart. Featured
 * products wear the dashed running-stitch border.
 */
export function ProductCard({ product }: { product: ProductWithRelations }) {
  const { addProduct } = useCart()
  const { data: config } = useSiteConfig()
  const btnRef = useRef<HTMLButtonElement>(null)

  const isDmOnly = product.purchase_mode === 'dm_only'
  const hasVariants = product.variants.length > 0

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    // Products with choices route to the detail page to pick a variant.
    if (hasVariants) return
    addProduct(product, null, 1)
    const el = btnRef.current
    el?.classList.remove('animate-pop')
    void el?.offsetWidth // reflow so the animation can retrigger
    el?.classList.add('animate-pop')
  }

  return (
    <Link
      to={`/product/${product.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-soft transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1',
        product.is_featured && 'stitch-border',
      )}
    >
      <div className="relative overflow-hidden rounded-xl">
        <ProductImage
          image={product.images[0]}
          name={product.name}
          className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.is_featured && <Badge tone="marigold">Loved</Badge>}
          {product.stock_type === 'made_to_order' && (
            <Badge tone="indigo">Made to order</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-1 pt-3">
        <h3 className="stitch-underline self-start font-display text-lg leading-snug text-indigo">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="line-clamp-2 text-sm text-ink-muted">{product.short_description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          {isDmOnly ? (
            <Badge tone="pink">Custom · DM</Badge>
          ) : (
            <Price amount={product.base_price} compareAt={product.compare_at_price} />
          )}

          {isDmOnly ? (
            <a
              href={instagramDmUrl(config?.instagramHandle)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Enquire about ${product.name} on Instagram`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-ivory transition hover:bg-indigo-600"
            >
              <MessageCircle size={17} />
            </a>
          ) : (
            <button
              ref={btnRef}
              onClick={handleAdd}
              aria-label={hasVariants ? `Choose options for ${product.name}` : `Add ${product.name} to bag`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink text-white shadow-soft transition hover:bg-pink-500 hover:shadow-lift"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
