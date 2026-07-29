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

// ── Downscaling ─────────────────────────────────────────────────────────────

/**
 * Longest edge kept when a photo is re-encoded for upload.
 *
 * 1600px is comfortably more than any surface asks for — the largest is the
 * product page gallery at roughly 560 CSS px, so this still has headroom for a
 * 2x retina screen — while turning a ~4MB phone photo into ~200-300KB.
 */
export const MAX_IMAGE_EDGE = 1600

/** 0.82 is the usual sweet spot: no visible artefacts on a photo, big saving. */
const ENCODE_QUALITY = 0.82

/**
 * Canvas silently falls back to PNG when asked for a format it can't encode,
 * and a PNG of a photograph is far *larger* than the JPEG we started with.
 * So probe once and only ask for WebP if the browser really produces it.
 */
let encodeType: 'image/webp' | 'image/jpeg' | undefined
function outputType(): 'image/webp' | 'image/jpeg' {
  if (!encodeType) {
    const probe = document.createElement('canvas')
    probe.width = 1
    probe.height = 1
    encodeType = probe.toDataURL('image/webp').startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg'
  }
  return encodeType
}

/** Keep the extension honest with the bytes — the storage path is derived from it. */
function renameFor(name: string, type: string): string {
  const stem = name.replace(/\.[^.]+$/, '') || 'photo'
  return `${stem}.${type === 'image/webp' ? 'webp' : 'jpg'}`
}

/**
 * Shrink a photo in the browser before it is uploaded.
 *
 * Photos come straight off a phone at 3-5MB each. Stored as-is, every shopper
 * downloads that full file to render a thumbnail roughly 300px wide, which is
 * what made the shop grid stutter — and it burns through the Supabase egress
 * allowance at a startling rate. Re-encoding here fixes it at the source, once,
 * instead of on every page view.
 *
 * Best-effort by design: anything unexpected returns the original file, so a
 * browser quirk costs bandwidth but never costs the owner her upload.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  // A GIF would come back as a single frame — losing the animation is worse
  // than the bytes.
  if (file.type === 'image/gif') return file
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  let bitmap: ImageBitmap
  try {
    // 'from-image' bakes in EXIF rotation; without it a portrait phone photo is
    // re-encoded on its side, since canvas ignores the orientation tag.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    try {
      bitmap = await createImageBitmap(file)
    } catch {
      return file
    }
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const type = outputType()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, ENCODE_QUALITY),
    )
    // Re-encoding an already-small, already-optimised image can make it bigger.
    if (!blob || blob.size >= file.size) return file

    return new File([blob], renameFor(file.name, type), { type, lastModified: Date.now() })
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}
