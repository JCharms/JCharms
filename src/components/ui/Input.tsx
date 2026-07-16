import { forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'

const fieldBase =
  'w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2.5 text-ink placeholder:text-ink-faint ' +
  'transition focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-pink-500'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

/** Labelled text input wired for accessibility + React Hook Form. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(fieldBase, className)}
        {...props}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-pink-600">
          {error}
        </p>
      )}
    </div>
  )
})

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, className, id, ...props }, ref) {
    const generatedId = useId()
    const areaId = id ?? generatedId
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={areaId} className="block text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          aria-invalid={!!error}
          className={cn(fieldBase, 'min-h-[96px] resize-y', className)}
          {...props}
        />
        {error && <p className="text-xs font-medium text-pink-600">{error}</p>}
      </div>
    )
  },
)

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, id, children, ...props },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(fieldBase, 'pr-9', className)}
        {...props}
      >
        {children}
      </select>
      {hint && !error && (
        <p id={`${selectId}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${selectId}-error`} className="text-xs font-medium text-pink-600">
          {error}
        </p>
      )}
    </div>
  )
})
