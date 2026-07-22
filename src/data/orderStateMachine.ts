import type { OrderStatus, PaymentStatus } from '@/types/database'

/**
 * Order lifecycle as an explicit state machine (spec §3f).
 *
 * Invalid jumps (e.g. placed → delivered without shipping) are impossible
 * because every status change is validated by `canTransition`. Adding a future
 * status (e.g. 'returned') is a one-line change to the maps below — no scattered
 * conditionals to hunt down.
 *
 * This is the single source of truth, imported by both the admin data layer and
 * the send-order-status-email Edge Function.
 */

/**
 * Allowed forward/again transitions for fulfillment status.
 *
 * `placed → shipped` is intentional: a ready-to-ship charm has nothing to
 * "make", so the owner posts it straight away and enters the tracking number —
 * that action marks it shipped without a detour through "Being made". The
 * intermediate step stays available for made-to-order pieces.
 */
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [], // terminal
  cancelled: [], // terminal
}

/** Allowed transitions for payment status. */
const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ['paid', 'failed'],
  paid: ['refunded'],
  failed: ['pending', 'paid'], // allow retry
  refunded: [], // terminal
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false
}

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) return true
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false
}

/** The statuses an order may legally move to next (excludes itself). */
export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from] ?? []
}

export function isTerminal(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status]?.length === 0
}

// ── Presentation helpers ────────────────────────────────────────────────────
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  processing: 'Being made',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
}

/** Tailwind token classes for a status pill. */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  placed: 'bg-marigold-100 text-marigold-500',
  processing: 'bg-indigo-100 text-indigo',
  shipped: 'bg-pink-100 text-pink-600',
  delivered: 'bg-sage-100 text-sage-400',
  cancelled: 'bg-ink-faint/15 text-ink-muted',
}

/** The ordered fulfillment steps shown on the tracking timeline. */
export const FULFILLMENT_STEPS: readonly OrderStatus[] = [
  'placed',
  'processing',
  'shipped',
  'delivered',
]
