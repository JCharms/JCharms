import { supabase } from '@/lib/supabaseClient'
import { unwrapList, unwrap } from './_helpers'
import type { Category } from '@/types/database'
import type { CategoryTree } from '@/types/domain'
import type { Database } from '@/types/database'

/** All active categories, sorted for display. */
export async function listCategories(): Promise<Category[]> {
  return unwrapList(
    await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    'listCategories',
  )
}

/** Active categories nested one level (top-level → children) for navigation. */
export async function listCategoryTree(): Promise<CategoryTree[]> {
  const all = await listCategories()
  const tops = all.filter((c) => c.parent_id === null)
  return tops.map((top) => ({
    ...top,
    children: all.filter((c) => c.parent_id === top.id),
  }))
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw new Error(`[getCategoryBySlug] ${error.message}`)
  return data
}

// ── Admin ───────────────────────────────────────────────────────────────────
type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryUpdate = Database['public']['Tables']['categories']['Update']

/**
 * All categories including inactive (admin view).
 *
 * Ordering here is per-level only — parents and children have independent
 * sort_order values, so callers that render a hierarchy must group by parent
 * (see flattenCategoryHierarchy) rather than trusting this flat order.
 */
export async function adminListCategories(): Promise<Category[]> {
  return unwrapList(
    await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    'adminListCategories',
  )
}

export async function createCategory(input: CategoryInsert): Promise<Category> {
  return unwrap(
    await supabase.from('categories').insert(input).select().single(),
    'createCategory',
  )
}

export async function updateCategory(
  id: string,
  patch: CategoryUpdate,
): Promise<Category> {
  return unwrap(
    await supabase.from('categories').update(patch).eq('id', id).select().single(),
    'updateCategory',
  )
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(`[deleteCategory] ${error.message}`)
}
