import { useState } from 'react'
import { BUCKET, storageImageUrl, storageUrl } from '@/data/_helpers'
import { useNearViewport } from '@/hooks/useNearViewport'
import { cn } from '@/lib/cn'
import type { ProductImage as ProductImageRow } from '@/types/database'

/**
 * Roughly how wide this photo is drawn, so we can ask for a sensibly sized file
 * rather than the full-resolution original. Two widths each: the second is the
 * retina one, offered via srcSet so the browser picks by pixel ratio.
 *
 * Only has an effect when image transformations are enabled (see
 * `storageImageUrl`); otherwise every entry resolves to the same original URL
 * and the srcSet is harmlessly redundant.
 */
const SIZES = {
  /** Cart lines, checkout summary, admin gallery tiles — 64-120 CSS px. */
  thumb: [160, 320],
  /** Shop + home grid cards — ~180 CSS px on a phone, ~300 on desktop. */
  card: [400, 800],
  /** The product page's main photo — up to ~560 CSS px. */
  hero: [720, 1440],
} as const

export type ProductImageSize = keyof typeof SIZES

export function ProductImage({
  image,
  path,
  isPlaceholder,
  alt,
  name,
  className,
  size = 'card',
  priority = false,
}: {
  /** Full product_images row (preferred on catalogue surfaces). */
  image?: ProductImageRow | null
  /** …or a bare storage path (e.g. a persisted cart line). */
  path?: string | null
  isPlaceholder?: boolean
  alt?: string
  name: string
  className?: string
  /** How large this is drawn — picks the file size requested. */
  size?: ProductImageSize
  /** Skip the preload gate for photos that are on screen at first paint. */
  priority?: boolean
}) {
  const storagePath = image?.storage_path ?? path ?? null
  const placeholderFlag = image ? image.is_placeholder : (isPlaceholder ?? false)

  if (!storagePath || placeholderFlag) {
    return <PhotoComingSoon name={name} className={className} />
  }

  return (
    <StoredPhoto
      // Remounts when the photo changes (clicking a gallery thumbnail), so the
      // loaded/failed state below can never be inherited from the previous one.
      key={storagePath}
      storagePath={storagePath}
      alt={image?.alt_text ?? alt ?? name}
      name={name}
      className={className}
      size={size}
      priority={priority}
    />
  )
}

/**
 * A real photo from Storage.
 *
 * The download is gated on the tile coming *near* the viewport rather than into
 * it, which is what stops a long grid arriving one blank card at a time — see
 * `useNearViewport`. Until the bytes land the frame holds its space in a soft
 * tint, so nothing shifts and nothing flashes white.
 */
function StoredPhoto({
  storagePath,
  alt,
  name,
  className,
  size,
  priority,
}: {
  storagePath: string
  alt: string
  name: string
  className?: string
  size: ProductImageSize
  priority: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  /** A transformed URL didn't load — fall back to the untransformed original. */
  const [untransformed, setUntransformed] = useState(false)
  /** The original didn't load either; there is nothing left to try. */
  const [failed, setFailed] = useState(false)
  const { ref, near } = useNearViewport<HTMLDivElement>(priority)

  if (failed) return <PhotoComingSoon name={name} className={className} />

  const [width, retinaWidth] = SIZES[size]
  const original = storageUrl(BUCKET.productImages, storagePath)
  const src = untransformed ? original : storageImageUrl(BUCKET.productImages, storagePath, width)
  const retina = untransformed
    ? original
    : storageImageUrl(BUCKET.productImages, storagePath, retinaWidth)
  // With resizing switched off both widths resolve to the same original, and a
  // srcSet of one URL twice is just noise in the markup.
  const srcSet = retina === src ? undefined : `${src} 1x, ${retina} 2x`

  return (
    <div ref={ref} className={cn('overflow-hidden bg-ivory-200', className)}>
      {near && (
        <img
          src={src}
          srcSet={srcSet}
          alt={alt}
          // Eager on purpose: the observer above already decided this is worth
          // fetching, and `lazy` would put the browser's own — much tighter —
          // threshold back in front of it.
          loading="eager"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => (untransformed ? setFailed(true) : setUntransformed(true))}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  )
}

/** Warm branded stand-in for "no photo yet" — and the last resort on failure. */
function PhotoComingSoon({ name, className }: { name: string; className?: string }) {
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
