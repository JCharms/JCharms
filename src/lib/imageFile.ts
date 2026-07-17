/**
 * Client-side image upload rules.
 *
 * Mirrors the limits set on the storage buckets (migration 0901). Enforcing
 * them here as well isn't redundant: without it the owner uploads a 12MB photo,
 * waits for the whole thing to transfer, and gets a raw storage error back.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/** Returns a human-readable problem with the file, or null when it's fine. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `“${file.name}” isn't a supported image — please use a JPG, PNG, WEBP or GIF.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `“${file.name}” is ${formatMb(file.size)}. Please use an image under ${formatMb(
      MAX_IMAGE_BYTES,
    )} — most phones can resize when you share.`
  }
  return null
}

/** First problem across a batch, or null when every file is fine. */
export function validateImageFiles(files: File[]): string | null {
  for (const file of files) {
    const problem = validateImageFile(file)
    if (problem) return problem
  }
  return null
}
