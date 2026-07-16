import { Badge, Card, Price } from '@/components/ui'
import { OrderStatusTimeline } from './OrderStatusTimeline'
import { ORDER_STATUS_LABEL } from '@/data/orderStateMachine'
import { formatDate } from '@/lib/format'
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

      <div className="flex items-center justify-between border-t border-dashed border-ivory-300 pt-3">
        <span className="text-sm text-ink-muted">
          {order.tracking_number ? `${order.courier}: ${order.tracking_number}` : 'Total'}
        </span>
        <Price amount={order.total} />
      </div>
    </Card>
  )
}
