import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminListReviews,
  createReview,
  updateReview,
  deleteReview,
  setReviewPublished,
} from '@/data/reviews'
import { uploadReviewScreenshot, removeReviewScreenshotFile } from '@/data/storage'
import { queryKeys } from '@/lib/queryClient'
import { toast } from '@/store/ui'
import type { Database } from '@/types/database'

type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export function useAdminReviews() {
  return useQuery({ queryKey: queryKeys.adminReviews, queryFn: adminListReviews })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminReviews })
    qc.invalidateQueries({ queryKey: queryKeys.reviews })
  }
}

export function useCreateReview() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: ReviewInsert) => createReview(input),
    onSuccess: () => { toast.success('Review added.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useUpdateReview() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ReviewUpdate }) => updateReview(id, patch),
    onSuccess: () => { toast.success('Review saved.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useDeleteReview() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => { toast.success('Review deleted.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useSetReviewPublished() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setReviewPublished(id, value),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error((e as Error).message),
  })
}

/**
 * Upload (or replace) a review's screenshot from the admin panel — so the
 * non-technical owner never touches the storage bucket directly. Uploads the
 * file, points the review row at it, then cleans up any previous file.
 */
export function useUploadReviewImage() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, file, oldPath }: { id: string; file: File; oldPath?: string | null }) => {
      const path = await uploadReviewScreenshot(file)
      await updateReview(id, { screenshot_path: path })
      if (oldPath) await removeReviewScreenshotFile(oldPath)
    },
    onSuccess: () => { toast.success('Photo added.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}

export function useRemoveReviewImage() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, path }: { id: string; path?: string | null }) => {
      await updateReview(id, { screenshot_path: null })
      if (path) await removeReviewScreenshotFile(path)
    },
    onSuccess: () => { toast.success('Photo removed.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
