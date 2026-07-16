import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Accessible modal dialog: backdrop, Escape to close, focus moved in on open,
 * scroll lock. Used for cart drawer content, admin forms, confirmations.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const maxW = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative w-full rounded-t-2xl bg-ivory shadow-lift outline-none sm:rounded-2xl',
          'max-h-[90vh] overflow-y-auto animate-stitch-in',
          maxW,
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-ivory-300 px-5 py-4">
            <h2 className="font-display text-xl text-indigo">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-full p-1.5 text-ink-muted transition hover:bg-ivory-300 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
