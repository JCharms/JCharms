import { z } from 'zod'

/** Optional numeric field: an empty box means "not set", not zero. */
const optionalNumber = (message: string) =>
  z.union([z.literal(''), z.coerce.number({ invalid_type_error: message })]).optional()

/**
 * Admin product form. Numbers are coerced from string inputs.
 *
 * Cross-field rules live in the refinements at the bottom — they catch the
 * mistakes that produce a nonsense product page rather than an error (a
 * was-price below the real price reads as a price *rise*; a dispatch window of
 * "8–3 days" renders literally).
 */
export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').max(120, 'That name is too long'),
    slug: z
      .string()
      .trim()
      .min(2, 'Web address is required')
      .max(120, 'That web address is too long')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use lowercase letters, numbers and hyphens only — e.g. strawberry-keychain',
      ),
    category_id: z.string().uuid().nullable().or(z.literal('')).transform((v) => v || null),
    short_description: z
      .string()
      .trim()
      .max(160, 'Keep this under 160 characters — it sits on the product card')
      .optional()
      .or(z.literal('')),
    description: z.string().max(5000, 'That description is very long').optional().or(z.literal('')),
    base_price: z.coerce
      .number({ invalid_type_error: 'Enter a price in rupees' })
      .min(0, 'Price must be 0 or more')
      .max(1_000_000, 'That price looks too large'),
    compare_at_price: z
      .union([
        z.literal(''),
        z.coerce
          .number({ invalid_type_error: 'Enter an amount in rupees' })
          .min(0, "Was-price can't be negative")
          .max(1_000_000, 'That price looks too large'),
      ])
      .optional(),
    purchase_mode: z.enum(['direct', 'dm_only']),
    stock_type: z.enum(['ready_stock', 'made_to_order']),
    stock_quantity: z
      .union([
        z.literal(''),
        z.coerce
          .number({ invalid_type_error: 'Enter a whole number' })
          .int('Enter a whole number')
          .min(0, "Stock can't be negative")
          .max(100_000, 'That quantity looks too large'),
      ])
      .optional(),
    is_customizable: z.boolean(),
    processing_min_days: optionalNumber('Enter a number of days').refine(
      (v) => v === '' || v === undefined || (Number.isInteger(v) && v >= 0 && v <= 365),
      'Enter a whole number of days (0–365)',
    ),
    processing_max_days: optionalNumber('Enter a number of days').refine(
      (v) => v === '' || v === undefined || (Number.isInteger(v) && v >= 0 && v <= 365),
      'Enter a whole number of days (0–365)',
    ),
    is_active: z.boolean(),
    is_featured: z.boolean(),
    sort_order: z.coerce
      .number({ invalid_type_error: 'Enter a whole number' })
      .int('Enter a whole number')
      .min(0, "Sort order can't be negative")
      .default(0),
  })
  // A price is required to sell on the site — but DM-only items never show one.
  .refine((v) => v.purchase_mode === 'dm_only' || v.base_price > 0, {
    message: 'Set a price, or switch this to “Enquire on Instagram”',
    path: ['base_price'],
  })
  .refine(
    (v) =>
      v.purchase_mode === 'dm_only' ||
      v.compare_at_price === '' ||
      v.compare_at_price === undefined ||
      v.compare_at_price > v.base_price,
    {
      message: 'The was-price must be higher than the price, or left blank',
      path: ['compare_at_price'],
    },
  )
  .refine(
    (v) =>
      v.processing_min_days === '' ||
      v.processing_min_days === undefined ||
      v.processing_max_days === '' ||
      v.processing_max_days === undefined ||
      v.processing_max_days >= v.processing_min_days,
    { message: 'The “to” days must be the same or more than “from”', path: ['processing_max_days'] },
  )

export type ProductFormValues = z.infer<typeof productSchema>

/** Normalise empty-string numerics to null for the DB payload. */
export function toProductPayload(v: ProductFormValues) {
  const num = (x: number | '' | undefined) => (x === '' || x === undefined ? null : x)
  return {
    name: v.name,
    slug: v.slug,
    category_id: v.category_id,
    short_description: v.short_description || null,
    description: v.description || null,
    base_price: v.base_price,
    compare_at_price: num(v.compare_at_price),
    purchase_mode: v.purchase_mode,
    stock_type: v.stock_type,
    stock_quantity: num(v.stock_quantity),
    is_customizable: v.is_customizable,
    processing_min_days: num(v.processing_min_days),
    processing_max_days: num(v.processing_max_days),
    is_active: v.is_active,
    is_featured: v.is_featured,
    sort_order: v.sort_order,
  }
}
