import { Truck, ExternalLink } from 'lucide-react'
import { Badge, Card, Price } from '@/components/ui'
import { OrderStatusTimeline } from './OrderStatusTimeline'
import { ORDER_STATUS_LABEL } from '@/data/orderStateMachine'
import { formatDate, formatINR } from '@/lib/format'
import { courierTracking } from '@/lib/tracking'
import type { OrderWithItems } from '@/types/domain'
import type { OrderStatus } from '@/types/database'

const TONE_TO_BADGE: Record<OrderStatus, 'pink' | 'marigold' | 'indigo' | 'sage' | 'neutral'> = {
  placed: 'marigold',
  processing: 'indigo',
  shipped: 'pink',
  delivered: 'sage',
  cancelled: 'neutral',
}

/** Customer-facing order card — used by order history and tracking result. */
export function OrderCard({ order, showTimeline = true }: { order: OrderWithItems; showTimeline?: boolean }) {
  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-lg font-semibold text-pink-600">{order.order_number}</p>
          <p className="text-xs text-ink-faint">Placed {formatDate(order.placed_at)}</p>
        </div>
        <Badge tone={TONE_TO_BADGE[order.order_status]}>
          {ORDER_STATUS_LABEL[order.order_status]}
        </Badge>
      </div>

      {showTimeline && <OrderStatusTimeline status={order.order_status} />}

      <ul className="divide-y divide-ivory-300/70 border-t border-ivory-300/70">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-ink">
              {item.product_name}
              {item.variant_name && <span className="text-ink-faint"> · {item.variant_name}</span>}
              <span className="text-ink-faint"> × {item.quantity}</span>
            </span>
            <Price amount={item.line_total} size="sm" />
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t border-dashed border-ivory-300 pt-3 text-sm">
        <div className="flex justify-between text-ink-muted">
          <span>Subtotal</span>
          <span>{formatINR(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-ink-muted">
          <span>Shipping</span>
          <span>{order.shipping_fee > 0 ? formatINR(order.shipping_fee) : 'Free'}</span>
        </div>
        <div className="flex items-center justify-between pt-1 font-semibold text-ink">
          <span>Total paid</span>
          <Price amount={order.total} />
        </div>
      </div>

      {order.tracking_number && <TrackingPanel order={order} />}
    </Card>
  )
}

/** Tracking number + a link to the courier's own tracking page. */
function TrackingPanel({ order }: { order: OrderWithItems }) {
  const courier = order.courier ?? 'India Post'
  const { url, prefilled, note } = courierTracking(courier, order.tracking_number!)

  return (
    <div className="rounded-xl border border-ivory-300 bg-ivory-100/60 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Truck size={16} className="text-indigo" aria-hidden />
        Shipped with {courier}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        Tracking number:{' '}
        <span className="select-all font-mono font-semibold text-ink">{order.tracking_number}</span>
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo px-4 py-2 text-sm font-semibold text-ivory transition hover:bg-indigo-600"
      >
        Track on {courier} <ExternalLink size={14} />
      </a>
      {!prefilled && (
        <p className="mt-2 text-xs text-ink-faint">
          {note ?? `${courier}'s tracker opens in a new tab — paste your number above to see the latest status.`}
        </p>
      )}
    </div>
  )
}
