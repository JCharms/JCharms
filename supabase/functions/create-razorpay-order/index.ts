// deno-lint-ignore-file no-explicit-any
import { handleOptions, json } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { getPaymentProvider } from '../_shared/services/payment.ts'

/**
 * Creates an order + a Razorpay order.
 *
 * Prices, shipping and totals are recomputed here from the live DB — the client
 * only sends product/variant ids and quantities, never trusted amounts. The
 * order is created 'placed' + payment 'pending'; verify-razorpay-payment flips
 * it to 'paid' after signature checks.
 */
interface IncomingItem {
  productId: string
  variantId: string | null
  quantity: number
}

Deno.serve(async (req) => {
  const pre = handleOptions(req)
  if (pre) return pre

  try {
    const { items, details, userId } = await req.json()
    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Cart is empty.' }, 400)
    }
    if (!details?.customerName || !details?.customerEmail || !details?.customerPhone) {
      return json({ error: 'Missing contact details.' }, 400)
    }

    const admin = createAdminClient()

    // 1. Load authoritative product + variant data.
    const productIds = [...new Set(items.map((i: IncomingItem) => i.productId))]
    const variantIds = items
      .map((i: IncomingItem) => i.variantId)
      .filter((v: string | null): v is string => !!v)

    const [{ data: products, error: pErr }, { data: variants }] = await Promise.all([
      admin.from('products').select('*').in('id', productIds),
      variantIds.length
        ? admin.from('product_variants').select('*').in('id', variantIds)
        : Promise.resolve({ data: [] as any[] }),
    ])
    if (pErr) throw pErr

    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]))
    const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v]))

    // 2. Recompute line items + subtotal from server data.
    let subtotal = 0
    const orderItems = items.map((item: IncomingItem) => {
      const product = productMap.get(item.productId)
      if (!product || !product.is_active) {
        throw new Error(`Product ${item.productId} is unavailable.`)
      }
      if (product.purchase_mode === 'dm_only') {
        throw new Error(`"${product.name}" is a custom, DM-only item.`)
      }
      const variant = item.variantId ? variantMap.get(item.variantId) : null
      const unitPrice = Number(variant?.price_override ?? product.base_price)
      const quantity = Math.max(1, Math.floor(item.quantity))
      const lineTotal = unitPrice * quantity
      subtotal += lineTotal
      return {
        product_id: product.id,
        variant_id: variant?.id ?? null,
        product_name: product.name,
        variant_name: variant?.name ?? null,
        unit_price: unitPrice,
        quantity,
        line_total: lineTotal,
      }
    })

    // 3. Shipping from site_settings (config-over-hardcoding).
    const { data: settings } = await admin
      .from('site_settings')
      .select('key, value')
      .in('key', ['shipping_fee', 'free_shipping_over'])
    const settingMap = new Map((settings ?? []).map((s: any) => [s.key, s.value]))
    const flatShipping = Number(settingMap.get('shipping_fee') ?? 0)
    const freeOver = Number(settingMap.get('free_shipping_over') ?? 0)
    const shippingFee = freeOver > 0 && subtotal >= freeOver ? 0 : flatShipping
    const total = subtotal + shippingFee

    // 4. Persist the order (status placed / payment pending).
    const { data: order, error: oErr } = await admin
      .from('orders')
      .insert({
        user_id: userId ?? null,
        customer_name: details.customerName,
        customer_email: details.customerEmail,
        customer_phone: details.customerPhone,
        shipping_address: details.shippingAddress,
        customer_note: details.customerNote ?? null,
        subtotal,
        shipping_fee: shippingFee,
        total,
        order_status: 'placed',
        payment_status: 'pending',
      })
      .select()
      .single()
    if (oErr) throw oErr

    const { error: iErr } = await admin
      .from('order_items')
      .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })))
    if (iErr) throw iErr

    // 5. Create the Razorpay order for the authoritative total.
    const payment = getPaymentProvider()
    const rzpOrder = await payment.createOrder({
      amountPaise: Math.round(total * 100),
      currency: 'INR',
      receipt: order.order_number,
      notes: { order_id: order.id, order_number: order.order_number },
    })

    await admin
      .from('orders')
      .update({ razorpay_order_id: rzpOrder.id })
      .eq('id', order.id)

    return json({
      orderId: order.id,
      orderNumber: order.order_number,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: 'INR',
      keyId: payment.keyId,
    })
  } catch (err) {
    console.error('[create-razorpay-order]', err)
    return json({ error: (err as Error).message ?? 'Failed to create order.' }, 400)
  }
})
