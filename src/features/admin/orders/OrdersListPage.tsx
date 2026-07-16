import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Inbox } from 'lucide-react'
import { useAdminOrders } from './hooks'
import { Card, Badge, Input, LoadingBlock, EmptyState } from '@/components/ui'
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from '@/data/orderStateMachine'
import { formatDate, formatINR } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { OrderStatus } from '@/types/database'

const FILTERS: Array<OrderStatus | 'all'> = [
  'all', 'placed', 'processing', 'shipped', 'delivered', 'cancelled',
]

const BADGE_TONE: Record<OrderStatus, 'pink' | 'marigold' | 'indigo' | 'sage' | 'neutral'> = {
  placed: 'marigold', processing: 'indigo', shipped: 'pink', delivered: 'sage', cancelled: 'neutral',
}

export function OrdersListPage() {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const { data: orders, isLoading } = useAdminOrders({ status, search: search || undefined })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-indigo">Orders</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition',
                status === f
                  ? 'border-pink bg-pink text-white'
                  : 'border-ivory-300 bg-white text-ink-muted hover:border-pink-200',
              )}
            >
              {f === 'all' ? 'All' : ORDER_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search size={16} className="absolute left-3 top-3 text-ink-faint" />
          <Input
            placeholder="Search order # / name / email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : !orders || orders.length === 0 ? (
        <EmptyState icon={Inbox} title="No orders here" description="Orders will appear as they come in." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ivory-300 bg-ivory-100 text-left text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-300/60">
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-ivory-100">
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${o.id}`} className="font-mono font-semibold text-pink-600 hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink">{o.customer_name}</div>
                      <div className="text-xs text-ink-faint">{o.customer_email}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(o.placed_at)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium', o.payment_status === 'paid' ? 'text-sage-400' : 'text-ink-muted')}>
                        {PAYMENT_STATUS_LABEL[o.payment_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={BADGE_TONE[o.order_status]}>{ORDER_STATUS_LABEL[o.order_status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-indigo">{formatINR(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
