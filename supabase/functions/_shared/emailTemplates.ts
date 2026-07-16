/** Branded transactional email templates (inline styles — email clients need them). */

interface OrderLike {
  order_number: string
  customer_name: string
  total: number
  tracking_number?: string | null
  courier?: string | null
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

function shell(
  title: string,
  body: string,
  footer = "Handmade with love, in India · You're receiving this because you placed an order with J Charms.",
): string {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#FDFAF4;padding:32px 0;color:#22223B;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(34,34,59,.08);">
      <div style="background:#1B1B4E;padding:24px 28px;">
        <span style="font-family:Georgia,serif;font-size:24px;color:#FDFAF4;font-weight:600;">J Charms</span>
      </div>
      <div style="padding:28px;">
        <h1 style="font-family:Georgia,serif;color:#1B1B4E;font-size:22px;margin:0 0 12px;">${title}</h1>
        ${body}
      </div>
      <div style="padding:18px 28px;background:#FDFAF4;border-top:1px solid #EEE3CD;font-size:12px;color:#8A8AA3;text-align:center;">
        ${footer}
      </div>
    </div>
  </div>`
}

const orderTag = (n: string) =>
  `<span style="font-family:'JetBrains Mono',monospace;background:#FEF0F4;color:#D02259;padding:4px 10px;border-radius:8px;font-weight:600;">${n}</span>`

export function orderConfirmationEmail(order: OrderLike): { subject: string; html: string } {
  return {
    subject: `Your J Charms order ${order.order_number} is confirmed 🧶`,
    html: shell(
      `Thank you, ${order.customer_name}!`,
      `<p>We've received your order ${orderTag(order.order_number)} and payment of
        <strong>${inr(order.total)}</strong>. We'll start stitching soon!</p>
       <p style="color:#565676;">You'll get another note the moment it ships. You can also track it anytime with your order number.</p>`,
    ),
  }
}

export function orderShippedEmail(order: OrderLike): { subject: string; html: string } {
  const tracking = order.tracking_number
    ? `<p>Tracking number: <strong>${order.tracking_number}</strong> (${order.courier ?? 'India Post'})</p>`
    : ''
  return {
    subject: `Your J Charms order ${order.order_number} is on its way! 📦`,
    html: shell(
      `It's shipped, ${order.customer_name}!`,
      `<p>Your order ${orderTag(order.order_number)} has been handed to ${order.courier ?? 'India Post'}.</p>
       ${tracking}
       <p style="color:#565676;">Pan-India delivery usually takes a few days. Thank you for your patience 💕</p>`,
    ),
  }
}

export function orderStatusEmail(
  order: OrderLike,
  status: string,
): { subject: string; html: string } {
  const messages: Record<string, string> = {
    processing: `We've started making your order ${orderTag(order.order_number)} by hand.`,
    delivered: `Your order ${orderTag(order.order_number)} has been delivered — we hope you love it! 🥰`,
    cancelled: `Your order ${orderTag(order.order_number)} has been cancelled. If this is unexpected, just reply to this email.`,
  }
  return {
    subject: `Update on your J Charms order ${order.order_number}`,
    html: shell(
      `Hi ${order.customer_name},`,
      `<p>${messages[status] ?? `Your order status is now: <strong>${status}</strong>.`}</p>`,
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
  const first = name?.trim() ? name.trim().split(' ')[0] : 'there'
  return {
    subject: `Welcome to J Charms, ${first}! 🧶💕`,
    html: shell(
      `Welcome to the yarn club, ${first}!`,
      `<p>Your email is verified and your account is ready — we're so happy you're here. 🥰</p>
       <p style="color:#565676;">Every J Charms piece is crocheted by hand, one at a time. Browse the shop for
        ready-to-ship charms, or message us on Instagram to plan a custom piece that's entirely yours.</p>
       <p style="text-align:center;margin:28px 0 8px;">
         <a href="${storeUrl}" style="display:inline-block;background:#D02259;color:#ffffff;text-decoration:none;
            font-weight:600;padding:12px 28px;border-radius:12px;font-family:Inter,Arial,sans-serif;">
           Start browsing
         </a>
       </p>
       <p style="text-align:center;color:#8A8AA3;font-size:13px;">
         Say hi anytime on <a href="${instagramUrl}" style="color:#D02259;">Instagram</a>.
       </p>`,
      'Handmade with love, in India · You\'re receiving this because you created a J Charms account.',
    ),
  }
}
