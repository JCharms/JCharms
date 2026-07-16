import type { Category } from '@/types/database'

/**
 * Category hierarchy helpers.
 *
 * Categories nest via `parent_id`. Several surfaces need a *consistent* notion
 * of that hierarchy — the shop's category filter (a parent must include the
 * products of its children), the admin dropdown (parents grouped with their
 * children), and the nav. Keeping the logic here means they can't drift apart.
 */

/** Minimal shape these helpers need — works with full rows or slim selects. */
export interface CategoryNode {
  id: string
  parent_id: string | null
  slug?: string
}

/**
 * Every id in the subtree rooted at `rootId`, including `rootId` itself.
 *
 * Walks breadth-first and guards against cycles, so a malformed parent chain
 * can never hang the page.
 */
export function descendantIds<T extends CategoryNode>(
  categories: T[],
  rootId: string,
): string[] {
  const childrenByParent = new Map<string, T[]>()
  for (const cat of categories) {
    if (!cat.parent_id) continue
    const list = childrenByParent.get(cat.parent_id)
    if (list) list.push(cat)
    else childrenByParent.set(cat.parent_id, [cat])
  }

  const collected = new Set<string>([rootId])
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const child of childrenByParent.get(current) ?? []) {
      if (collected.has(child.id)) continue // cycle guard
      collected.add(child.id)
      queue.push(child.id)
    }
  }
  return [...collected]
}

/** Same as descendantIds but keyed by slug. Returns [] when the slug is unknown. */
export function descendantIdsBySlug<T extends CategoryNode>(
  categories: T[],
  slug: string,
): string[] {
  const root = categories.find((c) => c.slug === slug)
  return root ? descendantIds(categories, root.id) : []
}

/** True when `categorySlug` is `rootSlug` or any of its descendants. */
export function isSlugWithin<T extends CategoryNode>(
  categories: T[],
  rootSlug: string,
  categorySlug: string | undefined,
): boolean {
  if (!categorySlug) return false
  if (rootSlug === categorySlug) return true
  const ids = descendantIdsBySlug(categories, rootSlug)
  const target = categories.find((c) => c.slug === categorySlug)
  return !!target && ids.includes(target.id)
}

/**
 * The top-level ancestor of `slug` (itself, if already top-level). Lets the shop
 * keep the parent tab highlighted while a child category is selected.
 */
export function rootAncestorOf<T extends CategoryNode>(
  categories: T[],
  slug: string,
): T | undefined {
  let node = categories.find((c) => c.slug === slug)
  const guard = new Set<string>()
  while (node?.parent_id) {
    if (guard.has(node.id)) break // cycle guard
    guard.add(node.id)
    const parent = categories.find((c) => c.id === node!.parent_id)
    if (!parent) break
    node = parent
  }
  return node
}

/**
 * Readable trail for a category, e.g. "Crochet › Keychains" — so the admin can
 * see at a glance which main category a product actually sits under.
 */
export function categoryPath(categories: Category[], id: string | null): string | null {
  if (!id) return null
  const names: string[] = []
  let node = categories.find((c) => c.id === id)
  const guard = new Set<string>()
  while (node) {
    if (guard.has(node.id)) break // cycle guard
    guard.add(node.id)
    names.unshift(node.name)
    node = node.parent_id ? categories.find((c) => c.id === node!.parent_id) : undefined
  }
  return names.length > 0 ? names.join(' › ') : null
}

export interface CategoryOption extends Category {
  depth: number
}

/**
 * Categories flattened into a stable, human-readable order: each top-level
 * category immediately followed by its children (recursively), every level
 * sorted by sort_order then name.
 *
 * This is what fixes the "jumbled dropdown" — sorting by sort_order alone
 * interleaves parents and children, because their sort values are independent.
 */
export function flattenCategoryHierarchy(categories: Category[]): CategoryOption[] {
  const byParent = new Map<string | null, Category[]>()
  for (const cat of categories) {
    const key = cat.parent_id
    const list = byParent.get(key)
    if (list) list.push(cat)
    else byParent.set(key, [cat])
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  }

  const out: CategoryOption[] = []
  const seen = new Set<string>()
  const walk = (parentId: string | null, depth: number) => {
    for (const cat of byParent.get(parentId) ?? []) {
      if (seen.has(cat.id)) continue // cycle guard
      seen.add(cat.id)
      out.push({ ...cat, depth })
      walk(cat.id, depth + 1)
    }
  }
  walk(null, 0)

  // Any orphan (parent was deleted mid-session) still deserves to be listed.
  for (const cat of categories) {
    if (!seen.has(cat.id)) out.push({ ...cat, depth: 0 })
  }
  return out
}
