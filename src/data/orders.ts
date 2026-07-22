import { supabase } from '@/lib/supabaseClient'
import { unwrap, unwrapList } from './_helpers'
import { canTransition, canTransitionPayment } from './orderStateMachine'
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
/**
 * A signed-in customer's own order history.
 *
 * Scoped to `user_id` explicitly, not left to RLS: the admin read policy grants
 * an owner-account SELECT over *every* order, so without this filter the shop
 * owner's personal "My orders" page would list the whole store. RLS still backs
 * this up at the database — this is the page saying "only mine", not the
 * boundary itself.
 */
export async function getMyOrders(): Promise<OrderWithItems[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return []
  return unwrapList(
    await supabase
      .from('orders')
      .select(ORDER_WITH_ITEMS)
      .eq('user_id', uid)
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

/**
 * Enter tracking + courier and advance to 'shipped'. Adding a tracking number
 * *is* the "I've posted it" action, so from either 'placed' or 'processing' it
 * moves the order straight to shipped and fires the shipped email once. Editing
 * tracking on an already-shipped order just updates the number — it doesn't
 * re-send the email.
 */
export async function adminSetTracking(
  order: Pick<Order, 'id' | 'order_status'>,
  trackingNumber: string,
  courier = 'India Post',
): Promise<Order> {
  const patch: TablesUpdate<'orders'> = { tracking_number: trackingNumber, courier }
  const alreadyShipped =
    order.order_status === 'shipped' || order.order_status === 'delivered'
  const willShip = !alreadyShipped && canTransition(order.order_status, 'shipped')
  if (willShip) {
    patch.order_status = 'shipped'
    patch.shipped_at = new Date().toISOString()
  }
  const updated = unwrap<Order>(
    await supabase.from('orders').update(patch).eq('id', order.id).select().single(),
    'adminSetTracking',
  )
  if (willShip) await notifyStatusEmail(order.id, 'shipped')
  return updated
}

/**
 * Payment status is owned by Razorpay — the storefront only ever sets it from a
 * verified signature or webhook. The one legitimate manual move is recording a
 * refund the owner issued out-of-band in the Razorpay dashboard, so this
 * validates against the payment state machine and refuses anything else (you
 * cannot, for instance, hand-flip a verified `paid` order to `failed`).
 */
export async function adminUpdatePaymentStatus(
  order: Pick<Order, 'id' | 'payment_status'>,
  to: PaymentStatus,
): Promise<Order> {
  if (!canTransitionPayment(order.payment_status, to)) {
    throw new Error(
      `Payment status can't move ${order.payment_status} → ${to}. ` +
        'Payment state is set by Razorpay; only a refund can be recorded manually.',
    )
  }
  return unwrap(
    await supabase
      .from('orders')
      .update({ payment_status: to })
      .eq('id', order.id)
      .select()
      .single(),
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
