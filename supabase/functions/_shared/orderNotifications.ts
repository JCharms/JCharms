import type { AdminClient } from './supabaseAdmin.ts'
import { getEmailProvider } from './services/email.ts'
import { newOrderOwnerEmail, orderConfirmationEmail } from './emailTemplates.ts'

/**
 * The emails that go out when an order's payment is confirmed:
 * the customer's receipt, and the owner's "new order" packing slip.
 *
 * Two independent paths can confirm a payment — the browser relaying Razorpay's
 * signed callback (verify-razorpay-payment) and Razorpay's server-to-server
 * webhook (razorpay-webhook). Both verify the HMAC with the secret key, so both
 * are trustworthy triggers; we keep both because one is fast and the other is
 * reliable. Whichever arrives first sends, and this module guarantees the second
 * one stays quiet.
 */

export type NotifyResult =
  | 'sent' // at least one email went out; the claim is held
  | 'already-notified' // another path won the race, or the order isn't paid
  | 'failed' // every send failed; claim released so a retry can pick it up
  | 'no-order' // the claim query itself errored

/**
 * Claim and send, exactly once per order.
 *
 * The claim is a single conditional UPDATE: Postgres locks the row, so if both
 * paths race, exactly one sees `notified_at IS NULL` and gets a row back. The
 * loser gets zero rows and returns 'already-notified' without sending.
 *
 * Claiming *before* sending (rather than marking after) is deliberate — the
 * failure mode it picks is "an email was missed", not "the customer got two
 * receipts", and a missed email is visible in the dashboard while a duplicate
 * is not recoverable.
 *
 * Never throws: notification is best-effort and must not turn a captured
 * payment into an error response. Callers log the result.
 */
export async function sendPaidOrderNotifications(
  admin: AdminClient,
  orderId: string,
): Promise<NotifyResult> {
  // Atomic claim. The payment_status guard means an order that isn't actually
  // paid can never trigger a receipt, whichever path calls us.
  const { data: order, error } = await admin
    .from('orders')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('payment_status', 'paid')
    .is('notified_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[orderNotifications] claim failed', error)
    return 'no-order'
  }
  if (!order) {
    // Either another path already claimed it, or it isn't paid. Both are
    // correct outcomes; distinguishing them costs a query and changes nothing.
    return 'already-notified'
  }

  // Draw down inventory for anything sold from the shelf. Guarded by its own
  // stock_consumed_at claim inside the function, so the email claim being
  // released on send failure can never cause a double deduction.
  const { error: stockErr } = await admin.rpc('consume_order_stock', {
    p_order_id: orderId,
  })
  if (stockErr) {
    // Not fatal: the customer has paid and must still get their receipt. The
    // owner reconciles stock from the dashboard; a wrong count is recoverable,
    // a swallowed receipt is not.
    console.error('[orderNotifications] stock consumption failed', stockErr)
  }

  const { data: items } = await admin
    .from('order_items')
    .select('product_name, variant_name, quantity, line_total')
    .eq('order_id', orderId)

  const email = getEmailProvider()
  let anySent = false

  // Customer receipt.
  try {
    const { subject, html } = orderConfirmationEmail(order)
    await email.send({ to: order.customer_email, subject, html })
    anySent = true
  } catch (err) {
    console.error('[orderNotifications] customer confirmation failed', err)
  }

  // Owner alert. Unset ORDER_NOTIFY_TO is a config gap, not a runtime error —
  // loud in the logs, but it must not take the customer receipt down with it.
  const notifyTo = Deno.env.get('ORDER_NOTIFY_TO')?.trim()
  if (!notifyTo) {
    console.warn(
      '[orderNotifications] ORDER_NOTIFY_TO is not set — the shop owner was NOT ' +
        'notified of order ' + order.order_number,
    )
  } else {
    try {
      const { subject, html, replyTo } = newOrderOwnerEmail(order, items ?? [], {
        adminUrl: adminOrderUrl(order.id),
      })
      // One address per recipient: Resend accepts a list, but a comma-separated
      // env var would otherwise be sent as a single malformed address.
      for (const to of notifyTo.split(',').map((s) => s.trim()).filter(Boolean)) {
        await email.send({ to, subject, html, replyTo })
      }
      anySent = true
    } catch (err) {
      console.error('[orderNotifications] owner notification failed', err)
    }
  }

  // Nothing got out — release the claim so the other path (or a Razorpay
  // webhook retry) can try again. If even one email sent we keep the claim,
  // because re-running would duplicate the one that succeeded.
  if (!anySent) {
    await admin.from('orders').update({ notified_at: null }).eq('id', orderId)
    console.error(
      `[orderNotifications] no email sent for ${order.order_number}; claim released for retry`,
    )
    return 'failed'
  }

  return 'sent'
}

/** Deep link to the order in the admin dashboard, if we know where the site lives. */
function adminOrderUrl(orderId: string): string | undefined {
  const base = Deno.env.get('SITE_URL')?.trim().replace(/\/+$/, '')
  return base ? `${base}/admin/orders/${orderId}` : undefined
}
