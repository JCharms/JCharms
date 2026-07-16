import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartLine } from '@/types/domain'

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
                  ? { ...i, quantity: i.quantity + line.quantity }
                  : i,
              ),
            }
          }
          return { items: [...state.items, line] }
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, variantId)),
        })),
      setQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              sameLine(i, productId, variantId)
                ? { ...i, quantity: Math.max(1, quantity) }
                : i,
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
