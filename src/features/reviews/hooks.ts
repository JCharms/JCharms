import { useQuery } from '@tanstack/react-query'
import { listPublishedReviews } from '@/data/reviews'
import { queryKeys } from '@/lib/queryClient'

export function useReviews() {
  return useQuery({ queryKey: queryKeys.reviews, queryFn: listPublishedReviews })
}
