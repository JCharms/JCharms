import { useCartStore, selectCount, selectSubtotal } from '@/store/cart'
import { useUIStore } from '@/store/ui'
import type { ProductWithRelations } from '@/types/domain'
import type { ProductVariant } from '@/types/database'

/**
 * Cart facade for components: read totals + add/remove with UX feedback
 * (toast + cart drawer). Components use this rather than touching the store,
 * so add-to-cart side effects live in one place.
 */
export function useCart() {
  const items = useCartStore((s) => s.items)
  const count = useCartStore(selectCount)
  const subtotal = useCartStore(selectSubtotal)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const clear = useCartStore((s) => s.clear)
  const pushToast = useUIStore((s) => s.pushToast)
  const setCartOpen = useUIStore((s) => s.setCartOpen)

  function addProduct(
    product: ProductWithRelations,
    variant: ProductVariant | null,
    quantity = 1,
  ) {
    const unitPrice = variant?.price_override ?? product.base_price
    addItem({
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variantName: variant?.name ?? null,
      slug: product.slug,
      unitPrice,
      quantity,
      imagePath: product.images[0]?.storage_path ?? null,
    })
    pushToast(`Added ${product.name} to your bag ✨`, 'success')
  }

  return {
    items,
    count,
    subtotal,
    addProduct,
    removeItem,
    setQuantity,
    clear,
    openCart: () => setCartOpen(true),
  }
}
