import { z } from 'zod'

/**
 * A whole number typed into a text box.
 *
 * The empty box is the trap. `z.coerce.number()` runs `Number('')`, which is
 * `0` — so clearing the shipping fee would quietly save "₹0" and ship every
 * order free. Blank has to mean *missing*, not zero, so it's mapped to NaN and
 * rejected as a non-number.
 */
const wholeNumber = (
  label: string,
  { min, max, unit }: { min: number; max: number; unit: string },
) =>
  z.preprocess(
    (v) => {
      if (typeof v === 'number') return v
      if (typeof v !== 'string' || v.trim() === '') return NaN
      return Number(v.trim())
    },
    z
      .number({ invalid_type_error: `${label} is required — enter a number` })
      .int(`${label} must be a whole number`)
      .min(min, `${label} can't be less than ${min}`)
      .max(max, `${label} looks too large — use ${max} ${unit} or fewer`),
  )

/**
 * Admin settings form.
 *
 * Every field the owner can type into is checked here — the old form fed
 * `Number(e.target.value)` straight to the DB, so a cleared or mistyped fee
 * silently broke order totals.
 */
export const settingsSchema = z
  .object({
    shippingFee: wholeNumber('Shipping fee', { min: 0, max: 100_000, unit: 'rupees' }),
    freeShippingOver: wholeNumber('Free-shipping threshold', {
      min: 0,
      max: 1_000_000,
      unit: 'rupees',
    }),
    deliveryDaysMin: wholeNumber('The shortest delivery estimate', {
      min: 1,
      max: 180,
      unit: 'days',
    }),
    deliveryDaysMax: wholeNumber('The longest delivery estimate', {
      min: 1,
      max: 180,
      unit: 'days',
    }),
    returnsPolicy: z.string().trim().max(1500, 'Please keep this under 1500 characters'),
    instagramHandle: z
      .string()
      .trim()
      .min(1, 'Instagram handle is required')
      .regex(
        /^[A-Za-z0-9._]+$/,
        'Just the username — no @, spaces or link (e.g. j_.charms)',
      ),
    supportEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
    supportPhone: z.union([
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    ]),
    announcementEnabled: z.boolean(),
    announcementText: z.string().trim().max(160, 'Keep the banner under 160 characters'),
    storeOpen: z.boolean(),
  })
  .refine((v) => v.deliveryDaysMax >= v.deliveryDaysMin, {
    message: 'The longest estimate must be at least the shortest',
    path: ['deliveryDaysMax'],
  })
  // An enabled banner with no text renders an empty indigo bar across the site.
  .refine((v) => !v.announcementEnabled || v.announcementText.length > 0, {
    message: 'Add some text, or switch the banner off',
    path: ['announcementText'],
  })

export type SettingsFormValues = z.infer<typeof settingsSchema>
