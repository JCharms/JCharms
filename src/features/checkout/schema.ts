import { z } from 'zod'
import { INDIAN_STATES } from '@/lib/indianStates'

/**
 * Checkout contact + shipping validation.
 *
 * These fields become a physical parcel and a payment receipt, so they're the
 * strictest forms on the site: a typo here surfaces days later as a failed
 * delivery. Rules are deliberately shaped to Indian addresses — 10-digit
 * mobiles starting 6–9, 6-digit pincodes that never start with 0, and a state
 * picked from a fixed list rather than typed.
 */

/** People paste numbers in every shape: "+91 98765 43210", "098765-43210". */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, '').replace(/^(\+91|91|0)/, ''))
  .pipe(
    z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  )

/**
 * Letters, spaces and the punctuation real names contain — but not digits.
 *
 * `\p{M}` matters: Indic scripts write vowels as combining marks, so "आन्या"
 * is letters *plus* marks. Without it this rejects a large share of the names
 * this shop actually ships to.
 */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u

const personName = z
  .string()
  .trim()
  .min(2, 'Please enter your full name')
  .max(80, 'That name is too long')
  .regex(NAME_PATTERN, 'Use letters only — no numbers or symbols')

const cityName = z
  .string()
  .trim()
  .min(2, 'City is required')
  .max(60, 'That city name is too long')
  .regex(NAME_PATTERN, 'Use letters only — no numbers or symbols')

export const checkoutSchema = z
  .object({
    customerName: personName,
    customerEmail: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email, e.g. you@gmail.com')
      .max(120, 'That email is too long'),
    customerPhone: phone,
    line1: z
      .string()
      .trim()
      .min(5, 'Please include house/flat number and street')
      .max(120, 'Please shorten this — use line 2 for the rest'),
    line2: z.string().trim().max(120, 'Please shorten this').optional(),
    city: cityName,
    // An enum, not a string: this is what let "abc" through as a state.
    state: z.enum(INDIAN_STATES, {
      errorMap: () => ({ message: 'Please choose your state from the list' }),
    }),
    pincode: z
      .string()
      .trim()
      .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode'),
    customerNote: z.string().trim().max(500, 'Please keep this under 500 characters').optional(),
    createAccount: z.boolean().optional(),
    password: z.string().optional(),
  })
  .refine((data) => !data.createAccount || (data.password?.length ?? 0) >= 6, {
    message: 'Password must be at least 6 characters',
    path: ['password'],
  })

export type CheckoutFormValues = z.infer<typeof checkoutSchema>
