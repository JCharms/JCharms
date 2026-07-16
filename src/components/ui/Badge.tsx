import { cn } from '@/lib/cn'

type Tone = 'pink' | 'marigold' | 'indigo' | 'sage' | 'neutral'

const TONES: Record<Tone, string> = {
  pink: 'bg-pink-100 text-pink-600',
  marigold: 'bg-marigold-100 text-marigold-500',
  indigo: 'bg-indigo-100 text-indigo',
  sage: 'bg-sage-100 text-sage-400',
  neutral: 'bg-ink-faint/15 text-ink-muted',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
