import { supabase } from '@/lib/supabaseClient'
import { unwrap, unwrapList } from './_helpers'
import { canTransition } from './orderStateMachine'
import type { Order, OrderStatus, PaymentStatus, TablesUpdate } from '@/types/database'
import type { OrderWithItems, CartLine, CheckoutDetails } from '@/types/domain'

/**
 * Orders repository.
 *
 * Guests never read/write orders directly (RLS denies anon). Order creation,
 * payment verification and guest lookup all go through Edge Functions that use
 * the service-role key server-side (spec §4). Logged-in customers may read
 * their own orders directly; admins may read/manage everything.
 */

const ORDER_WITH_ITEMS = '*, items:order_items(*)' as const

// ── Customer (authenticated) ────────────────────────────────────────────────
export async function getMyOrders(): Promise<OrderWithItems[]> {
  return unwrapList(
    await supabase
      .from('orders')
      .select(ORDER_WITH_ITEMS)
      .order('placed_at', { ascending: false }),
    'getMyOrders',
  ) as OrderWithItems[]
}

// ── Guest order tracking (via Edge Function) ────────────────────────────────
export interface TrackOrderInput {
  orderNumber: string
  contact: string // email or phone entered at tracking
}

export async function trackOrder(
  input: TrackOrderInput,
): Promise<OrderWithItems | null> {
  const { data, error } = await supabase.functions.invoke('track-order', {
    body: input,
  })
  if (error) throw new Error(`[trackOrder] ${error.message}`)
  return (data?.order as OrderWithItems | undefined) ?? null
}

// ── Checkout (via Edge Functions) ───────────────────────────────────────────
export interface CreateOrderInput {
  items: CartLine[]
  details: CheckoutDetails
  userId: string | null
}

export interface CreateRazorpayOrderResult {
  orderId: string // internal orders.id
  orderNumber: string
  razorpayOrderId: string
  amount: number // paise
  currency: 'INR'
  keyId: string
}

/** Server computes authoritative totals, creates the order + Razorpay order. */
export async function createRazorpayOrder(
  input: CreateOrderInput,
): Promise<CreateRazorpayOrderResult> {
  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: input,
  })
  if (error) throw new Error(`[createRazorpayOrder] ${error.message}`)
  return data as CreateRazorpayOrderResult
}

export interface VerifyPaymentInput {
  orderId: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

/** Verifies the Razorpay signature server-side and marks the order paid. */
export async function verifyPayment(
  input: VerifyPaymentInput,
): Promise<{ orderNumber: string }> {
  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: input,
  })
  if (error) throw new Error(`[verifyPayment] ${error.message}`)
  return data as { orderNumber: string }
}

// ── Admin ───────────────────────────────────────────────────────────────────
export interface AdminOrderFilters {
  status?: OrderStatus | 'all'
  paymentStatus?: PaymentStatus | 'all'
  search?: string
}

export async function adminListOrders(
  filters: AdminOrderFilters = {},
): Promise<OrderWithItems[]> {
  let query = supabase
    .from('orders')
    .select(ORDER_WITH_ITEMS)
    .order('placed_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('order_status', filters.status)
  }
  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    query = query.eq('payment_status', filters.paymentStatus)
  }
  if (filters.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`,
    )
  }
  return unwrapList(await query, 'adminListOrders') as OrderWithItems[]
}

export async function adminGetOrder(id: string): Promise<OrderWithItems> {
  return unwrap(
    await supabase.from('orders').select(ORDER_WITH_ITEMS).eq('id', id).single(),
    'adminGetOrder',
  ) as OrderWithItems
}

/**
 * Move an order to a new fulfillment status. The state machine (spec §3f) makes
 * illegal jumps impossible; a valid change also fires the customer email via
 * the send-order-status-email Edge Function.
 */
export async function adminUpdateOrderStatus(
  order: Pick<Order, 'id' | 'order_status'>,
  to: OrderStatus,
): Promise<Order> {
  if (!canTransition(order.order_status, to)) {
    throw new Error(
      `Invalid status transition: ${order.order_status} → ${to}. ` +
        `Not an allowed move.`,
    )
  }
  const patch: TablesUpdate<'orders'> = { order_status: to }
  if (to === 'shipped') patch.shipped_at = new Date().toISOString()
  if (to === 'delivered') patch.delivered_at = new Date().toISOString()

  const updated = unwrap<Order>(
    await supabase.from('orders').update(patch).eq('id', order.id).select().single(),
    'adminUpdateOrderStatus',
  )
  await notifyStatusEmail(order.id, to)
  return updated
}

/** Enter tracking + courier and advance to 'shipped' (fires shipped email). */
export async function adminSetTracking(
  order: Pick<Order, 'id' | 'order_status'>,
  trackingNumber: string,
  courier = 'India Post',
): Promise<Order> {
  const patch: TablesUpdate<'orders'> = { tracking_number: trackingNumber, courier }
  // Advance to shipped if it's a legal move and not already shipped/delivered.
  if (canTransition(order.order_status, 'shipped')) {
    patch.order_status = 'shipped'
    patch.shipped_at = new Date().toISOString()
  }
  const updated = unwrap<Order>(
    await supabase.from('orders').update(patch).eq('id', order.id).select().single(),
    'adminSetTracking',
  )
  if (patch.order_status === 'shipped') await notifyStatusEmail(order.id, 'shipped')
  return updated
}

export async function adminUpdatePaymentStatus(
  id: string,
  to: PaymentStatus,
): Promise<Order> {
  return unwrap(
    await supabase.from('orders').update({ payment_status: to }).eq('id', id).select().single(),
    'adminUpdatePaymentStatus',
  )
}

export async function adminUpdateOrderNote(id: string, note: string): Promise<void> {
  const { error } = await supabase.from('orders').update({ admin_note: note }).eq('id', id)
  if (error) throw new Error(`[adminUpdateOrderNote] ${error.message}`)
}

/** Fire-and-log the transactional status email; never blocks the status change. */
async function notifyStatusEmail(orderId: string, status: OrderStatus): Promise<void> {
  try {
    await supabase.functions.invoke('send-order-status-email', {
      body: { orderId, status },
    })
  } catch (err) {
    // Email is best-effort — the status change already succeeded.
    console.error('[notifyStatusEmail] failed:', err)
  }
}
