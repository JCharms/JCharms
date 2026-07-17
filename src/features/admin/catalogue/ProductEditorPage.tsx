import { forwardRef, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, Save } from 'lucide-react'
import {
  useAdminProduct,
  useAdminCategories,
  useCreateProduct,
  useUpdateProduct,
} from './hooks'
import { productSchema, toProductPayload, type ProductFormValues } from './productSchema'
import { VariantsEditor } from './VariantsEditor'
import { ImageGallery } from './ImageGallery'
import { Card, Button, Input, Textarea, Select, LoadingBlock } from '@/components/ui'
import { slugify } from '@/lib/slug'
import { flattenCategoryHierarchy } from '@/lib/categoryTree'

export function ProductEditorPage() {
  const { id = 'new' } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { data: product, isLoading } = useAdminProduct(isNew ? '' : id)
  const { data: categories } = useAdminCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    mode: 'onTouched',
    defaultValues: {
      purchase_mode: 'direct',
      stock_type: 'made_to_order',
      is_active: true,
      is_featured: false,
      is_customizable: false,
      sort_order: 0,
      base_price: 0,
    },
  })

  // Hydrate the form when editing.
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        slug: product.slug,
        category_id: product.category_id ?? '',
        short_description: product.short_description ?? '',
        description: product.description ?? '',
        base_price: product.base_price,
        compare_at_price: product.compare_at_price ?? '',
        purchase_mode: product.purchase_mode,
        stock_type: product.stock_type,
        stock_quantity: product.stock_quantity ?? '',
        is_customizable: product.is_customizable,
        processing_min_days: product.processing_min_days ?? '',
        processing_max_days: product.processing_max_days ?? '',
        is_active: product.is_active,
        is_featured: product.is_featured,
        sort_order: product.sort_order,
      })
    }
  }, [product, reset])

  const nameValue = watch('name')
  const purchaseMode = watch('purchase_mode')

  // The slug is a URL detail the owner shouldn't have to think about: keep it
  // mirrored from the name until (and unless) it's edited by hand.
  const [slugEdited, setSlugEdited] = useState(false)
  useEffect(() => {
    if (isNew && !slugEdited) setValue('slug', slugify(nameValue ?? ''))
  }, [nameValue, isNew, slugEdited, setValue])

  // Parents immediately followed by their children — sorting by sort_order
  // alone interleaves the two levels and reads as a jumbled list.
  const categoryOptions = useMemo(
    () => flattenCategoryHierarchy(categories ?? []),
    [categories],
  )

  function onSubmit(values: ProductFormValues) {
    const payload = toProductPayload(values)
    if (isNew) {
      createProduct.mutate(payload, {
        onSuccess: (created) => navigate(`/admin/catalogue/${created.id}`, { replace: true }),
      })
    } else {
      updateProduct.mutate({ id, patch: payload })
    }
  }

  if (!isNew && isLoading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <Link to="/admin/catalogue" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-indigo">
        <ChevronLeft size={16} /> Catalogue
      </Link>
      <h1 className="font-display text-3xl text-indigo">{isNew ? 'New product' : product?.name}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Main details */}
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <Input
              label="Product name"
              placeholder="e.g. Strawberry Keychain"
              {...register('name')}
              error={errors.name?.message}
            />
            <Input
              label="Web address (slug)"
              {...register('slug', { onChange: () => setSlugEdited(true) })}
              error={errors.slug?.message}
              hint={
                isNew
                  ? 'Filled in automatically from the name — you can leave this alone.'
                  : 'Changing this changes the product’s link. Existing links will break.'
              }
            />
            <Input
              label="Short description"
              placeholder="One line shown on the product card"
              {...register('short_description')}
              error={errors.short_description?.message}
            />
            <Textarea
              label="Full description"
              rows={5}
              placeholder="Shown on the product page — materials, size, care…"
              {...register('description')}
              error={errors.description?.message}
            />
          </Card>

          {!isNew && product && (
            <>
              <ImageGallery productId={product.id} images={product.images} />
              <VariantsEditor productId={product.id} variants={product.variants} basePrice={product.base_price} />
            </>
          )}
          {isNew && (
            <Card className="p-6 text-sm text-ink-muted">
              Save the product first, then add photos and variants.
            </Card>
          )}
        </div>

        {/* Sidebar settings */}
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <h2 className="font-display text-lg text-indigo">How it's sold</h2>
            <Select label="Purchase mode" {...register('purchase_mode')}>
              <option value="direct">Buy on the website</option>
              <option value="dm_only">Enquire on Instagram (custom)</option>
            </Select>
            {purchaseMode === 'dm_only' ? (
              <p className="rounded-lg bg-indigo-50 p-3 text-xs text-ink-muted">
                Custom pieces skip the cart — the product page shows a “Message us on
                Instagram” button instead of a price, so no price is needed here.
              </p>
            ) : (
              <>
                <Input
                  label="Price (₹)"
                  inputMode="numeric"
                  {...register('base_price')}
                  error={errors.base_price?.message}
                />
                <Input
                  label="Was-price (₹, optional)"
                  inputMode="numeric"
                  {...register('compare_at_price')}
                  error={errors.compare_at_price?.message}
                  hint="Shows a struck-through original beside the price."
                />
              </>
            )}
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="font-display text-lg text-indigo">Category & stock</h2>
            <Select
              label="Category"
              {...register('category_id')}
              hint="Subcategory products also show under their parent category."
            >
              <option value="">— No category —</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {'   '.repeat(c.depth)}
                  {c.depth > 0 ? '└ ' : ''}
                  {c.name}
                  {c.is_active ? '' : '  (hidden)'}
                </option>
              ))}
            </Select>
            <Select label="Stock type" {...register('stock_type')}>
              <option value="ready_stock">Ready stock (on the shelf)</option>
              <option value="made_to_order">Made to order (crocheted after ordering)</option>
            </Select>
            <Input
              label="Stock quantity"
              inputMode="numeric"
              placeholder="Leave blank if you don't count stock"
              {...register('stock_quantity')}
              error={errors.stock_quantity?.message}
            />
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Dispatch time (days)</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="From"
                  aria-label="Dispatch time from (days)"
                  inputMode="numeric"
                  {...register('processing_min_days')}
                  error={errors.processing_min_days?.message}
                />
                <Input
                  placeholder="To"
                  aria-label="Dispatch time to (days)"
                  inputMode="numeric"
                  {...register('processing_max_days')}
                  error={errors.processing_max_days?.message}
                />
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                How long before you post it. Shown on the product page, e.g. “Dispatch
                in 3–5 days”. Leave blank to hide.
              </p>
            </div>
          </Card>

          <Card className="space-y-3 p-6">
            <h2 className="font-display text-lg text-indigo">Visibility</h2>
            <Toggle label="Show in the shop" {...register('is_active')} />
            <Toggle label="Feature on the homepage" {...register('is_featured')} />
            <Toggle label="Can be customised" {...register('is_customizable')} />
            <Input
              label="Sort order"
              inputMode="numeric"
              {...register('sort_order')}
              error={errors.sort_order?.message}
              hint="Lower numbers appear first in the shop."
            />
          </Card>

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={createProduct.isPending || updateProduct.isPending}
            disabled={!isNew && !isDirty}
          >
            <Save size={18} /> {isNew ? 'Create product' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}

const Toggle = forwardRef<
  HTMLInputElement,
  { label: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function Toggle({ label, ...props }, ref) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input ref={ref} type="checkbox" className="h-4 w-4 accent-pink" {...props} />
      {label}
    </label>
  )
})
