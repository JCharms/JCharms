import { json } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { getPaymentProvider } from '../_shared/services/payment.ts'

/**
 * Razorpay webhook — the source of truth for payment state, resilient to a
 * customer closing the tab before the browser verify call runs. Verifies the
 * webhook HMAC signature, then reconciles the order's payment_status.
 *
 * This function has verify_jwt = false (see config.toml) because Razorpay,
 * not a logged-in user, calls it — the HMAC signature IS the auth.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  try {
    const payment = getPaymentProvider()
    const valid = await payment.verifyWebhookSignature(rawBody, signature)
    if (!valid) {
      console.warn('[razorpay-webhook] invalid signature')
      return json({ error: 'Invalid signature' }, 401)
    }

    const event = JSON.parse(rawBody)
    const admin = createAdminClient()

    const rzpOrderId: string | undefined =
      event?.payload?.payment?.entity?.order_id ??
      event?.payload?.order?.entity?.id

    if (!rzpOrderId) return json({ ok: true, note: 'no order id in event' })

    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        const paymentId = event?.payload?.payment?.entity?.id ?? null
        await admin
          .from('orders')
          .update({ payment_status: 'paid', razorpay_payment_id: paymentId })
          .eq('razorpay_order_id', rzpOrderId)
          .neq('payment_status', 'paid') // idempotent
        break
      }
      case 'payment.failed': {
        await admin
          .from('orders')
          .update({ payment_status: 'failed' })
          .eq('razorpay_order_id', rzpOrderId)
          .eq('payment_status', 'pending')
        break
      }
      default:
        // Ignore unrelated events.
        break
    }

    return json({ ok: true })
  } catch (err) {
    console.error('[razorpay-webhook]', err)
    return json({ error: 'Webhook processing failed' }, 500)
  }
})
