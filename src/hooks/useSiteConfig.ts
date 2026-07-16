import { useQuery } from '@tanstack/react-query'
import { getSiteConfig } from '@/data/settings'
import { queryKeys } from '@/lib/queryClient'

/** Site-wide config (shipping, banner, handle) — read from site_settings. */
export function useSiteConfig() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSiteConfig,
    staleTime: 1000 * 60 * 10,
  })
}
