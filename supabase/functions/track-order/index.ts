import { handleOptions, json } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

/**
 * Guest order tracking. Orders have NO anon RLS access, so lookups run here
 * with the service role and an explicit ownership check: the order number must
 * match AND the supplied contact must match the order's email or phone. This
 * prevents enumerating orders by number alone.
 */
Deno.serve(async (req) => {
  const pre = handleOptions(req)
  if (pre) return pre

  try {
    const { orderNumber, contact } = await req.json()
    if (!orderNumber || !contact) {
      return json({ error: 'Order number and contact are required.' }, 400)
    }

    const admin = createAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('order_number', orderNumber.trim().toUpperCase())
      .maybeSingle()

    // Uniform response whether not-found or contact-mismatch — don't leak which.
    const normalizedContact = String(contact).trim().toLowerCase()
    const matches =
      order &&
      (order.customer_email.toLowerCase() === normalizedContact ||
        order.customer_phone.replace(/\s+/g, '') === normalizedContact.replace(/\s+/g, ''))

    if (!matches) {
      return json({ order: null }, 200)
    }

    return json({ order })
  } catch (err) {
    console.error('[track-order]', err)
    return json({ error: 'Lookup failed.' }, 400)
  }
})
