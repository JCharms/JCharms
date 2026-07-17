import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useCreateVariant, useDeleteVariant } from './hooks'
import { Card, Button, Input } from '@/components/ui'
import { formatINR } from '@/lib/format'
import { toast } from '@/store/ui'
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
  const [error, setError] = useState<string | null>(null)

  function add() {
    const clean = name.trim()
    if (!clean) return setError('Give the variant a name.')
    if (variants.some((v) => v.name.toLowerCase() === clean.toLowerCase())) {
      return setError(`“${clean}” is already an option on this product.`)
    }

    // Number('abc') is NaN, which used to sail through to the database and fail
    // there with a message no one could act on.
    let override: number | null = null
    if (price.trim()) {
      const parsed = Number(price.trim())
      if (!Number.isFinite(parsed) || parsed < 0) {
        return setError('The price override must be a number, or left blank.')
      }
      override = parsed
    }

    setError(null)
    create.mutate(
      {
        product_id: productId,
        name: clean,
        price_override: override,
        sort_order: variants.length,
      },
      {
        // Failures already surface as a toast from useCreateVariant's onError.
        onSuccess: () => {
          setName('')
          setPrice('')
          toast.success(`Added “${clean}”.`)
        },
      },
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
          <Input
            label="Variant name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="e.g. Pastel Pink"
          />
        </div>
        <div className="w-32">
          <Input
            label="Price override"
            inputMode="numeric"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={String(basePrice)}
          />
        </div>
        <Button size="sm" onClick={add} isLoading={create.isPending}>
          <Plus size={15} /> Add
        </Button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-pink-600">{error}</p>
      ) : (
        <p className="text-xs text-ink-faint">
          Options a customer picks from, like a colour. Leave the price override blank
          to charge the normal price.
        </p>
      )}
    </Card>
  )
}
