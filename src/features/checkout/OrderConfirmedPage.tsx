import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Package } from 'lucide-react'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { deliveryEstimateLabel } from '@/lib/policy'
import { Button, Card } from '@/components/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'

/** Post-payment thank-you. Order number is the ticket for guest tracking. */
export function OrderConfirmedPage() {
  const { orderNumber } = useParams()
  const { data: config } = useSiteConfig()
  const deliveryEstimate = config ? deliveryEstimateLabel(config) : ''

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
