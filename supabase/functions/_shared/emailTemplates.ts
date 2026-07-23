/** Branded transactional email templates (inline styles — email clients need them). */

interface OrderLike {
  order_number: string
  customer_name: string
  total: number
  subtotal?: number | null
  shipping_fee?: number | null
  tracking_number?: string | null
  courier?: string | null
}

/** Shipping address JSONB, as stored on the order. */
interface AddressLike {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
}

interface OrderItemLike {
  product_name: string
  variant_name?: string | null
  quantity: number
  line_total: number
}

/** Everything the owner needs to pack and post an order without opening the app. */
interface OwnerOrderLike extends OrderLike {
  customer_email: string
  customer_phone: string
  shipping_address: AddressLike | null
  customer_note?: string | null
  subtotal?: number | null
  shipping_fee?: number | null
}

const inr = (n: number) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`

/**
 * Escape a value before it goes into email HTML.
 *
 * Names, addresses and order notes are typed by customers, so they are
 * untrusted: an apostrophe in "O'Brien" is harmless but a stray `<` silently
 * eats the rest of the email in most clients, and a crafted note could inject
 * markup into the owner's inbox. Everything interpolated below that originates
 * with a customer goes through here.
 */
const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function shell(
  title: string,
  body: string,
  footer = "Handmade with love, in India · You're receiving this because you placed an order with J Charms.",
): string {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#F7FAFD;padding:32px 0;color:#1B2A45;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(34,34,59,.08);">
      <div style="background:#15357A;padding:24px 28px;">
        <span style="font-family:Georgia,serif;font-size:24px;color:#F7FAFD;font-weight:600;">J Charms</span>
      </div>
      <div style="padding:28px;">
        <h1 style="font-family:Georgia,serif;color:#15357A;font-size:22px;margin:0 0 12px;">${title}</h1>
        ${body}
      </div>
      <div style="padding:18px 28px;background:#F7FAFD;border-top:1px solid #DBE5F0;font-size:12px;color:#8296B4;text-align:center;">
        ${footer}
      </div>
    </div>
  </div>`
}

const orderTag = (n: string) =>
  `<span style="font-family:'JetBrains Mono',monospace;background:#EFF4FE;color:#1747AC;padding:4px 10px;border-radius:8px;font-weight:600;">${n}</span>`

/**
 * The "what's in this order" recap shared by every customer email. An order
 * number is unambiguous for us but means nothing to a customer scanning their
 * inbox — the product names are what tell them which order this note is about.
 * Returns '' when there are no items so callers can drop it in unconditionally.
 */
function customerItemsTable(items: OrderItemLike[]): string {
  if (!items || items.length === 0) return ''
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #DBE5F0;">
            ${esc(item.product_name)}${
              item.variant_name ? `<span style="color:#8296B4;"> · ${esc(item.variant_name)}</span>` : ''
            }<span style="color:#8296B4;"> × ${esc(item.quantity)}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #DBE5F0;text-align:right;white-space:nowrap;">
            ${inr(item.line_total)}
          </td>
        </tr>`,
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0 4px;">${rows}</table>`
}

export function orderConfirmationEmail(
  order: OrderLike,
  items: OrderItemLike[] = [],
): { subject: string; html: string } {
  const totals =
    order.subtotal != null
      ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:4px;">
           <tr><td style="padding:2px 0;color:#4F648B;">Subtotal</td>
               <td style="padding:2px 0;text-align:right;">${inr(order.subtotal)}</td></tr>
           <tr><td style="padding:2px 0;color:#4F648B;">Shipping</td>
               <td style="padding:2px 0;text-align:right;">${
                 Number(order.shipping_fee ?? 0) === 0 ? 'Free' : inr(order.shipping_fee ?? 0)
               }</td></tr>
           <tr><td style="padding:6px 0;font-weight:600;border-top:1px solid #DBE5F0;">Total paid</td>
               <td style="padding:6px 0;text-align:right;font-weight:600;border-top:1px solid #DBE5F0;">${inr(order.total)}</td></tr>
         </table>`
      : `<p>Payment received: <strong>${inr(order.total)}</strong>.</p>`
  return {
    subject: `Your J Charms order ${order.order_number} is confirmed 🧶`,
    html: shell(
      `Thank you, ${esc(order.customer_name)}!`,
      `<p>We've received your order ${orderTag(order.order_number)} and we'll start stitching soon!</p>
       ${customerItemsTable(items)}
       ${totals}
       <p style="color:#4F648B;margin-top:16px;">You'll get another note the moment it ships. You can also track it anytime with your order number.</p>`,
    ),
  }
}

export function orderShippedEmail(
  order: OrderLike,
  items: OrderItemLike[] = [],
): { subject: string; html: string } {
  const courier = esc(order.courier ?? 'India Post')
  const tracking = order.tracking_number
    ? `<p>Tracking number: <strong>${esc(order.tracking_number)}</strong> (${courier})</p>`
    : ''
  return {
    subject: `Your J Charms order ${order.order_number} is on its way! 📦`,
    html: shell(
      `It's shipped, ${esc(order.customer_name)}!`,
      `<p>Your order ${orderTag(order.order_number)} has been handed to ${courier}.</p>
       ${customerItemsTable(items)}
       ${tracking}
       <p style="color:#4F648B;">Pan-India delivery usually takes a few days. Thank you for your patience 💕</p>`,
    ),
  }
}

export function orderStatusEmail(
  order: OrderLike,
  status: string,
  items: OrderItemLike[] = [],
): { subject: string; html: string } {
  const messages: Record<string, string> = {
    processing: `We've started making your order ${orderTag(order.order_number)} by hand.`,
    delivered: `Your order ${orderTag(order.order_number)} has been delivered — we hope you love it! 🥰`,
    cancelled: `Your order ${orderTag(order.order_number)} has been cancelled. If this is unexpected, just reply to this email.`,
  }
  return {
    subject: `Update on your J Charms order ${order.order_number}`,
    html: shell(
      `Hi ${esc(order.customer_name)},`,
      `<p>${messages[status] ?? `Your order status is now: <strong>${status}</strong>.`}</p>
       ${customerItemsTable(items)}`,
    ),
  }
}

/**
 * The "you have a new order" alert for the shop owner.
 *
 * Deliberately a packing slip rather than a nudge to go log in: items, sizes,
 * quantities, the full postal address and the customer's phone are all here, so
 * she can pack and write the India Post label straight from her inbox. Reply-to
 * is set to the customer, so hitting reply reaches the buyer directly.
 */
export function newOrderOwnerEmail(
  order: OwnerOrderLike,
  items: OrderItemLike[],
  opts: { adminUrl?: string } = {},
): { subject: string; html: string; replyTo: string } {
  const a = order.shipping_address ?? {}
  const addressLines = [
    esc(order.customer_name),
    esc(a.line1),
    esc(a.line2),
    [esc(a.city), esc(a.state)].filter(Boolean).join(', '),
    esc(a.pincode),
  ].filter((line) => line && line.trim() !== '')

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #DBE5F0;">
            ${esc(item.product_name)}
            ${item.variant_name ? `<span style="color:#8296B4;"> · ${esc(item.variant_name)}</span>` : ''}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #DBE5F0;text-align:center;white-space:nowrap;">
            × ${esc(item.quantity)}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #DBE5F0;text-align:right;white-space:nowrap;">
            ${inr(item.line_total)}
          </td>
        </tr>`,
    )
    .join('')

  // An order with no line rows shouldn't render a headerless empty table.
  const itemsTable = rows
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 16px;">${rows}</table>`
    : `<p style="color:#8296B4;">(No line items recorded — check the dashboard.)</p>`

  const totals = `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:2px 0;color:#4F648B;">Subtotal</td>
          <td style="padding:2px 0;text-align:right;">${inr(order.subtotal ?? 0)}</td></tr>
      <tr><td style="padding:2px 0;color:#4F648B;">Shipping</td>
          <td style="padding:2px 0;text-align:right;">${
            Number(order.shipping_fee ?? 0) === 0 ? 'Free' : inr(order.shipping_fee ?? 0)
          }</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;border-top:1px solid #DBE5F0;">Paid</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;border-top:1px solid #DBE5F0;">${inr(order.total)}</td></tr>
    </table>`

  const note = order.customer_note?.trim()
    ? `<div style="background:#EFF4FE;border-radius:12px;padding:12px 14px;margin:16px 0;">
         <strong style="color:#1747AC;">Note from the customer</strong>
         <p style="margin:6px 0 0;">${esc(order.customer_note)}</p>
       </div>`
    : ''

  const dashboardButton = opts.adminUrl
    ? `<p style="text-align:center;margin:24px 0 4px;">
         <a href="${esc(opts.adminUrl)}" style="display:inline-block;background:#15357A;color:#ffffff;
            text-decoration:none;font-weight:600;padding:11px 26px;border-radius:12px;
            font-family:Inter,Arial,sans-serif;">Open in dashboard</a>
       </p>`
    : ''

  return {
    subject: `New order ${order.order_number} · ${inr(order.total)} · ${order.customer_name}`,
    replyTo: order.customer_email,
    html: shell(
      'You have a new order! 🎉',
      `<p>Payment confirmed for ${orderTag(order.order_number)}.</p>
       <h2 style="font-family:Georgia,serif;color:#15357A;font-size:16px;margin:22px 0 4px;">Items</h2>
       ${itemsTable}
       ${totals}
       <h2 style="font-family:Georgia,serif;color:#15357A;font-size:16px;margin:22px 0 4px;">Ship to</h2>
       <p style="line-height:1.6;margin:4px 0;">${addressLines.join('<br>')}</p>
       <p style="margin:4px 0;color:#4F648B;">
         📞 ${esc(order.customer_phone)}<br>
         ✉️ ${esc(order.customer_email)}
       </p>
       ${note}
       ${dashboardButton}`,
      'J Charms admin notification · Reply to this email to reach the customer directly.',
    ),
  }
}

/**
 * One-time warm welcome, sent right after a new account's email is verified.
 * `storeUrl` / `instagramUrl` default to production-safe values but can be
 * overridden by the caller from env.
 */
export function welcomeEmail(
  name: string,
  opts: { storeUrl?: string; instagramUrl?: string } = {},
): { subject: string; html: string } {
  const storeUrl = opts.storeUrl ?? 'https://jcharms.example'
  const instagramUrl = opts.instagramUrl ?? 'https://instagram.com/j_.charms'
  const first = esc(name?.trim() ? name.trim().split(' ')[0] : 'there')
  return {
    subject: `Welcome to J Charms, ${first}! 🧶💕`,
    html: shell(
      `Welcome to the yarn club, ${first}!`,
      `<p>Your email is verified and your account is ready — we're so happy you're here. 🥰</p>
       <p style="color:#4F648B;">Every J Charms piece is crocheted by hand, one at a time. Browse the shop for
        ready-to-ship charms, or message us on Instagram to plan a custom piece that's entirely yours.</p>
       <p style="text-align:center;margin:28px 0 8px;">
         <a href="${storeUrl}" style="display:inline-block;background:#1747AC;color:#ffffff;text-decoration:none;
            font-weight:600;padding:12px 28px;border-radius:12px;font-family:Inter,Arial,sans-serif;">
           Start browsing
         </a>
       </p>
       <p style="text-align:center;color:#8296B4;font-size:13px;">
         Say hi anytime on <a href="${instagramUrl}" style="color:#1747AC;">Instagram</a>.
       </p>`,
      'Handmade with love, in India · You\'re receiving this because you created a J Charms account.',
    ),
  }
}
