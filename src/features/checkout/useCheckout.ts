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
          // Razorpay only calls this after a successful capture. The browser
          // verify is a fast-path courtesy; the webhook is the authoritative
          // confirmation and the emails come from there too. So we always land
          // the customer on the thank-you page — a transient verify error must
          // never strand someone who has already paid on the checkout form.
          const summary = {
            items: items.map((i) => ({
              name: i.name,
              variantName: i.variantName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
            subtotal: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
            total: order.amount / 100,
          }
          try {
            await verifyPayment({
              orderId: order.orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
          } catch (err) {
            console.error('[checkout] browser verify failed; webhook will finalise:', err)
          } finally {
            setPlacing(false)
            // Navigate with the cart still full: the confirmation page empties it
            // on arrival. Clearing it here instead would empty the cart while
            // CheckoutPage is still mounted, tripping its empty-cart guard, which
            // would redirect to /shop and clobber this navigation.
            navigate(`/order-confirmed/${order.orderNumber}`, { state: { summary } })
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
