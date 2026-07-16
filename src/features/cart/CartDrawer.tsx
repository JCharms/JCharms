import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from './useCart'
import { useUIStore } from '@/store/ui'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { shippingForSubtotal } from '@/data/settings'
import { Button, Price } from '@/components/ui'
import { ProductImage } from '@/features/products/components/ProductImage'
import { cn } from '@/lib/cn'

/** Slide-over cart. Opened via the header bag button or add-to-cart. */
export function CartDrawer() {
  const open = useUIStore((s) => s.cartOpen)
  const setOpen = useUIStore((s) => s.setCartOpen)
  const { items, subtotal, setQuantity, removeItem } = useCart()
  const { data: config } = useSiteConfig()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const shipping = config ? shippingForSubtotal(config, subtotal) : 0
  const total = subtotal + shipping

  function goToCheckout() {
    setOpen(false)
    navigate('/checkout')
  }

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
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-lift transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
      >
        <header className="flex items-center justify-between border-b border-ivory-300 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-xl text-indigo">
            <ShoppingBag size={20} /> Your bag
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close bag"
            className="rounded-full p-1.5 text-ink-muted hover:bg-ivory-300"
          >
            <X size={18} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink">
              <ShoppingBag size={28} />
            </span>
            <p className="text-ink-muted">Your bag is empty — let's fix that!</p>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep browsing
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={() => setOpen(false)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-lg"
                  >
                    <ProductImage
                      path={item.imagePath}
                      isPlaceholder={!item.imagePath}
                      name={item.name}
                      className="h-full w-full"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-display text-indigo">{item.name}</p>
                        {item.variantName && (
                          <p className="text-xs text-ink-faint">{item.variantName}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        aria-label={`Remove ${item.name}`}
                        className="text-ink-faint hover:text-pink-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-full border border-ivory-300 bg-white">
                        <button
                          onClick={() => setQuantity(item.productId, item.variantId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-ivory-200"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center font-mono text-sm">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.productId, item.variantId, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-ivory-200"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <Price amount={item.unitPrice * item.quantity} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="space-y-3 border-t border-ivory-300 px-5 py-4">
              <div className="flex justify-between text-sm text-ink-muted">
                <span>Subtotal</span>
                <Price amount={subtotal} size="sm" />
              </div>
              <div className="flex justify-between text-sm text-ink-muted">
                <span>Shipping{shipping === 0 ? ' (free!)' : ''}</span>
                <Price amount={shipping} size="sm" />
              </div>
              <div className="flex justify-between border-t border-dashed border-ivory-300 pt-3 font-semibold text-ink">
                <span>Total</span>
                <Price amount={total} />
              </div>
              <Button fullWidth size="lg" onClick={goToCheckout}>
                Checkout
              </Button>
            </footer>
          </>
        )}
      </aside>
    </div>,
    document.body,
  )
}
