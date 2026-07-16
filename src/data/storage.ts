import { supabase } from '@/lib/supabaseClient'
import { BUCKET } from './_helpers'

/**
 * Storage repository — uploads for the admin (product photos, review
 * screenshots). RLS on storage.objects restricts writes to admins; the browser
 * anon key can still perform the upload because the admin is authenticated.
 */
function uniquePath(prefix: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const rand = crypto.randomUUID()
  return `${prefix}/${rand}.${ext}`
}

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const path = uniquePath(productId, file)
  const { error } = await supabase.storage
    .from(BUCKET.productImages)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw new Error(`[uploadProductImage] ${error.message}`)
  return path
}

export async function uploadReviewScreenshot(file: File): Promise<string> {
  const path = uniquePath('reviews', file)
  const { error } = await supabase.storage
    .from(BUCKET.reviewScreenshots)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw new Error(`[uploadReviewScreenshot] ${error.message}`)
  return path
}

export async function removeProductImageFile(path: string): Promise<void> {
  await supabase.storage.from(BUCKET.productImages).remove([path])
}

export async function removeReviewScreenshotFile(path: string): Promise<void> {
  await supabase.storage.from(BUCKET.reviewScreenshots).remove([path])
}
