import { Check } from 'lucide-react'
import { FULFILLMENT_STEPS, ORDER_STATUS_LABEL } from '@/data/orderStateMachine'
import type { OrderStatus } from '@/types/database'
import { cn } from '@/lib/cn'

/** Horizontal progress of an order through the fulfillment steps. */
export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="rounded-lg bg-ink-faint/10 px-4 py-3 text-sm font-medium text-ink-muted">
        This order was cancelled.
      </div>
    )
  }

  const currentIndex = FULFILLMENT_STEPS.indexOf(status)

  return (
    <ol className="flex items-center">
      {FULFILLMENT_STEPS.map((step, i) => {
        const done = i <= currentIndex
        const isLast = i === FULFILLMENT_STEPS.length - 1
        return (
          <li key={step} className={cn('flex items-center', !isLast && 'flex-1')}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition',
                  done
                    ? 'border-pink bg-pink text-white'
                    : 'border-ivory-300 bg-white text-ink-faint',
                )}
              >
                {done ? <Check size={15} /> : i + 1}
              </span>
              <span className={cn('text-[11px]', done ? 'text-indigo' : 'text-ink-faint')}>
                {ORDER_STATUS_LABEL[step]}
              </span>
            </div>
            {!isLast && (
              <span
                className={cn(
                  'mx-1 h-0.5 flex-1 rounded',
                  i < currentIndex ? 'bg-pink' : 'bg-ivory-300',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
