import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useUIStore, type ToastTone } from '@/store/ui'
import { cn } from '@/lib/cn'

const TONE: Record<ToastTone, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-sage-400' },
  error: { icon: AlertCircle, cls: 'text-pink-600' },
  info: { icon: Info, cls: 'text-indigo' },
}

/** Fixed toast stack. Mounted once near the app root. */
export function Toaster() {
  const toasts = useUIStore((s) => s.toasts)
  const dismiss = useUIStore((s) => s.dismissToast)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => {
        const { icon: Icon, cls } = TONE[t.tone]
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full border border-ivory-300 bg-white px-4 py-3 shadow-lift animate-stitch-in"
          >
            <Icon size={18} className={cn('shrink-0', cls)} aria-hidden />
            <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="rounded-full p-1 text-ink-faint hover:bg-ivory-200 hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
