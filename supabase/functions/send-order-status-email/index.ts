import { handleOptions, json } from '../_shared/cors.ts'
import { createAdminClient, requireAdmin } from '../_shared/supabaseAdmin.ts'
import { getEmailProvider } from '../_shared/services/email.ts'
import {
  orderShippedEmail,
  orderStatusEmail,
} from '../_shared/emailTemplates.ts'

/**
 * Sends the customer-facing email for an order status change. Admin-only:
 * invocation is gated by requireAdmin so a random anon caller can't trigger
 * emails to customers. Called by the admin data layer on status transitions.
 */
Deno.serve(async (req) => {
  const pre = handleOptions(req)
  if (pre) return pre

  try {
    if (!(await requireAdmin(req))) {
      return json({ error: 'Not authorized.' }, 403)
    }

    const { orderId, status } = await req.json()
    if (!orderId || !status) return json({ error: 'orderId and status required.' }, 400)

    const admin = createAdminClient()
    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    if (error) throw error

    // Item names let the customer recognise which order this update is about.
    const { data: items } = await admin
      .from('order_items')
      .select('product_name, variant_name, quantity, line_total')
      .eq('order_id', orderId)

    const { subject, html } =
      status === 'shipped'
        ? orderShippedEmail(order, items ?? [])
        : orderStatusEmail(order, status, items ?? [])

    await getEmailProvider().send({ to: order.customer_email, subject, html })
    return json({ ok: true })
  } catch (err) {
    console.error('[send-order-status-email]', err)
    return json({ error: (err as Error).message ?? 'Failed to send email.' }, 400)
  }
})
