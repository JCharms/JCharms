import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '@/data/analytics'
import { queryKeys } from '@/lib/queryClient'

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.adminAnalytics,
    queryFn: getDashboard,
    staleTime: 1000 * 60,
  })
}
