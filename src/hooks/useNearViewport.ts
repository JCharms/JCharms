import { useEffect, useRef, useState } from 'react'

/**
 * How far beyond the viewport counts as "coming up soon".
 *
 * This is the scroll-smoothness dial. Native `loading="lazy"` starts a download
 * only as a tile is about to appear, so on a 45-product grid every new row
 * arrives blank and fills in under you. 1200px is roughly one-and-a-half phone
 * screens of run-up — enough that a normal scroll always lands on pictures that
 * are already there, without pulling the whole catalogue down at once.
 *
 * Raise it to buy more headroom on slow connections; lower it to save data.
 */
export const PRELOAD_MARGIN = '1200px 0px'

/**
 * Tells you when an element has come within `PRELOAD_MARGIN` of the viewport,
 * and stays true from then on — this gates *starting* a download, so there is
 * nothing to undo once it has begun.
 *
 * `alwaysReady` opts a specific element out entirely (the first few cards in a
 * grid, which are on screen at first paint and shouldn't wait for an observer
 * callback to even begin).
 */
export function useNearViewport<T extends Element>(alwaysReady = false) {
  const ref = useRef<T | null>(null)
  const [near, setNear] = useState(alwaysReady)

  useEffect(() => {
    if (near) return
    if (alwaysReady) {
      setNear(true)
      return
    }

    const el = ref.current
    if (!el) return
    // No observer (very old browser, or a test environment) — degrade to
    // loading everything rather than showing empty frames forever.
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [near, alwaysReady])

  return { ref, near }
}
