import { cn } from '@/lib/cn'

/** Soft, rounded surface — the base for product cards, panels, admin blocks. */
export function Card({
  className,
  as: Tag = 'div',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: 'div' | 'article' | 'section' }) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-ivory-300/70 bg-white shadow-soft',
        className,
      )}
      {...props}
    />
  )
}
