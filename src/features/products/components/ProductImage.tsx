import { useState } from 'react'
import { BUCKET, storageUrl } from '@/data/_helpers'
import { cn } from '@/lib/cn'
import type { ProductImage as ProductImageRow } from '@/types/database'

/**
 * Renders a product photo, gracefully degrading to a warm branded placeholder
 * tile when the image is flagged `is_placeholder` or fails to load.
 *
 * TODO: replace placeholder images once client sends real photos — flip
 * is_placeholder to false in the admin gallery after uploading.
 */
export function ProductImage({
  image,
  path,
  isPlaceholder,
  alt,
  name,
  className,
}: {
  /** Full product_images row (preferred on catalogue surfaces). */
  image?: ProductImageRow | null
  /** …or a bare storage path (e.g. a persisted cart line). */
  path?: string | null
  isPlaceholder?: boolean
  alt?: string
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const storagePath = image?.storage_path ?? path ?? null
  const placeholderFlag = image ? image.is_placeholder : (isPlaceholder ?? false)
  const showPlaceholder = !storagePath || placeholderFlag || failed

  if (showPlaceholder) {
    return (
      <div
        role="img"
        aria-label={`${name} — photo coming soon`}
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-pink-100 via-ivory-200 to-marigold-100',
          className,
        )}
      >
        <span className="px-4 text-center font-display text-sm text-indigo-300">
          photo coming soon
        </span>
      </div>
    )
  }

  return (
    <img
      src={storageUrl(BUCKET.productImages, storagePath)}
      alt={image?.alt_text ?? alt ?? name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  )
}
