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

    // Compare phones as bare 10-digit numbers: the same person types
    // "+91 98765 43210" one day and "9876543210" the next, and either should
    // find their order.
    const toMobile = (v: string) =>
      v.replace(/[\s()-]/g, '').replace(/^(\+91|91|0)/, '')

    // Uniform response whether not-found or contact-mismatch — don't leak which.
    const normalizedContact = String(contact).trim().toLowerCase()
    const matches =
      order &&
      (order.customer_email.toLowerCase() === normalizedContact ||
        toMobile(order.customer_phone) === toMobile(normalizedContact))

    if (!matches) {
      return json({ order: null }, 200)
    }

    return json({ order })
  } catch (err) {
    console.error('[track-order]', err)
    return json({ error: 'Lookup failed.' }, 400)
  }
})
