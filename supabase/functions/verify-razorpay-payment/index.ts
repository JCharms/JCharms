import { handleOptions, json } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { getPaymentProvider } from '../_shared/services/payment.ts'
import { sendPaidOrderNotifications } from '../_shared/orderNotifications.ts'

/**
 * Verifies the Razorpay payment signature returned by Checkout, then marks the
 * order paid and sends the confirmation emails. Signature verification is the
 * security boundary — an unverified callback never flips payment_status to
 * 'paid'. The browser only relays Razorpay's signed values; the secret used to
 * check them stays here.
 *
 * This is the *fast* confirmation path: the customer usually has their receipt
 * before they leave the thank-you page. The razorpay-webhook function is the
 * reliable one, covering a customer who closed the tab. Both call the same
 * once-only notifier, so whichever wins the race, the emails go out exactly once.
 */
Deno.serve(async (req) => {
  const pre = handleOptions(req)
  if (pre) return pre

  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json()

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment fields.' }, 400)
    }

    const payment = getPaymentProvider()
    const valid = await payment.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })
    if (!valid) {
      const admin = createAdminClient()
      await admin
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', orderId)
        .eq('razorpay_order_id', razorpay_order_id)
      return json({ error: 'Payment signature verification failed.' }, 400)
    }

    const admin = createAdminClient()
    const { data: order, error } = await admin
      .from('orders')
      .update({
        payment_status: 'paid',
        razorpay_payment_id,
      })
      .eq('id', orderId)
      .eq('razorpay_order_id', razorpay_order_id)
      .select()
      .single()
    if (error) throw error

    // Customer receipt + owner alert. Best-effort and internally guarded
    // against double-sending; never blocks the success response.
    const notified = await sendPaidOrderNotifications(admin, order.id)
    if (notified !== 'sent') {
      console.log(`[verify-razorpay-payment] notifications ${notified} for ${order.order_number}`)
    }

    return json({ orderNumber: order.order_number })
  } catch (err) {
    console.error('[verify-razorpay-payment]', err)
    return json({ error: (err as Error).message ?? 'Verification failed.' }, 400)
  }
})
