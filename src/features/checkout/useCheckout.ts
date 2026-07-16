import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRazorpayOrder, verifyPayment } from '@/data/orders'
import { signUp } from '@/data/auth'
import { loadRazorpay, openRazorpayCheckout } from '@/lib/razorpay'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/features/auth/authStore'
import { toast } from '@/store/ui'
import type { CheckoutFormValues } from './schema'
import type { CheckoutDetails } from '@/types/domain'

/**
 * Orchestrates the full checkout: create order (server-priced) → open Razorpay
 * → verify payment → clear cart → confirmation. Keeps the vendor dance out of
 * the page component.
 */
export function useCheckout() {
  const navigate = useNavigate()
  const [isPlacing, setPlacing] = useState(false)
  const items = useCartStore((s) => s.items)
  const clear = useCartStore((s) => s.clear)

  async function placeOrder(values: CheckoutFormValues) {
    if (items.length === 0) {
      toast.error('Your bag is empty.')
      return
    }
    setPlacing(true)
    try {
      // Optional account creation side-offer (never blocks the purchase).
      let userId = useAuthStore.getState().user?.id ?? null
      if (values.createAccount && values.password && !userId) {
        try {
          const res = await signUp(values.customerEmail, values.password, values.customerName)
          userId = res.user?.id ?? null
        } catch {
          toast.info("We couldn't create an account, but we'll still place your order.")
        }
      }

      const details: CheckoutDetails = {
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        customerPhone: values.customerPhone,
        shippingAddress: {
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
        },
        customerNote: values.customerNote,
      }

      const order = await createRazorpayOrder({
        items,
        details,
        userId,
      })

      await loadRazorpay()
      openRazorpayCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'J Charms',
        description: `Order ${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        prefill: {
          name: values.customerName,
          email: values.customerEmail,
          contact: values.customerPhone,
        },
        notes: { order_number: order.orderNumber },
        theme: { color: '#F2618B' },
        handler: async (response) => {
          try {
            await verifyPayment({
              orderId: order.orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            clear()
            navigate(`/order-confirmed/${order.orderNumber}`)
          } catch (err) {
            toast.error((err as Error).message || 'Payment could not be verified.')
          } finally {
            setPlacing(false)
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
      })
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong placing your order.')
      setPlacing(false)
    }
  }

  return { placeOrder, isPlacing }
}
