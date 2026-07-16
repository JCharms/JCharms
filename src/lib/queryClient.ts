import { QueryClient } from '@tanstack/react-query'

/**
 * Shared TanStack Query client. Catalogue data changes rarely, so we keep a
 * generous stale time to avoid needless refetches on a mostly-static store.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Canonical query keys — one place so invalidation stays consistent. */
export const queryKeys = {
  categories: ['categories'] as const,
  products: (filters?: unknown) => ['products', filters ?? {}] as const,
  product: (slug: string) => ['product', slug] as const,
  reviews: ['reviews'] as const,
  settings: ['site_settings'] as const,
  // Admin
  adminProducts: ['admin', 'products'] as const,
  adminOrders: (filters?: unknown) => ['admin', 'orders', filters ?? {}] as const,
  adminOrder: (id: string) => ['admin', 'order', id] as const,
  adminReviews: ['admin', 'reviews'] as const,
  adminAnalytics: ['admin', 'analytics'] as const,
  // Customer
  myOrders: ['my-orders'] as const,
}
