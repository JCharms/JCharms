/**
 * Lazily injects the Razorpay Checkout script exactly once, resolving when the
 * global `Razorpay` constructor is available. Kept isolated here so the rest of
 * the app never touches the vendor script tag directly.
 */
const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

let loaderPromise: Promise<void> | null = null

export function loadRazorpay(): Promise<void> {
  if (typeof window !== 'undefined' && 'Razorpay' in window) {
    return Promise.resolve()
  }
  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = RAZORPAY_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loaderPromise = null
      reject(new Error('Failed to load Razorpay checkout script.'))
    }
    document.body.appendChild(script)
  })
  return loaderPromise
}

/** Minimal shape of the Razorpay options we use. */
export interface RazorpayOptions {
  key: string
  amount: number // in paise
  currency: 'INR'
  name: string
  description?: string
  order_id: string
  prefill?: { name?: string; email?: string; contact?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  handler: (response: RazorpayPaymentResponse) => void
  modal?: { ondismiss?: () => void }
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open: () => void
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

export function openRazorpayCheckout(options: RazorpayOptions): void {
  const rzp = new window.Razorpay(options)
  rzp.open()
}
