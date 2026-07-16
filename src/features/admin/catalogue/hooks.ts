import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminListProducts,
  adminGetProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductFlag,
  createVariant,
  updateVariant,
  deleteVariant,
  addProductImage,
  deleteProductImage,
  reorderProductImages,
} from '@/data/products'
import {
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/data/categories'
import { uploadProductImage } from '@/data/storage'
import { queryKeys } from '@/lib/queryClient'
import { toast } from '@/store/ui'
import type { Database } from '@/types/database'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryUpdate = Database['public']['Tables']['categories']['Update']
type VariantInsert = Database['public']['Tables']['product_variants']['Insert']
type VariantUpdate = Database['public']['Tables']['product_variants']['Update']

// ── Queries ─────────────────────────────────────────────────────────────────
export function useAdminProducts() {
  return useQuery({ queryKey: queryKeys.adminProducts, queryFn: adminListProducts })
}
export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => adminGetProduct(id),
    enabled: !!id,
  })
}
export function useAdminCategories() {
  return useQuery({ queryKey: ['admin', 'categories'], queryFn: adminListCategories })
}

// ── Shared invalidation ─────────────────────────────────────────────────────
function useCatalogueInvalidation() {
  const qc = useQueryClient()
  return (productId?: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.adminProducts })
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: queryKeys.categories })
    qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
    if (productId) qc.invalidateQueries({ queryKey: ['admin', 'product', productId] })
  }
}

// ── Product mutations ───────────────────────────────────────────────────────
export function useCreateProduct() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: (input: ProductInsert) => createProduct(input),
    onSuccess: () => { toast.success('Product created.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useUpdateProduct() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProductUpdate }) => updateProduct(id, patch),
    onSuccess: (_d, v) => { toast.success('Product saved.'); invalidate(v.id) },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useDeleteProduct() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => { toast.success('Product deleted.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useSetProductFlag() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: ({ id, flag, value }: { id: string; flag: 'is_active' | 'is_featured'; value: boolean }) =>
      setProductFlag(id, flag, value),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error((e as Error).message),
  })
}

// ── Variant mutations ───────────────────────────────────────────────────────
export function useCreateVariant() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: (input: VariantInsert) => createVariant(input),
    onSuccess: (_d, v) => invalidate(v.product_id),
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useUpdateVariant() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: ({ id, patch, productId }: { id: string; patch: VariantUpdate; productId: string }) =>
      updateVariant(id, patch).then((r) => { void productId; return r }),
    onSuccess: (_d, v) => invalidate(v.productId),
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useDeleteVariant() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      deleteVariant(id).then(() => { void productId }),
    onSuccess: (_d, v) => invalidate(v.productId),
    onError: (e) => toast.error((e as Error).message),
  })
}

// ── Image mutations ─────────────────────────────────────────────────────────
export function useUploadImages() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: async ({
      productId,
      files,
      startOrder,
    }: {
      productId: string
      files: File[]
      startOrder: number
    }) => {
      let order = startOrder
      for (const file of files) {
        const path = await uploadProductImage(productId, file)
        await addProductImage({
          product_id: productId,
          storage_path: path,
          is_placeholder: false,
          sort_order: order++,
          alt_text: file.name,
        })
      }
    },
    onSuccess: (_d, v) => { toast.success('Photos uploaded.'); invalidate(v.productId) },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useDeleteImage() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      deleteProductImage(id).then(() => { void productId }),
    onSuccess: (_d, v) => invalidate(v.productId),
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useReorderImages() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: ({ ordered, productId }: { ordered: { id: string; sort_order: number }[]; productId: string }) =>
      reorderProductImages(ordered).then(() => { void productId }),
    onSuccess: (_d, v) => invalidate(v.productId),
    onError: (e) => toast.error((e as Error).message),
  })
}

// ── Category mutations ──────────────────────────────────────────────────────
export function useCreateCategory() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: (input: CategoryInsert) => createCategory(input),
    onSuccess: () => { toast.success('Category added.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useUpdateCategory() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryUpdate }) => updateCategory(id, patch),
    onSuccess: () => { toast.success('Category saved.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
export function useDeleteCategory() {
  const invalidate = useCatalogueInvalidation()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => { toast.success('Category deleted.'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })
}
