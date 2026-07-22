/**
 * Availability rules, in one place.
 *
 * Mirrors the check in the create-razorpay-order Edge Function, which is the
 * authoritative one — this exists so the storefront can grey out a sold-out
 * item instead of letting someone fill in a whole checkout form and get
 * rejected at the payment step. If you change one, change both.
 *
 * Pure: no Supabase import, so it can be exercised standalone.
 */

interface StockLike {
  stock_type: 'ready_stock' | 'made_to_order'
  stock_quantity: number | null
}

interface VariantStockLike {
  stock_quantity: number | null
  is_active: boolean
}

/**
 * How many of this product/variant can still be bought.
 *
 * `null` means "not tracked" — made-to-order pieces are stitched on demand and
 * have no ceiling, and a ready_stock row with no number set is untracked by
 * choice. Callers must treat null as available, not as zero.
 */
export function availableStock(
  product: StockLike,
  variant?: VariantStockLike | null,
): number | null {
  if (product.stock_type !== 'ready_stock') return null
  // A variant's own count wins when set: that is the thing physically on the
  // shelf. Falling back to the product covers variants that don't track stock.
  const tracked = variant?.stock_quantity ?? product.stock_quantity
  return tracked ?? null
}

/** True only when stock is tracked AND exhausted. */
export function isSoldOut(product: StockLike, variant?: VariantStockLike | null): boolean {
  const available = availableStock(product, variant)
  return available !== null && available <= 0
}

/**
 * Ceiling for a quantity picker. Falls back to a sane cap for untracked items
 * so the input can't be driven to absurd numbers — the server enforces the
 * same bound.
 */
export const MAX_LINE_QUANTITY = 50

export function maxSelectableQuantity(
  product: StockLike,
  variant?: VariantStockLike | null,
): number {
  const available = availableStock(product, variant)
  if (available === null) return MAX_LINE_QUANTITY
  return Math.max(0, Math.min(available, MAX_LINE_QUANTITY))
}

/** Short, human phrasing for a low-stock nudge. Null when there's nothing to say. */
export function stockLabel(
  product: StockLike,
  variant?: VariantStockLike | null,
): string | null {
  const available = availableStock(product, variant)
  if (available === null) return null
  if (available <= 0) return 'Sold out'
  // Only nudge when it is genuinely nearly gone — "12 left" is noise.
  if (available <= 3) return `Only ${available} left`
  return null
}
