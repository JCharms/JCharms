import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-pink text-white shadow-soft hover:bg-pink-500 hover:shadow-lift active:bg-pink-600',
  secondary:
    'bg-indigo text-ivory shadow-soft hover:bg-indigo-600 active:bg-indigo-700',
  outline:
    'border border-indigo-200 text-indigo bg-transparent hover:bg-indigo-50 active:bg-indigo-100',
  ghost: 'text-indigo hover:bg-indigo-50 active:bg-indigo-100',
  danger: 'bg-pink-700 text-white hover:bg-pink-600 active:bg-pink-700',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  fullWidth?: boolean
}

/**
 * The one button in the system. Every CTA pulls from here so the pink/indigo
 * hierarchy, soft lift, and focus ring stay consistent across the app.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold transition-all',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
