import { z } from 'zod'

/** Admin product form. Numbers are coerced from string inputs. */
export const productSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z.string().min(2, 'Slug is required'),
  category_id: z.string().uuid().nullable().or(z.literal('')).transform((v) => v || null),
  short_description: z.string().max(160).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  base_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  compare_at_price: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  purchase_mode: z.enum(['direct', 'dm_only']),
  stock_type: z.enum(['ready_stock', 'made_to_order']),
  stock_quantity: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
  is_customizable: z.boolean(),
  processing_min_days: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
  processing_max_days: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.coerce.number().int().default(0),
})

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
