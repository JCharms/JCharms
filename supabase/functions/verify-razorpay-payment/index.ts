import { handleOptions, json } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { getPaymentProvider } from '../_shared/services/payment.ts'
import { getEmailProvider } from '../_shared/services/email.ts'
import { orderConfirmationEmail } from '../_shared/emailTemplates.ts'

/**
 * Verifies the Razorpay payment signature returned by Checkout, then marks the
 * order paid and emails a confirmation. Signature verification is the security
 * boundary — an unverified callback never flips payment_status to 'paid'.
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

    // Confirmation email — best-effort, never blocks the success response.
    try {
      const { subject, html } = orderConfirmationEmail(order)
      await getEmailProvider().send({ to: order.customer_email, subject, html })
    } catch (mailErr) {
      console.error('[verify-razorpay-payment] email failed', mailErr)
    }

    return json({ orderNumber: order.order_number })
  } catch (err) {
    console.error('[verify-razorpay-payment]', err)
    return json({ error: (err as Error).message ?? 'Verification failed.' }, 400)
  }
})
