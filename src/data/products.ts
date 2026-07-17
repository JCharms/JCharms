import { supabase } from '@/lib/supabaseClient'
import { unwrap, unwrapList } from './_helpers'
import { descendantIdsBySlug, rootAncestorOf } from '@/lib/categoryTree'
import { collectUpTo } from '@/lib/collect'
import type { Database, Product, TablesUpdate } from '@/types/database'
import type { ProductWithRelations } from '@/types/domain'

const PRODUCT_WITH_RELATIONS = `
  *,
  category:categories ( id, name, slug ),
  images:product_images ( * ),
  variants:product_variants ( * )
` as const

export interface ProductFilters {
  categorySlug?: string
  featuredOnly?: boolean
  search?: string
}

/** Public catalogue listing (active products only, RLS-enforced). */
export async function listProducts(
  filters: ProductFilters = {},
): Promise<ProductWithRelations[]> {
  let query = supabase
    .from('products')
    .select(PRODUCT_WITH_RELATIONS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (filters.featuredOnly) query = query.eq('is_featured', true)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)
  if (filters.categorySlug) {
    // A parent category must show everything beneath it: products are usually
    // assigned to a leaf ("Keychains"), so filtering on the parent's own id
    // alone ("Crochet") would wrongly return nothing.
    const { data: cats, error } = await supabase
      .from('categories')
      .select('id, slug, parent_id')
      .eq('is_active', true)
    if (error) throw new Error(`[listProducts.categories] ${error.message}`)

    const ids = descendantIdsBySlug(cats ?? [], filters.categorySlug)
    if (ids.length === 0) return [] // unknown or inactive category
    query = query.in('category_id', ids)
  }

  return normalizeList(unwrapList(await query, 'listProducts'), {
    dropPlaceholders: true,
  })
}

export async function listFeaturedProducts(): Promise<ProductWithRelations[]> {
  return listProducts({ featuredOnly: true })
}

/**
 * "You might also like" for a product page.
 *
 * Widens the net in relevance order, stopping as soon as it has enough:
 *
 *   1. the same category — closest match;
 *   2. the whole top-level family it belongs to (a leaf like "Keychains" may
 *      hold nothing but the product being looked at, which is the common case
 *      for a small handmade shop);
 *   3. featured picks — the owner's own choices;
 *   4. anything else active, so the section still fills on a young catalogue.
 *
 * Each step only runs if the previous ones came up short, so the usual path is
 * a single query. Returns fewer than `limit` (or none) rather than padding with
 * junk — the section hides itself when empty.
 */
export async function listRelatedProducts(
  productId: string,
  categorySlug: string | undefined,
  limit = 4,
): Promise<ProductWithRelations[]> {
  /** Everything under the top-level category this product belongs to. */
  const widerFamily = async (): Promise<ProductWithRelations[]> => {
    if (!categorySlug) return []
    const { data: cats } = await supabase
      .from('categories')
      .select('id, slug, parent_id')
      .eq('is_active', true)
    const root = rootAncestorOf(cats ?? [], categorySlug)
    if (!root?.slug || root.slug === categorySlug) return []
    return listProducts({ categorySlug: root.slug })
  }

  return collectUpTo(
    [
      () => (categorySlug ? listProducts({ categorySlug }) : Promise.resolve([])),
      widerFamily,
      listFeaturedProducts,
      () => listProducts(),
    ],
    { limit, exclude: [productId] },
  )
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_WITH_RELATIONS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw new Error(`[getProductBySlug] ${error.message}`)
  return data ? normalize(data, { dropPlaceholders: true }) : null
}

// Supabase returns nested relations that may be arrays/objects; keep the app's
// ProductWithRelations shape tidy and sorted here in the repo.
interface NormalizeOpts {
  /**
   * Storefront only: a placeholder row is a stand-in for "no photo yet". Once a
   * real photo exists, hide the placeholders — otherwise a seeded placeholder
   * sitting at sort_order 0 keeps winning `images[0]` and the card still reads
   * "photo coming soon" after the owner uploads a real picture.
   *
   * The admin gallery keeps them visible so they can be deleted.
   */
  dropPlaceholders?: boolean
}

function normalize(
  row: Record<string, unknown>,
  opts: NormalizeOpts = {},
): ProductWithRelations {
  const p = row as unknown as ProductWithRelations
  const sorted = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const real = sorted.filter((img) => !img.is_placeholder)
  return {
    ...p,
    images: opts.dropPlaceholders && real.length > 0 ? real : sorted,
    variants: [...(p.variants ?? [])]
      .filter((v) => v.is_active)
      .sort((a, b) => a.sort_order - b.sort_order),
  }
}
function normalizeList(
  rows: Record<string, unknown>[],
  opts: NormalizeOpts = {},
): ProductWithRelations[] {
  return rows.map((row) => normalize(row, opts))
}

// ── Admin ───────────────────────────────────────────────────────────────────
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type VariantInsert = Database['public']['Tables']['product_variants']['Insert']
type VariantUpdate = Database['public']['Tables']['product_variants']['Update']
type ImageInsert = Database['public']['Tables']['product_images']['Insert']

export async function adminListProducts(): Promise<ProductWithRelations[]> {
  return normalizeList(
    unwrapList(
      await supabase
        .from('products')
        .select(PRODUCT_WITH_RELATIONS)
        .order('sort_order', { ascending: true }),
      'adminListProducts',
    ),
  )
}

export async function adminGetProduct(id: string): Promise<ProductWithRelations> {
  return normalize(
    unwrap(
      await supabase.from('products').select(PRODUCT_WITH_RELATIONS).eq('id', id).single(),
      'adminGetProduct',
    ),
  )
}

export async function createProduct(input: ProductInsert): Promise<Product> {
  return unwrap(
    await supabase.from('products').insert(input).select().single(),
    'createProduct',
  )
}

export async function updateProduct(id: string, patch: ProductUpdate): Promise<Product> {
  return unwrap(
    await supabase.from('products').update(patch).eq('id', id).select().single(),
    'updateProduct',
  )
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(`[deleteProduct] ${error.message}`)
}

/** Convenience toggles used by the admin list row actions. */
export async function setProductFlag(
  id: string,
  flag: 'is_active' | 'is_featured',
  value: boolean,
): Promise<void> {
  const patch = { [flag]: value } as TablesUpdate<'products'>
  const { error } = await supabase.from('products').update(patch).eq('id', id)
  if (error) throw new Error(`[setProductFlag:${flag}] ${error.message}`)
}

// Variants
export async function createVariant(input: VariantInsert) {
  return unwrap(
    await supabase.from('product_variants').insert(input).select().single(),
    'createVariant',
  )
}
export async function updateVariant(id: string, patch: VariantUpdate) {
  return unwrap(
    await supabase.from('product_variants').update(patch).eq('id', id).select().single(),
    'updateVariant',
  )
}
export async function deleteVariant(id: string): Promise<void> {
  const { error } = await supabase.from('product_variants').delete().eq('id', id)
  if (error) throw new Error(`[deleteVariant] ${error.message}`)
}

// Images
export async function addProductImage(input: ImageInsert) {
  return unwrap(
    await supabase.from('product_images').insert(input).select().single(),
    'addProductImage',
  )
}
export async function deleteProductImage(id: string): Promise<void> {
  const { error } = await supabase.from('product_images').delete().eq('id', id)
  if (error) throw new Error(`[deleteProductImage] ${error.message}`)
}

/** Persist a new gallery order after drag-to-reorder. */
export async function reorderProductImages(
  ordered: { id: string; sort_order: number }[],
): Promise<void> {
  const results = await Promise.all(
    ordered.map((img) =>
      supabase.from('product_images').update({ sort_order: img.sort_order }).eq('id', img.id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(`[reorderProductImages] ${failed.error.message}`)
}
