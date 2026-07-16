import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './hooks'
import { Card, Button, Input, Select, LoadingBlock } from '@/components/ui'
import { slugify } from '@/lib/slug'

/** Manage categories with one level of nesting (parent → child). */
export function CategoriesManager() {
  const { data: categories, isLoading } = useAdminCategories()
  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory()
  const deleteCat = useDeleteCategory()

  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')

  const tops = categories?.filter((c) => !c.parent_id) ?? []

  function add() {
    if (!name.trim()) return
    createCat.mutate(
      { name: name.trim(), slug: slugify(name), parent_id: parentId || null },
      { onSuccess: () => { setName(''); setParentId('') } },
    )
  }

  if (isLoading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[180px] flex-1">
          <Input label="New category name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bouquets" />
        </div>
        <div className="min-w-[160px]">
          <Select label="Parent (optional)" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— Top level —</option>
            {tops.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <Button onClick={add} isLoading={createCat.isPending}>
          <Plus size={16} /> Add
        </Button>
      </Card>

      <div className="space-y-2">
        {tops.map((top) => {
          const children = categories?.filter((c) => c.parent_id === top.id) ?? []
          return (
            <Card key={top.id} className="p-4">
              <CategoryRow
                id={top.id}
                name={top.name}
                active={top.is_active}
                onSave={(patch) => updateCat.mutate({ id: top.id, patch })}
                onDelete={() => deleteCat.mutate(top.id)}
                bold
              />
              {children.length > 0 && (
                <div className="mt-2 space-y-1 border-l-2 border-ivory-300 pl-4">
                  {children.map((child) => (
                    <CategoryRow
                      key={child.id}
                      id={child.id}
                      name={child.name}
                      active={child.is_active}
                      onSave={(patch) => updateCat.mutate({ id: child.id, patch })}
                      onDelete={() => deleteCat.mutate(child.id)}
                    />
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function CategoryRow({
  name,
  active,
  onSave,
  onDelete,
  bold,
}: {
  id: string
  name: string
  active: boolean
  onSave: (patch: { name?: string; slug?: string; is_active?: boolean }) => void
  onDelete: () => void
  bold?: boolean
}) {
  const [value, setValue] = useState(name)
  return (
    <div className="flex items-center gap-2 py-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm hover:border-ivory-300 focus:border-pink focus:outline-none ${bold ? 'font-display text-indigo' : 'text-ink'}`}
      />
      <label className="flex items-center gap-1 text-xs text-ink-muted">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => onSave({ is_active: e.target.checked })}
          className="h-3.5 w-3.5 accent-pink"
        />
        active
      </label>
      <button
        onClick={() => onSave({ name: value, slug: slugify(value) })}
        className="rounded-lg p-1.5 text-ink-muted hover:bg-ivory-200 hover:text-indigo"
        aria-label="Save category"
      >
        <Save size={15} />
      </button>
      <button
        onClick={onDelete}
        className="rounded-lg p-1.5 text-ink-faint hover:bg-pink-50 hover:text-pink-600"
        aria-label="Delete category"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
