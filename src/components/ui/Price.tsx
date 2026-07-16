import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'

/**
 * Prices render in the mono face — a little handmade price tag (spec §7).
 * Pass `compareAt` to show a struck-through original beside the current price.
 */
export function Price({
  amount,
  compareAt,
  className,
  size = 'md',
}: {
  amount: number
  compareAt?: number | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeCls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={cn('inline-flex items-baseline gap-2 font-mono tabular', className)}>
      <span className={cn('font-semibold text-indigo', sizeCls)}>{formatINR(amount)}</span>
      {compareAt != null && compareAt > amount && (
        <span className="text-sm text-ink-faint line-through">{formatINR(compareAt)}</span>
      )}
    </span>
  )
}
