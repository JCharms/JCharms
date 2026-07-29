import { supabase } from '@/lib/supabaseClient'
import { compressImageForUpload } from '@/lib/imageFile'
import { BUCKET } from './_helpers'

/**
 * Storage repository — uploads for the admin (product photos, review
 * screenshots). RLS on storage.objects restricts writes to admins; the browser
 * anon key can still perform the upload because the admin is authenticated.
 *
 * Every image goes through `compressImageForUpload` here rather than at the
 * call sites: this is the one door into the bucket, so nothing can be added
 * later that quietly stores a 5MB original again.
 */
function uniquePath(prefix: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const rand = crypto.randomUUID()
  return `${prefix}/${rand}.${ext}`
}

/**
 * A year. Safe because paths are random UUIDs and never reused (`upsert:
 * false`) — an image at a given path can never change, so a browser holding
 * onto it forever can never be wrong. Editing a photo means uploading a new
 * one at a new path.
 */
const IMMUTABLE_CACHE_SECONDS = '31536000'

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const upload = await compressImageForUpload(file)
  const path = uniquePath(productId, upload)
  const { error } = await supabase.storage
    .from(BUCKET.productImages)
    .upload(path, upload, { cacheControl: IMMUTABLE_CACHE_SECONDS, upsert: false })
  if (error) throw new Error(`[uploadProductImage] ${error.message}`)
  return path
}

export async function uploadReviewScreenshot(file: File): Promise<string> {
  const upload = await compressImageForUpload(file)
  const path = uniquePath('reviews', upload)
  const { error } = await supabase.storage
    .from(BUCKET.reviewScreenshots)
    .upload(path, upload, { cacheControl: IMMUTABLE_CACHE_SECONDS, upsert: false })
  if (error) throw new Error(`[uploadReviewScreenshot] ${error.message}`)
  return path
}

export async function removeProductImageFile(path: string): Promise<void> {
  await supabase.storage.from(BUCKET.productImages).remove([path])
}

export async function removeReviewScreenshotFile(path: string): Promise<void> {
  await supabase.storage.from(BUCKET.reviewScreenshots).remove([path])
}
