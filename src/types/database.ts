/**
 * Canonical database types barrel.
 *
 * The raw contract lives in `database.generated.ts`, produced verbatim by:
 *
 *     npm run db:types      # supabase gen types typescript --local
 *
 * Never hand-edit the generated file — regenerate it after every migration.
 * This barrel re-exports it and adds the convenience aliases the app uses, so
 * regeneration never clobbers hand-owned code and imports stay stable.
 */
export type { Database, Json } from './database.generated'
import type { Database } from './database.generated'

// Generic helpers mirroring Supabase's own convention.
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// ── Row aliases ─────────────────────────────────────────────────────────────
export type Category = Tables<'categories'>
export type Product = Tables<'products'>
export type ProductVariant = Tables<'product_variants'>
export type ProductImage = Tables<'product_images'>
export type SiteSetting = Tables<'site_settings'>
export type Order = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type Review = Tables<'reviews'>

// ── Enum aliases ────────────────────────────────────────────────────────────
export type PurchaseMode = Enums<'purchase_mode'>
export type StockType = Enums<'stock_type'>
export type OrderStatus = Enums<'order_status'>
export type PaymentStatus = Enums<'payment_status'>

// ── Shapes for JSONB columns (kept in sync with checkout/edge-fn payloads) ──
export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
}
