import { forwardRef, useEffect } from 'react'
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
              label="Name"
              {...register('name')}
              error={errors.name?.message}
              onBlur={() => {
                if (isNew && nameValue && !watch('slug')) setValue('slug', slugify(nameValue))
              }}
            />
            <Input label="Slug" {...register('slug')} error={errors.slug?.message} hint="Used in the product URL" />
            <Input label="Short description" {...register('short_description')} error={errors.short_description?.message} />
            <Textarea label="Description" rows={5} {...register('description')} />
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
            <h2 className="font-display text-lg text-indigo">Pricing & mode</h2>
            <Select label="Purchase mode" {...register('purchase_mode')}>
              <option value="direct">Direct (on-site checkout)</option>
              <option value="dm_only">DM only (custom / Instagram)</option>
            </Select>
            <Input label="Base price (₹)" inputMode="numeric" {...register('base_price')} error={errors.base_price?.message} />
            <Input label="Compare-at price (₹, optional)" inputMode="numeric" {...register('compare_at_price')} />
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="font-display text-lg text-indigo">Inventory</h2>
            <Select label="Category" {...register('category_id')}>
              <option value="">— Uncategorised —</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? '— ' : ''}{c.name}
                </option>
              ))}
            </Select>
            <Select label="Stock type" {...register('stock_type')}>
              <option value="ready_stock">Ready stock</option>
              <option value="made_to_order">Made to order</option>
            </Select>
            <Input label="Stock quantity (blank = untracked)" inputMode="numeric" {...register('stock_quantity')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min days" inputMode="numeric" {...register('processing_min_days')} />
              <Input label="Max days" inputMode="numeric" {...register('processing_max_days')} />
            </div>
          </Card>

          <Card className="space-y-3 p-6">
            <h2 className="font-display text-lg text-indigo">Visibility</h2>
            <Toggle label="Active (visible in shop)" {...register('is_active')} />
            <Toggle label="Featured on homepage" {...register('is_featured')} />
            <Toggle label="Customizable" {...register('is_customizable')} />
            <Input label="Sort order" inputMode="numeric" {...register('sort_order')} />
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
