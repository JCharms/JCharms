/**
 * Payment provider abstraction (spec §3d).
 *
 * Business logic in the functions calls this interface, never the Razorpay SDK
 * directly. To switch providers, implement PaymentProvider once here — no
 * function handler changes.
 */
export interface CreateOrderInput {
  amountPaise: number
  currency: 'INR'
  receipt: string
  notes?: Record<string, string>
}

export interface ProviderOrder {
  id: string
  amount: number
  currency: string
}

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<ProviderOrder>
  verifyPaymentSignature(input: {
    orderId: string
    paymentId: string
    signature: string
  }): Promise<boolean>
  verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean>
  readonly keyId: string
}

// ── Web Crypto HMAC-SHA256 → hex ────────────────────────────────────────────
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Constant-time-ish comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ── Razorpay implementation ─────────────────────────────────────────────────
class RazorpayProvider implements PaymentProvider {
  constructor(
    readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret: string,
  ) {}

  async createOrder(input: CreateOrderInput): Promise<ProviderOrder> {
    const auth = btoa(`${this.keyId}:${this.keySecret}`)
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Razorpay createOrder failed (${res.status}): ${detail}`)
    }
    const data = await res.json()
    return { id: data.id, amount: data.amount, currency: data.currency }
  }

  async verifyPaymentSignature(input: {
    orderId: string
    paymentId: string
    signature: string
  }): Promise<boolean> {
    const expected = await hmacHex(this.keySecret, `${input.orderId}|${input.paymentId}`)
    return safeEqual(expected, input.signature)
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    const expected = await hmacHex(this.webhookSecret, rawBody)
    return safeEqual(expected, signature)
  }
}

/** Factory — reads secrets from the environment (never hardcoded). */
export function getPaymentProvider(): PaymentProvider {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured (RAZORPAY_KEY_ID/SECRET).')
  }
  return new RazorpayProvider(keyId, keySecret, webhookSecret)
}
