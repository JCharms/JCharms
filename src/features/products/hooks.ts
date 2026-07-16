import { useQuery } from '@tanstack/react-query'
import {
  listProducts,
  listFeaturedProducts,
  getProductBySlug,
  type ProductFilters,
} from '@/data/products'
import { listCategoryTree, getCategoryBySlug } from '@/data/categories'
import { queryKeys } from '@/lib/queryClient'

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: () => listProducts(filters),
  })
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: queryKeys.products({ featured: true }),
    queryFn: listFeaturedProducts,
  })
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: () => getProductBySlug(slug),
    enabled: !!slug,
  })
}

export function useCategoryTree() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: listCategoryTree })
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.categories, slug],
    queryFn: () => getCategoryBySlug(slug),
    enabled: !!slug,
  })
}
