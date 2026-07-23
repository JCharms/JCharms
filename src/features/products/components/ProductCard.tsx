import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MessageCircle } from 'lucide-react'
import { Price } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { ProductImage } from './ProductImage'
import { useCart } from '@/features/cart/useCart'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { instagramDmUrl } from '@/lib/links'
import { isSoldOut } from '@/lib/stock'
import { cn } from '@/lib/cn'
import type { ProductWithRelations } from '@/types/domain'

/**
 * The highest-leverage surface (spec §7): the photo dominates — a tall
 * full-bleed rectangle with no labels over it (client feedback), a soft hover
 * lift like picking up a physical item, and a satisfying pop on Add to Cart.
 * Featured products wear the dashed running-stitch border.
 */
export function ProductCard({ product }: { product: ProductWithRelations }) {
  const { addProduct } = useCart()
  const { data: config } = useSiteConfig()
  const btnRef = useRef<HTMLButtonElement>(null)

  const isDmOnly = product.purchase_mode === 'dm_only'
  const hasVariants = product.variants.length > 0
  // With variants, the card is sold out only when every option is gone —
  // otherwise the shopper can still pick a live one on the detail page.
  const soldOut = hasVariants
    ? product.variants.every((v) => isSoldOut(product, v))
    : isSoldOut(product)

  // The only thing allowed on the photo besides "Sold out": a discount tag.
  const discountPct =
    !isDmOnly && product.compare_at_price && product.compare_at_price > product.base_price
      ? Math.round((1 - product.base_price / product.compare_at_price) * 100)
      : 0

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    // Products with choices route to the detail page to pick a variant.
    if (hasVariants || soldOut) return
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
        'group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1',
        product.is_featured && 'stitch-border',
      )}
    >
      {/* Full-bleed portrait photo — the product sells itself, nothing on top. */}
      <div className="relative overflow-hidden">
        <ProductImage
          image={product.images[0]}
          name={product.name}
          className={cn(
            // 10:11 — gently taller than square, so the photo leads without
            // the card reading as a tall rectangle.
            'aspect-[10/11] w-full transition-transform duration-500 group-hover:scale-[1.04]',
            // Desaturating reads as "gone" at a glance, before any label is read.
            soldOut && 'opacity-60 grayscale',
          )}
        />
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-indigo/85 px-4 py-1.5 text-sm font-semibold text-ivory">
              Sold out
            </span>
          </div>
        )}
        {!soldOut && discountPct > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-pink px-2.5 py-1 text-xs font-bold text-white shadow-soft">
            −{discountPct}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
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
              disabled={soldOut}
              aria-label={
                soldOut
                  ? `${product.name} is sold out`
                  : hasVariants
                    ? `Choose options for ${product.name}`
                    : `Add ${product.name} to bag`
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink text-white shadow-soft transition hover:bg-pink-500 hover:shadow-lift disabled:cursor-not-allowed disabled:bg-ink-faint disabled:shadow-none disabled:hover:bg-ink-faint"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
