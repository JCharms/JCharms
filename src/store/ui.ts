import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

interface UIState {
  toasts: Toast[]
  cartOpen: boolean
  /** The slide-over category browser — also doubles as the mobile nav. */
  categoryMenuOpen: boolean
  pushToast: (message: string, tone?: ToastTone) => void
  dismissToast: (id: number) => void
  setCartOpen: (open: boolean) => void
  setCategoryMenuOpen: (open: boolean) => void
}

let nextId = 1

/** Ephemeral UI state: toasts + drawer visibility. */
export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  cartOpen: false,
  categoryMenuOpen: false,
  pushToast: (message, tone = 'success') => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  // Only one slide-over at a time — opening the bag over the category menu (or
  // vice versa) leaves two stacked panels and two Escape handlers fighting.
  setCartOpen: (cartOpen) => set(cartOpen ? { cartOpen, categoryMenuOpen: false } : { cartOpen }),
  setCategoryMenuOpen: (categoryMenuOpen) =>
    set(categoryMenuOpen ? { categoryMenuOpen, cartOpen: false } : { categoryMenuOpen }),
}))

/** Convenience for non-component code (repos catch → toast in components). */
export const toast = {
  success: (m: string) => useUIStore.getState().pushToast(m, 'success'),
  error: (m: string) => useUIStore.getState().pushToast(m, 'error'),
  info: (m: string) => useUIStore.getState().pushToast(m, 'info'),
}
