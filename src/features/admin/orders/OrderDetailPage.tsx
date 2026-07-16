import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Truck, StickyNote } from 'lucide-react'
import {
  useAdminOrder,
  useUpdateOrderStatus,
  useSetTracking,
  useUpdatePaymentStatus,
  useUpdateOrderNote,
} from './hooks'
import { Card, Badge, Button, Input, Textarea, Select, LoadingBlock, Price } from '@/components/ui'
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  nextStatuses,
  isTerminal,
} from '@/data/orderStateMachine'
import { formatDateTime, formatINR } from '@/lib/format'
import type { PaymentStatus, ShippingAddress } from '@/types/database'

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const { data: order, isLoading } = useAdminOrder(id)
  const updateStatus = useUpdateOrderStatus()
  const setTracking = useSetTracking()
  const updatePayment = useUpdatePaymentStatus()
  const updateNote = useUpdateOrderNote()

  const [tracking, setTrackingInput] = useState('')
  const [courier, setCourier] = useState('India Post')
  const [note, setNote] = useState('')

  if (isLoading || !order) return <LoadingBlock />

  const addr = order.shipping_address as unknown as ShippingAddress
  const moves = nextStatuses(order.order_status)

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-indigo">
        <ChevronLeft size={16} /> All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-3xl font-semibold text-pink-600">{order.order_number}</h1>
          <p className="text-sm text-ink-faint">Placed {formatDateTime(order.placed_at)}</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="indigo">{ORDER_STATUS_LABEL[order.order_status]}</Badge>
          <Badge tone={order.payment_status === 'paid' ? 'sage' : 'neutral'}>
            {PAYMENT_STATUS_LABEL[order.payment_status]}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Items + customer */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg text-indigo">Items</h2>
            <ul className="divide-y divide-ivory-300/70">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    {item.product_name}
                    {item.variant_name && <span className="text-ink-faint"> · {item.variant_name}</span>}
                    <span className="text-ink-faint"> × {item.quantity}</span>
                  </span>
                  <Price amount={item.line_total} size="sm" />
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 border-t border-dashed border-ivory-300 pt-3 text-sm">
              <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
              <div className="flex justify-between text-ink-muted"><span>Shipping</span><span>{formatINR(order.shipping_fee)}</span></div>
              <div className="flex justify-between font-semibold text-ink"><span>Total</span><span>{formatINR(order.total)}</span></div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-display text-lg text-indigo">Customer & shipping</h2>
            <div className="grid gap-1 text-sm text-ink-muted">
              <p className="font-medium text-ink">{order.customer_name}</p>
              <p>{order.customer_email}</p>
              <p>{order.customer_phone}</p>
              <p className="mt-2 whitespace-pre-line">
                {addr.line1}
                {addr.line2 ? `\n${addr.line2}` : ''}
                {`\n${addr.city}, ${addr.state} — ${addr.pincode}`}
              </p>
              {order.customer_note && (
                <p className="mt-2 rounded-lg bg-marigold-50 p-3 text-marigold-500">“{order.customer_note}”</p>
              )}
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <h2 className="font-display text-lg text-indigo">Update status</h2>
            {isTerminal(order.order_status) ? (
              <p className="text-sm text-ink-muted">This order is {ORDER_STATUS_LABEL[order.order_status].toLowerCase()} — no further changes.</p>
            ) : moves.length === 0 ? (
              <p className="text-sm text-ink-muted">No transitions available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {moves.map((to) => (
                  <Button
                    key={to}
                    size="sm"
                    variant={to === 'cancelled' ? 'outline' : 'primary'}
                    isLoading={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ order, to })}
                  >
                    Mark {ORDER_STATUS_LABEL[to]}
                  </Button>
                ))}
              </div>
            )}
            <p className="text-xs text-ink-faint">
              Only valid transitions are shown — the order state machine prevents illegal jumps.
            </p>
          </Card>

          <Card className="space-y-3 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg text-indigo">
              <Truck size={18} /> Shipping & tracking
            </h2>
            {order.tracking_number ? (
              <p className="text-sm text-ink-muted">
                {order.courier}: <span className="font-mono text-ink">{order.tracking_number}</span>
              </p>
            ) : (
              <p className="text-sm text-ink-faint">No tracking added yet.</p>
            )}
            <Input placeholder="Tracking number" value={tracking} onChange={(e) => setTrackingInput(e.target.value)} />
            <Select value={courier} onChange={(e) => setCourier(e.target.value)}>
              <option>India Post</option>
              <option>Delhivery</option>
              <option>DTDC</option>
              <option>Blue Dart</option>
            </Select>
            <Button
              size="sm"
              fullWidth
              disabled={!tracking}
              isLoading={setTracking.isPending}
              onClick={() => setTracking.mutate({ order, trackingNumber: tracking, courier })}
            >
              Save tracking & mark shipped
            </Button>
          </Card>

          <Card className="space-y-3 p-6">
            <h2 className="font-display text-lg text-indigo">Payment</h2>
            <Select
              value={order.payment_status}
              onChange={(e) => updatePayment.mutate({ id: order.id, to: e.target.value as PaymentStatus })}
            >
              {(['pending', 'paid', 'failed', 'refunded'] as PaymentStatus[]).map((s) => (
                <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>
              ))}
            </Select>
          </Card>

          <Card className="space-y-3 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg text-indigo">
              <StickyNote size={18} /> Private note
            </h2>
            <Textarea
              rows={3}
              defaultValue={order.admin_note ?? ''}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note (not shown to customer)"
            />
            <Button size="sm" variant="outline" isLoading={updateNote.isPending} onClick={() => updateNote.mutate({ id: order.id, note })}>
              Save note
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
