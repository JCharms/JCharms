import { useQuery } from '@tanstack/react-query'
import { getMyOrders } from '@/data/orders'
import { queryKeys } from '@/lib/queryClient'
import { useAuthStore } from '@/features/auth/authStore'

/** Logged-in customer's order history (RLS: own orders only). */
export function useMyOrders() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: queryKeys.myOrders,
    queryFn: getMyOrders,
    enabled: !!user,
  })
}
