import { cn } from '@/lib/cn'

/**
 * The J Charms signature: a hand-stitched running-stitch thread, drawn as SVG.
 * Used deliberately (not everywhere) — as a section divider and accent line.
 * Honors prefers-reduced-motion via the global CSS reset.
 */
export function RunningStitch({
  className,
  color = 'currentColor',
  animate = true,
}: {
  className?: string
  color?: string
  animate?: boolean
}) {
  return (
    <svg
      viewBox="0 0 240 8"
      preserveAspectRatio="none"
      className={cn('h-2 w-full', className)}
      aria-hidden
    >
      <line
        x1="2"
        y1="4"
        x2="238"
        y2="4"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="10 8"
        className={animate ? 'animate-stitch-draw' : undefined}
      />
    </svg>
  )
}
