import { useEffect, useState } from 'react'
import { Plus, Trash2, Check, X, FolderTree, CornerDownRight } from 'lucide-react'
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './hooks'
import { Card, Button, Input, LoadingBlock } from '@/components/ui'
import { slugify } from '@/lib/slug'
import { toast } from '@/store/ui'
import type { Category } from '@/types/database'

/**
 * Category manager.
 *
 * Two levels: main categories (e.g. "Crochet") and subcategories beneath them
 * (e.g. "Keychains"). Products usually live in a subcategory and automatically
 * appear under the parent in the shop too — the copy here says so, because that
 * relationship is the thing that confuses people most.
 */
export function CategoriesManager() {
  const { data: categories, isLoading } = useAdminCategories()
  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory()
  const deleteCat = useDeleteCategory()

  const [newMain, setNewMain] = useState('')
  const [addingUnder, setAddingUnder] = useState<string | null>(null)

  if (isLoading) return <LoadingBlock />

  const all = categories ?? []
  const byOrder = (a: Category, b: Category) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  const tops = all.filter((c) => !c.parent_id).sort(byOrder)

  /** Append to the end of its level so new entries don't jump to the front. */
  const nextSortOrder = (parentId: string | null) => {
    const siblings = all.filter((c) => c.parent_id === parentId)
    return siblings.length === 0
      ? 0
      : Math.max(...siblings.map((s) => s.sort_order)) + 1
  }

  /**
   * Category slugs are unique across the whole table, so "Bows" under Crochet
   * and "Bows" under Hair Accessories collide. Say that in words rather than
   * letting Postgres reject the insert.
   */
  function slugProblem(name: string, ignoreId?: string): string | null {
    const slug = slugify(name)
    if (!slug) return 'Please use at least one letter or number in the name.'
    const clash = all.find((c) => c.slug === slug && c.id !== ignoreId)
    if (!clash) return null
    return `“${clash.name}” already uses that web address. Try a more specific name.`
  }

  function addMain() {
    const name = newMain.trim()
    if (!name) return
    const problem = slugProblem(name)
    if (problem) return toast.error(problem)
    createCat.mutate(
      { name, slug: slugify(name), parent_id: null, sort_order: nextSortOrder(null) },
      { onSuccess: () => setNewMain('') },
    )
  }

  function addSub(parentId: string, name: string) {
    const clean = name.trim()
    if (!clean) return
    const problem = slugProblem(clean)
    if (problem) return toast.error(problem)
    createCat.mutate(
      {
        name: clean,
        slug: slugify(clean),
        parent_id: parentId,
        sort_order: nextSortOrder(parentId),
      },
      { onSuccess: () => setAddingUnder(null) },
    )
  }

  function rename(category: Category, name: string) {
    const problem = slugProblem(name, category.id)
    if (problem) return toast.error(problem)
    updateCat.mutate({ id: category.id, patch: { name, slug: slugify(name) } })
  }

  return (
    <div className="space-y-5">
      <Card className="flex items-start gap-3 border-indigo-100 bg-indigo-50/50 p-4 text-sm text-ink-muted">
        <FolderTree size={18} className="mt-0.5 shrink-0 text-indigo" />
        <p>
          <strong className="text-indigo">Main categories</strong> appear in the shop
          menu. <strong className="text-indigo">Subcategories</strong> sit inside them.
          A product in a subcategory shows under that subcategory <em>and</em> its main
          category — so “Keychains” products also appear under “Crochet”.
        </p>
      </Card>

      {/* Add a main category */}
      <Card className="flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Add a main category"
            value={newMain}
            onChange={(e) => setNewMain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMain()}
            placeholder="e.g. Crochet"
          />
        </div>
        <Button onClick={addMain} isLoading={createCat.isPending} disabled={!newMain.trim()}>
          <Plus size={16} /> Add
        </Button>
      </Card>

      {tops.length === 0 && (
        <Card className="p-10 text-center text-sm text-ink-muted">
          No categories yet — add your first main category above.
        </Card>
      )}

      {tops.map((top) => {
        const children = all.filter((c) => c.parent_id === top.id).sort(byOrder)
        return (
          <Card key={top.id} className="p-5">
            <CategoryRow
              category={top}
              isMain
              onRename={(name) => rename(top, name)}
              onToggleActive={(is_active) => updateCat.mutate({ id: top.id, patch: { is_active } })}
              onDelete={() =>
                confirm(
                  children.length > 0
                    ? `Delete "${top.name}"? Its ${children.length} subcategor${children.length === 1 ? 'y' : 'ies'} will become main categories, and its products will be left uncategorised.`
                    : `Delete "${top.name}"? Its products will be left uncategorised.`,
                ) && deleteCat.mutate(top.id)
              }
            />

            <div className="mt-2 space-y-1 border-l-2 border-ivory-300 pl-4">
              {children.map((child) => (
                <CategoryRow
                  key={child.id}
                  category={child}
                  onRename={(name) => rename(child, name)}
                  onToggleActive={(is_active) =>
                    updateCat.mutate({ id: child.id, patch: { is_active } })
                  }
                  onDelete={() =>
                    confirm(`Delete "${child.name}"? Its products will be left uncategorised.`) &&
                    deleteCat.mutate(child.id)
                  }
                />
              ))}

              {addingUnder === top.id ? (
                <SubCategoryInput
                  onCancel={() => setAddingUnder(null)}
                  onSubmit={(name) => addSub(top.id, name)}
                  isSaving={createCat.isPending}
                />
              ) : (
                <button
                  onClick={() => setAddingUnder(top.id)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-pink-600 hover:bg-pink-50"
                >
                  <Plus size={13} /> Add subcategory to {top.name}
                </button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function SubCategoryInput({
  onSubmit,
  onCancel,
  isSaving,
}: {
  onSubmit: (name: string) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [value, setValue] = useState('')
  return (
    <div className="flex items-center gap-2 py-1">
      <CornerDownRight size={14} className="shrink-0 text-ink-faint" />
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(value)
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Subcategory name, e.g. Keychains"
        className="flex-1 rounded-lg border border-ivory-300 px-2 py-1.5 text-sm focus:border-pink focus:outline-none"
      />
      <Button size="sm" onClick={() => onSubmit(value)} isLoading={isSaving} disabled={!value.trim()}>
        Add
      </Button>
      <button onClick={onCancel} aria-label="Cancel" className="rounded-lg p-1.5 text-ink-faint hover:bg-ivory-200">
        <X size={15} />
      </button>
    </div>
  )
}

function CategoryRow({
  category,
  isMain,
  onRename,
  onToggleActive,
  onDelete,
}: {
  category: Category
  isMain?: boolean
  onRename: (name: string) => void
  onToggleActive: (isActive: boolean) => void
  onDelete: () => void
}) {
  const [value, setValue] = useState(category.name)
  // Re-sync if the row is refetched (e.g. renamed in another tab).
  useEffect(() => setValue(category.name), [category.name])

  const dirty = value.trim() !== category.name && value.trim().length > 0

  return (
    <div className="flex items-center gap-2 py-1">
      {!isMain && <CornerDownRight size={14} className="shrink-0 text-ink-faint" />}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && dirty) onRename(value.trim())
        }}
        aria-label={`${category.name} name`}
        className={`flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 hover:border-ivory-300 focus:border-pink focus:outline-none ${
          isMain ? 'font-display text-lg text-indigo' : 'text-sm text-ink'
        }`}
      />

      {dirty && (
        <button
          onClick={() => onRename(value.trim())}
          className="inline-flex items-center gap-1 rounded-lg bg-pink px-2 py-1 text-xs font-semibold text-white"
        >
          <Check size={12} /> Save
        </button>
      )}

      <label
        className="flex shrink-0 items-center gap-1 text-xs text-ink-muted"
        title={
          category.is_active
            ? 'Showing in the shop — untick to hide it and everything inside it'
            : 'Hidden from the shop'
        }
      >
        <input
          type="checkbox"
          checked={category.is_active}
          onChange={(e) => onToggleActive(e.target.checked)}
          className="h-3.5 w-3.5 accent-pink"
        />
        Visible
      </label>

      <button
        onClick={onDelete}
        className="shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-pink-50 hover:text-pink-600"
        aria-label={`Delete ${category.name}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
