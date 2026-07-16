import type {
  Product,
  ProductImage,
  ProductVariant,
  Category,
  Order,
  OrderItem,
  ShippingAddress,
} from '@/types/database'

/**
 * Shared domain shapes composed from the DB row types. These describe how rows
 * are combined for the UI (e.g. a product with its images + variants), keeping
 * component props honest without duplicating field definitions.
 */

export type { ShippingAddress }

/** A product joined with the relations the storefront needs to render it. */
export interface ProductWithRelations extends Product {
  images: ProductImage[]
  variants: ProductVariant[]
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
}

/** A category plus its immediate children (for nested nav). */
export interface CategoryTree extends Category {
  children: Category[]
}

/** An order with its line items — used by admin + tracking + history. */
export interface OrderWithItems extends Order {
  items: OrderItem[]
}

/** Line item held in the persisted cart (Zustand). */
export interface CartLine {
  productId: string
  variantId: string | null
  name: string
  variantName: string | null
  slug: string
  unitPrice: number
  quantity: number
  imagePath: string | null
}

/** Contact + shipping details collected at checkout. */
export interface CheckoutDetails {
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: ShippingAddress
  customerNote?: string
}
