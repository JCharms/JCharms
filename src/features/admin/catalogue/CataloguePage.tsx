import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Star, Eye, EyeOff } from 'lucide-react'
import { useAdminProducts, useSetProductFlag, useDeleteProduct } from './hooks'
import { CategoriesManager } from './CategoriesManager'
import { Card, Button, Badge, LoadingBlock } from '@/components/ui'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/cn'

type Tab = 'products' | 'categories'

export function CataloguePage() {
  const [tab, setTab] = useState<Tab>('products')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-indigo">Catalogue</h1>
        {tab === 'products' && (
          <Link to="/admin/catalogue/new">
            <Button><Plus size={16} /> New product</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        {(['products', 'categories'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition',
              tab === t ? 'bg-indigo text-ivory' : 'bg-white text-ink-muted hover:bg-ivory-200',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'products' ? <ProductsTable /> : <CategoriesManager />}
    </div>
  )
}

function ProductsTable() {
  const { data: products, isLoading } = useAdminProducts()
  const setFlag = useSetProductFlag()
  const deleteProduct = useDeleteProduct()

  if (isLoading) return <LoadingBlock />
  if (!products || products.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-ink-muted">No products yet.</p>
        <Link to="/admin/catalogue/new" className="mt-3 inline-block">
          <Button><Plus size={16} /> Add your first product</Button>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ivory-300 bg-ivory-100 text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3 text-center">Featured</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-300/60">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-ivory-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{p.name}</div>
                  <div className="text-xs text-ink-faint">{p.category?.name ?? 'Uncategorised'}</div>
                </td>
                <td className="px-4 py-3 font-mono text-indigo">
                  {p.purchase_mode === 'dm_only' ? '—' : formatINR(p.base_price)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={p.purchase_mode === 'dm_only' ? 'pink' : 'neutral'}>
                    {p.purchase_mode === 'dm_only' ? 'DM only' : 'Direct'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setFlag.mutate({ id: p.id, flag: 'is_featured', value: !p.is_featured })}
                    aria-label="Toggle featured"
                    className={cn('rounded-full p-1.5', p.is_featured ? 'text-marigold' : 'text-ink-faint hover:text-marigold')}
                  >
                    <Star size={17} className={p.is_featured ? 'fill-marigold' : ''} />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setFlag.mutate({ id: p.id, flag: 'is_active', value: !p.is_active })}
                    aria-label="Toggle active"
                    className={cn('rounded-full p-1.5', p.is_active ? 'text-sage-400' : 'text-ink-faint')}
                  >
                    {p.is_active ? <Eye size={17} /> : <EyeOff size={17} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/admin/catalogue/${p.id}`} className="rounded-lg p-1.5 text-ink-muted hover:bg-ivory-200 hover:text-indigo" aria-label="Edit">
                      <Pencil size={16} />
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"? This cannot be undone.`)) deleteProduct.mutate(p.id)
                      }}
                      className="rounded-lg p-1.5 text-ink-faint hover:bg-pink-50 hover:text-pink-600"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
