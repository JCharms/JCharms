import { useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingBag, MessageCircle, Clock, Sparkles, ChevronLeft } from 'lucide-react'
import { useProduct } from '../hooks'
import { ProductImage } from '../components/ProductImage'
import { useCart } from '@/features/cart/useCart'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { Button, Price, Badge, LoadingBlock, EmptyState } from '@/components/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'
import { instagramDmUrl } from '@/lib/links'
import { cn } from '@/lib/cn'
import type { ProductVariant } from '@/types/database'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const { data: product, isLoading, isError } = useProduct(slug)
  const { addProduct, openCart } = useCart()
  const { data: config } = useSiteConfig()

  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const btnRef = useRef<HTMLButtonElement>(null)

  if (isLoading) return <LoadingBlock label="Fetching this little treasure…" />
  if (isError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="We couldn't find that product"
          description="It may have sold out or been tucked away."
          action={
            <Link to="/shop">
              <Button>Back to shop</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const isDmOnly = product.purchase_mode === 'dm_only'
  const needsVariant = product.variants.length > 0 && !variant
  const unitPrice = variant?.price_override ?? product.base_price
  const images = product.images.length > 0 ? product.images : [null]

  function handleAdd() {
    if (needsVariant) return
    addProduct(product!, variant, qty)
    const el = btnRef.current
    el?.classList.remove('animate-pop')
    void el?.offsetWidth
    el?.classList.add('animate-pop')
    openCart()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        to="/shop"
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-indigo"
      >
        <ChevronLeft size={16} /> Back to shop
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
            <ProductImage
              image={images[activeImage]}
              name={product.name}
              className="aspect-square w-full"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img?.id ?? i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={cn(
                    'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition',
                    activeImage === i ? 'border-pink' : 'border-transparent opacity-70',
                  )}
                >
                  <ProductImage image={img} name={product.name} className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap gap-2">
            {product.is_featured && <Badge tone="marigold">Loved</Badge>}
            <Badge tone="indigo">
              {product.stock_type === 'made_to_order' ? 'Made to order' : 'Ready to ship'}
            </Badge>
            {product.is_customizable && (
              <Badge tone="pink">
                <Sparkles size={11} /> Customizable
              </Badge>
            )}
          </div>

          <h1 className="mt-3 font-display text-4xl text-indigo">{product.name}</h1>
          <RunningStitch className="mt-3 max-w-[100px] text-pink" />

          {!isDmOnly && (
            <div className="mt-4">
              <Price amount={unitPrice} compareAt={product.compare_at_price} size="lg" />
            </div>
          )}

          {product.description && (
            <p className="mt-5 whitespace-pre-line leading-relaxed text-ink-muted">
              {product.description}
            </p>
          )}

          {(product.processing_min_days || product.processing_max_days) && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sage-50 px-3 py-2 text-sm text-sage-400">
              <Clock size={15} />
              Dispatch in{' '}
              {product.processing_min_days && product.processing_max_days
                ? `${product.processing_min_days}–${product.processing_max_days} days`
                : `${product.processing_min_days ?? product.processing_max_days} days`}
            </p>
          )}

          {/* Variant picker */}
          {product.variants.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-ink">
                Choose an option{needsVariant && <span className="text-pink-600"> *</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm font-medium transition',
                      variant?.id === v.id
                        ? 'border-pink bg-pink-50 text-pink-600'
                        : 'border-ivory-300 bg-white text-ink-muted hover:border-pink-200',
                    )}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8">
            {isDmOnly ? (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5">
                <p className="font-display text-lg text-indigo">This one's fully bespoke ✨</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Custom pieces are planned together over Instagram DM — tell us your idea!
                </p>
                <a
                  href={instagramDmUrl(config?.instagramHandle, product.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo px-6 py-3 font-semibold text-ivory transition hover:bg-indigo-600"
                >
                  <MessageCircle size={18} /> Message us on Instagram
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-full border border-ivory-300 bg-white">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="h-11 w-11 rounded-full text-lg hover:bg-ivory-200"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="h-11 w-11 rounded-full text-lg hover:bg-ivory-200"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <Button
                  ref={btnRef}
                  size="lg"
                  onClick={handleAdd}
                  disabled={needsVariant}
                  className="flex-1"
                >
                  <ShoppingBag size={18} />
                  {needsVariant ? 'Select an option' : 'Add to bag'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
