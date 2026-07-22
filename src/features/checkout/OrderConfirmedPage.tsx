import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, Package } from 'lucide-react'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useCartStore } from '@/store/cart'
import { deliveryEstimateLabel } from '@/lib/policy'
import { Button, Card, Price } from '@/components/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'

interface OrderSummaryLine {
  name: string
  variantName: string | null
  quantity: number
  unitPrice: number
}
interface OrderSummary {
  items: OrderSummaryLine[]
  subtotal: number
  total: number
}

/** Post-payment thank-you. Order number is the ticket for guest tracking. */
export function OrderConfirmedPage() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const { data: config } = useSiteConfig()
  const clearCart = useCartStore((s) => s.clear)
  const deliveryEstimate = config ? deliveryEstimateLabel(config) : ''

  // Reaching this page means the order is placed and paid, so empty the bag.
  // Deferred here from checkout on purpose — clearing it during checkout raced
  // that page's empty-cart guard and bounced the buyer to /shop.
  useEffect(() => {
    clearCart()
  }, [clearCart])

  // Passed through router state from checkout so we can show what they bought
  // without a fetch (guests have no direct order read). Absent on a refresh —
  // the order number + email receipt still carry everything essential.
  const summary = (location.state as { summary?: OrderSummary } | null)?.summary
  const shipping = summary ? summary.total - summary.subtotal : 0

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-sage-100 text-sage-400 animate-stitch-in">
        <CheckCircle2 size={40} />
      </span>
      <h1 className="mt-6 font-display text-4xl text-indigo">Yay — order placed!</h1>
      <RunningStitch className="mx-auto mt-3 max-w-[160px] text-pink" />
      <p className="mt-4 text-ink-muted">
        Thank you for supporting handmade 💕 We've emailed your confirmation and will
        start stitching soon.
        {deliveryEstimate && (
          <> Your order should reach you in about <strong className="text-ink">{deliveryEstimate}</strong>.</>
        )}
      </p>

      {orderNumber && (
        <Card className="mt-8 w-full p-6">
          <p className="text-sm text-ink-muted">Your order number</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-pink-600">{orderNumber}</p>
          <p className="mt-2 text-xs text-ink-faint">
            Keep this handy — you can track your order anytime with it.
          </p>

          {summary && summary.items.length > 0 && (
            <div className="mt-5 border-t border-dashed border-ivory-300 pt-4 text-left">
              <ul className="divide-y divide-ivory-300/70">
                {summary.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-ink">
                      {item.name}
                      {item.variantName && (
                        <span className="text-ink-faint"> · {item.variantName}</span>
                      )}
                      <span className="text-ink-faint"> × {item.quantity}</span>
                    </span>
                    <Price amount={item.unitPrice * item.quantity} size="sm" />
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 border-t border-ivory-300/70 pt-3 text-sm">
                <div className="flex justify-between text-ink-muted">
                  <span>Subtotal</span>
                  <span>{inr(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Shipping</span>
                  <span>{shipping <= 0 ? 'Free' : inr(shipping)}</span>
                </div>
                <div className="flex justify-between font-semibold text-ink">
                  <span>Total paid</span>
                  <span>{inr(summary.total)}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={`/track${orderNumber ? `?order=${orderNumber}` : ''}`}>
          <Button variant="secondary">
            <Package size={18} /> Track my order
          </Button>
        </Link>
        <Link to="/shop">
          <Button variant="outline">Keep shopping</Button>
        </Link>
      </div>
    </div>
  )
}

const inr = (n: number) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`
