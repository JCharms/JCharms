import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

/**
 * Repository-layer helpers. Everything DB-related funnels through src/data/* —
 * components and hooks call these repos, never supabase.from(...) directly, so
 * a backend swap has a one-folder blast radius (spec §3b).
 */

/** Unwrap a Supabase single-object result, throwing a readable error. */
export function unwrap<T>(
  result: { data: T | null; error: PostgrestError | null },
  context: string,
): T {
  if (result.error) {
    throw new Error(`[${context}] ${result.error.message}`)
  }
  if (result.data === null) {
    throw new Error(`[${context}] No data returned.`)
  }
  return result.data
}

/** Unwrap a list result, tolerating an empty (but non-error) response. */
export function unwrapList<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  context: string,
): T[] {
  if (result.error) {
    throw new Error(`[${context}] ${result.error.message}`)
  }
  return result.data ?? []
}

/** Public URL for a file in a storage bucket. */
export function storageUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export const BUCKET = {
  productImages: 'product-images',
  reviewScreenshots: 'review-screenshots',
} as const
