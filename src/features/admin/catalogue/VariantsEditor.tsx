import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useCreateVariant, useDeleteVariant } from './hooks'
import { Card, Button, Input } from '@/components/ui'
import { formatINR } from '@/lib/format'
import type { ProductVariant } from '@/types/database'

/** Colour / style variants with an optional price override. */
export function VariantsEditor({
  productId,
  variants,
  basePrice,
}: {
  productId: string
  variants: ProductVariant[]
  basePrice: number
}) {
  const create = useCreateVariant()
  const del = useDeleteVariant()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  function add() {
    if (!name.trim()) return
    create.mutate(
      {
        product_id: productId,
        name: name.trim(),
        price_override: price ? Number(price) : null,
        sort_order: variants.length,
      },
      { onSuccess: () => { setName(''); setPrice('') } },
    )
  }

  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-display text-lg text-indigo">Variants</h2>

      {variants.length > 0 && (
        <ul className="space-y-2">
          {variants.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded-lg bg-ivory-100 px-3 py-2 text-sm">
              <span className="font-medium text-ink">{v.name}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-ink-muted">
                  {formatINR(v.price_override ?? basePrice)}
                </span>
                <button
                  onClick={() => del.mutate({ id: v.id, productId })}
                  aria-label={`Delete ${v.name}`}
                  className="text-ink-faint hover:text-pink-600"
                >
                  <Trash2 size={15} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <Input label="Variant name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pastel Pink" />
        </div>
        <div className="w-32">
          <Input label="Price override" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(basePrice)} />
        </div>
        <Button size="sm" onClick={add} isLoading={create.isPending}>
          <Plus size={15} /> Add
        </Button>
      </div>
      <p className="text-xs text-ink-faint">Leave price override blank to use the base price.</p>
    </Card>
  )
}
