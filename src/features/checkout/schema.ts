import { z } from 'zod'

/** Checkout contact + shipping validation. Indian pincode = 6 digits. */
export const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Please enter your name'),
  customerEmail: z.string().email('Enter a valid email'),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  line1: z.string().min(3, 'Address is required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  customerNote: z.string().max(500).optional(),
  createAccount: z.boolean().optional(),
  password: z.string().optional(),
}).refine(
  (data) => !data.createAccount || (data.password?.length ?? 0) >= 6,
  { message: 'Password must be at least 6 characters', path: ['password'] },
)

export type CheckoutFormValues = z.infer<typeof checkoutSchema>
