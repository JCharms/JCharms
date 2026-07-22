import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAX_LINE_QUANTITY } from '@/lib/stock'
import type { CartLine } from '@/types/domain'

/**
 * Quantities come from a persisted store, so they survive across sessions and
 * can be edited by hand in localStorage. Clamp on the way in rather than trust
 * them: the Edge Function enforces the same ceiling and would otherwise reject
 * the whole order at the payment step, after the customer has filled in
 * everything. A non-numeric value collapses to 1 instead of poisoning the
 * subtotal with NaN.
 */
const clampQty = (n: number): number => {
  const q = Math.floor(Number(n))
  if (!Number.isFinite(q) || q < 1) return 1
  return Math.min(q, MAX_LINE_QUANTITY)
}

interface CartState {
  items: CartLine[]
  addItem: (line: CartLine) => void
  removeItem: (productId: string, variantId: string | null) => void
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void
  clear: () => void
}

const sameLine = (a: CartLine, productId: string, variantId: string | null) =>
  a.productId === productId && a.variantId === variantId

/**
 * Persisted cart (spec: Zustand persisted). Holds only on-site-checkout
 * ('direct') products; 'dm_only' items redirect to Instagram and never enter
 * the cart. Line identity is (productId, variantId).
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (line) =>
        set((state) => {
          const existing = state.items.find((i) =>
            sameLine(i, line.productId, line.variantId),
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, line.productId, line.variantId)
                  ? { ...i, quantity: clampQty(i.quantity + line.quantity) }
                  : i,
              ),
            }
          }
          return { items: [...state.items, { ...line, quantity: clampQty(line.quantity) }] }
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, variantId)),
        })),
      setQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              sameLine(i, productId, variantId) ? { ...i, quantity: clampQty(quantity) } : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'jcharms-cart' },
  ),
)

// ── Derived selectors (kept as plain fns to avoid re-render churn) ──────────
export const selectCount = (s: CartState) =>
  s.items.reduce((n, i) => n + i.quantity, 0)
export const selectSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
