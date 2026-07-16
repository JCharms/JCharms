import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSiteConfig, saveSettings } from '@/data/settings'
import { queryKeys } from '@/lib/queryClient'
import { toast } from '@/store/ui'
import type { Json } from '@/types/database'

export function useAdminSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: getSiteConfig })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entries: Record<string, Json>) => saveSettings(entries),
    onSuccess: () => {
      toast.success('Settings saved.')
      qc.invalidateQueries({ queryKey: queryKeys.settings })
    },
    onError: (e) => toast.error((e as Error).message),
  })
}
