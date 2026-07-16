/** Shared formatting helpers — currency, dates, order-number display. */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** ₹1,299 — no decimals for whole rupees, else two. */
export function formatINR(amount: number): string {
  return Number.isInteger(amount)
    ? INR.format(amount)
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
      }).format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Rupees → paise for Razorpay (amounts are stored as rupees in the DB). */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}
