import { supabase } from '@/lib/supabaseClient'
import { unwrap, unwrapList, storageUrl, BUCKET } from './_helpers'
import type { Database, Review } from '@/types/database'

/** Public URL for a review's screenshot, or null if it has none. */
export function reviewScreenshotUrl(path: string | null | undefined): string | null {
  return path ? storageUrl(BUCKET.reviewScreenshots, path) : null
}

/** Published testimonials for the storefront, in curated order. */
export async function listPublishedReviews(): Promise<Review[]> {
  return unwrapList(
    await supabase
      .from('reviews')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
    'listPublishedReviews',
  )
}

// ── Admin ───────────────────────────────────────────────────────────────────
type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export async function adminListReviews(): Promise<Review[]> {
  return unwrapList(
    await supabase.from('reviews').select('*').order('sort_order', { ascending: true }),
    'adminListReviews',
  )
}

export async function createReview(input: ReviewInsert): Promise<Review> {
  return unwrap(
    await supabase.from('reviews').insert(input).select().single(),
    'createReview',
  )
}

export async function updateReview(id: string, patch: ReviewUpdate): Promise<Review> {
  return unwrap(
    await supabase.from('reviews').update(patch).eq('id', id).select().single(),
    'updateReview',
  )
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw new Error(`[deleteReview] ${error.message}`)
}

export async function setReviewPublished(id: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .update({ is_published: value })
    .eq('id', id)
  if (error) throw new Error(`[setReviewPublished] ${error.message}`)
}
