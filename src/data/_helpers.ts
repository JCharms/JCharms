import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

/**
 * Repository-layer helpers. Everything DB-related funnels through src/data/* —
 * components and hooks call these repos, never supabase.from(...) directly, so
 * a backend swap has a one-folder blast radius (spec §3b).
 */

/**
 * Turn a Postgres error into something the shop owner can act on.
 *
 * These messages land in a toast in front of a non-technical user, and
 * "duplicate key value violates unique constraint categories_slug_key" tells
 * her nothing she can fix. Unrecognised codes keep the raw text — a confusing
 * message still beats swallowing the real cause.
 */
export function dbError(error: PostgrestError, context: string): Error {
  switch (error.code) {
    case '23505': // unique_violation
      return new Error(
        error.message.includes('slug')
          ? 'Something with that name already exists — try a slightly different name.'
          : 'That already exists.',
      )
    case '23514': // check_violation
      return new Error("Some of those values aren't allowed — please check the numbers.")
    case '23503': // foreign_key_violation
      return new Error("That's still being used elsewhere, so it can't be removed yet.")
    case '42501': // insufficient_privilege — RLS refused the write
      return new Error('You don\'t have permission to do that. Try signing in again.')
    default:
      return new Error(`[${context}] ${error.message}`)
  }
}

/** Unwrap a Supabase single-object result, throwing a readable error. */
export function unwrap<T>(
  result: { data: T | null; error: PostgrestError | null },
  context: string,
): T {
  if (result.error) throw dbError(result.error, context)
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
  if (result.error) throw dbError(result.error, context)
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
