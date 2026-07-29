import { useState } from 'react'
import { Check, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { useCreateVariant, useDeleteVariant, useUpdateVariant } from './hooks'
import { Badge, Button, Card, Input } from '@/components/ui'
import { toast } from '@/store/ui'
import { cn } from '@/lib/cn'
import type { ProductVariant, StockType } from '@/types/database'

/**
 * Colour / style options, each with its own price and — the point of this
 * editor — its own stock count.
 *
 * How a count is read is decided in `src/lib/stock.ts` and mirrored by the
 * create-razorpay-order Edge Function: a variant's own number wins when it is
 * set, and a blank falls back to the product-level count. So "blank" is a real,
 * distinct state ("don't count this option separately"), not zero — which is
 * why every field here parses an empty box to null rather than 0.
 *
 * Counts only bite on ready-stock products; made-to-order pieces are crocheted
 * on demand and have no shelf to draw from, so the column is hidden for them.
 */
export function VariantsEditor({
  productId,
  variants,
  basePrice,
  stockType,
}: {
  productId: string
  variants: ProductVariant[]
  basePrice: number
  stockType: StockType
}) {
  const tracksStock = stockType === 'ready_stock'
  const counted = variants.filter((v) => v.is_active && v.stock_quantity !== null)
  const totalOnShelf = counted.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0)

  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-indigo">Options &amp; stock</h2>
        {tracksStock && counted.length > 0 && (
          <Badge tone="indigo">
            {totalOnShelf} in stock across {counted.length} option
            {counted.length === 1 ? '' : 's'}
          </Badge>
        )}
      </div>

      {variants.length > 0 && (
        <ul className="space-y-3">
          {variants.map((variant) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              siblings={variants}
              productId={productId}
              basePrice={basePrice}
              tracksStock={tracksStock}
            />
          ))}
        </ul>
      )}

      <AddVariantRow
        productId={productId}
        siblings={variants}
        basePrice={basePrice}
        tracksStock={tracksStock}
      />

      <p className="text-xs text-ink-faint">
        Options a customer picks from, like a colour. Leave the price blank to charge
        the normal price.{' '}
        {tracksStock ? (
          <>
            Leave <span className="font-medium">In stock</span> blank to fall back to the
            product’s own count — set it to 0 to show that colour as sold out while the
            others stay on sale.
          </>
        ) : (
          <>
            This product is <span className="font-medium">made to order</span>, so options
            don’t carry a stock count. Switch “Stock type” to “Ready stock” if you want to
            count them.
          </>
        )}
      </p>
    </Card>
  )
}

// ── One existing option ─────────────────────────────────────────────────────

function VariantRow({
  variant,
  siblings,
  productId,
  basePrice,
  tracksStock,
}: {
  variant: ProductVariant
  siblings: ProductVariant[]
  productId: string
  basePrice: number
  tracksStock: boolean
}) {
  const update = useUpdateVariant()
  const del = useDeleteVariant()
  const [name, setName] = useState(variant.name)
  const [price, setPrice] = useState(asField(variant.price_override))
  const [stock, setStock] = useState(asField(variant.stock_quantity))
  const [error, setError] = useState<string | null>(null)

  const parsedPrice = parsePrice(price)
  // When the count is hidden its field can't be corrected, so half-typed text
  // left behind by a switch to made-to-order must not be able to block a save.
  const parsedStock: Parsed = tracksStock
    ? parseStock(stock)
    : { ok: true, value: variant.stock_quantity }

  // Compared on parsed values, not raw text, so typing "250.00" over "250"
  // doesn't leave a Save button stuck on screen with nothing to save.
  const changed =
    name.trim() !== variant.name ||
    (parsedPrice.ok ? parsedPrice.value !== variant.price_override : true) ||
    (parsedStock.ok ? parsedStock.value !== variant.stock_quantity : true)

  function save() {
    const clean = name.trim()
    const problem =
      nameProblem(clean, siblings, variant.id) ??
      (parsedPrice.ok ? null : parsedPrice.error) ??
      (parsedStock.ok ? null : parsedStock.error)
    if (problem) return setError(problem)

    setError(null)
    update.mutate(
      {
        id: variant.id,
        productId,
        patch: {
          name: clean,
          price_override: parsedPrice.ok ? parsedPrice.value : null,
          // Never write a stock number onto a made-to-order product — the
          // column is hidden there, so a stale value would be invisible.
          ...(tracksStock && parsedStock.ok ? { stock_quantity: parsedStock.value } : {}),
        },
      },
      { onSuccess: () => toast.success(`Saved “${clean}”.`) },
    )
  }

  function remove() {
    if (!confirm(`Remove the “${variant.name}” option? This cannot be undone.`)) return
    del.mutate({ id: variant.id, productId })
  }

  return (
    <li
      className={cn(
        'rounded-xl border p-4',
        variant.is_active
          ? 'border-ivory-300 bg-white'
          : 'border-dashed border-ivory-300 bg-ivory-100',
      )}
    >
      <div className={cn('grid gap-3', tracksStock ? 'sm:grid-cols-[minmax(0,1fr)_7rem_7rem]' : 'sm:grid-cols-[minmax(0,1fr)_7rem]')}>
        <Input
          label="Option name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={onEnter(() => changed && save())}
        />
        <Input
          label="Price (₹)"
          inputMode="numeric"
          placeholder={String(basePrice)}
          value={price}
          onChange={(e) => {
            setPrice(e.target.value)
            setError(null)
          }}
          onKeyDown={onEnter(() => changed && save())}
        />
        {tracksStock && (
          <Input
            label="In stock"
            inputMode="numeric"
            placeholder="—"
            value={stock}
            onChange={(e) => {
              setStock(e.target.value)
              setError(null)
            }}
            onKeyDown={onEnter(() => changed && save())}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-faint">
          {statusLine(variant, tracksStock)}
        </p>
        <div className="flex items-center gap-1">
          {changed && (
            // type="button" everywhere in here: this editor renders inside the
            // product <form>, and Button has no default type, so an unmarked
            // button submits the whole product alongside its own action.
            <Button type="button" size="sm" onClick={save} isLoading={update.isPending}>
              <Check size={15} /> Save
            </Button>
          )}
          <button
            type="button"
            onClick={() =>
              update.mutate({
                id: variant.id,
                productId,
                patch: { is_active: !variant.is_active },
              })
            }
            aria-label={
              variant.is_active
                ? `Hide ${variant.name} from the shop`
                : `Show ${variant.name} in the shop`
            }
            title={
              variant.is_active
                ? 'Shown in the shop — click to hide'
                : 'Hidden — click to show in the shop'
            }
            className={cn(
              'rounded-lg p-1.5 hover:bg-ivory-200',
              variant.is_active ? 'text-sage-400' : 'text-ink-faint',
            )}
          >
            {variant.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            type="button"
            onClick={remove}
            aria-label={`Delete ${variant.name}`}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-pink-50 hover:text-pink-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-pink-600">{error}</p>}
    </li>
  )
}

// ── Add a new option ────────────────────────────────────────────────────────

function AddVariantRow({
  productId,
  siblings,
  basePrice,
  tracksStock,
}: {
  productId: string
  siblings: ProductVariant[]
  basePrice: number
  tracksStock: boolean
}) {
  const create = useCreateVariant()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [error, setError] = useState<string | null>(null)

  function add() {
    const clean = name.trim()
    if (!clean) return setError('Give the option a name.')

    // Number('abc') is NaN, which used to sail through to the database and fail
    // there with a message no one could act on.
    const parsedPrice = parsePrice(price)
    const parsedStock = parseStock(stock)
    const problem =
      nameProblem(clean, siblings) ??
      (parsedPrice.ok ? null : parsedPrice.error) ??
      (parsedStock.ok ? null : parsedStock.error)
    if (problem) return setError(problem)

    setError(null)
    create.mutate(
      {
        product_id: productId,
        name: clean,
        price_override: parsedPrice.ok ? parsedPrice.value : null,
        ...(tracksStock && parsedStock.ok ? { stock_quantity: parsedStock.value } : {}),
        sort_order: siblings.length,
      },
      {
        // Failures already surface as a toast from useCreateVariant's onError.
        onSuccess: () => {
          setName('')
          setPrice('')
          setStock('')
          toast.success(`Added “${clean}”.`)
        },
      },
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-ivory-300 p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <Input
            label="Option name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={onEnter(add)}
            placeholder="e.g. Pastel Pink"
          />
        </div>
        <div className="w-28">
          <Input
            label="Price (₹)"
            inputMode="numeric"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              setError(null)
            }}
            onKeyDown={onEnter(add)}
            placeholder={String(basePrice)}
          />
        </div>
        {tracksStock && (
          <div className="w-28">
            <Input
              label="In stock"
              inputMode="numeric"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value)
                setError(null)
              }}
              onKeyDown={onEnter(add)}
              placeholder="—"
            />
          </div>
        )}
        <Button type="button" size="sm" onClick={add} isLoading={create.isPending}>
          <Plus size={15} /> Add
        </Button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-pink-600">{error}</p>}
    </div>
  )
}

/**
 * Enter runs the row's own action instead of submitting the product form this
 * editor is nested inside — a bare Enter in any field would otherwise trigger
 * the form's implicit submission and save the whole product.
 */
function onEnter(action: () => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    action()
  }
}

// ── Field parsing ───────────────────────────────────────────────────────────

type Parsed = { ok: true; value: number | null } | { ok: false; error: string }

/** A null column renders as an empty box — "not set", which is not zero. */
function asField(value: number | null): string {
  return value === null ? '' : String(value)
}

function parsePrice(raw: string): Parsed {
  const text = raw.trim()
  if (!text) return { ok: true, value: null }
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false, error: 'The price must be a number, or left blank.' }
  }
  return { ok: true, value: parsed }
}

function parseStock(raw: string): Parsed {
  const text = raw.trim()
  if (!text) return { ok: true, value: null }
  const parsed = Number(text)
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { ok: false, error: 'Stock must be a whole number (0 or more), or left blank.' }
  }
  if (parsed > 100_000) return { ok: false, error: 'That quantity looks too large.' }
  return { ok: true, value: parsed }
}

function nameProblem(
  clean: string,
  siblings: ProductVariant[],
  ignoreId?: string,
): string | null {
  if (!clean) return 'Give the option a name.'
  const clash = siblings.some(
    (v) => v.id !== ignoreId && v.name.toLowerCase() === clean.toLowerCase(),
  )
  return clash ? `“${clean}” is already an option on this product.` : null
}

/** Plain-English summary of what the shop currently does with this option. */
function statusLine(variant: ProductVariant, tracksStock: boolean): string {
  if (!variant.is_active) return 'Hidden from the shop'
  if (!tracksStock) return 'Made to order — no stock count'
  if (variant.stock_quantity === null) return 'Uses the product’s stock count'
  if (variant.stock_quantity === 0) return 'Sold out — shown crossed out in the shop'
  return `${variant.stock_quantity} on the shelf`
}
