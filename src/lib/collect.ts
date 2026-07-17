/**
 * Take from each source in turn until `limit` items are gathered.
 *
 * Sources are lazy on purpose: each one is only consulted if the ones before it
 * came up short, so the common case costs a single query. Duplicates and
 * anything in `exclude` are skipped, which is what stops a "you might also
 * like" rail from recommending the page you're already on.
 *
 * Returns fewer than `limit` rather than padding — callers decide whether a
 * short list is worth showing.
 */
export async function collectUpTo<T extends { id: string }>(
  sources: Array<() => Promise<T[]>>,
  { limit, exclude = [] }: { limit: number; exclude?: string[] },
): Promise<T[]> {
  const picked: T[] = []
  const seen = new Set<string>(exclude)

  for (const source of sources) {
    if (picked.length >= limit) break
    for (const item of await source()) {
      if (picked.length >= limit) break
      if (seen.has(item.id)) continue
      seen.add(item.id)
      picked.push(item)
    }
  }

  return picked
}
