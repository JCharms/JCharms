/**
 * Store policy: the shape of the owner's settings, and the pure maths derived
 * from them (shipping charges, delivery wording).
 *
 * Deliberately free of any Supabase import — `src/data/settings.ts` owns
 * *reading* these values, this module owns what they *mean*. Keeping the rules
 * in one dependency-free place means every surface (product page, cart,
 * checkout, policy page) quotes identical numbers, and the maths can be
 * exercised on its own.
 */

export interface SiteConfig {
  shippingFee: number
  freeShippingOver: number
  deliveryDaysMin: number
  deliveryDaysMax: number
  returnsPolicy: string
  instagramHandle: string
  supportEmail: string
  supportPhone: string
  announcement: { enabled: boolean; text: string }
  storeOpen: boolean
}

/** Fallbacks used when a settings row is missing or malformed. */
export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  shippingFee: 80,
  freeShippingOver: 0,
  deliveryDaysMin: 12,
  deliveryDaysMax: 15,
  returnsPolicy: '',
  instagramHandle: 'j_.charms',
  supportEmail: '',
  supportPhone: '',
  announcement: { enabled: false, text: '' },
  storeOpen: true,
}

/**
 * Shipping fee for a given subtotal.
 *
 * Mirrors the authoritative calculation in the create-razorpay-order Edge
 * Function — the server is what actually charges, this is what we promise.
 */
export function shippingForSubtotal(config: SiteConfig, subtotal: number): number {
  if (config.freeShippingOver > 0 && subtotal >= config.freeShippingOver) return 0
  return config.shippingFee
}

/**
 * How far the subtotal is from free shipping, or null when it doesn't apply
 * (threshold disabled, or already qualified).
 */
export function amountToFreeShipping(config: SiteConfig, subtotal: number): number | null {
  if (config.freeShippingOver <= 0 || subtotal >= config.freeShippingOver) return null
  return config.freeShippingOver - subtotal
}

/**
 * Mirrors public.stock_type. Declared structurally rather than imported so this
 * module keeps its no-dependencies promise (same trick as src/lib/stock.ts).
 */
type StockKind = 'ready_stock' | 'made_to_order'

export interface ReturnsNote {
  /** Bolded lead — the product fact this follows from. */
  heading: string
  /** What it means for the buyer, in one sentence. */
  detail: string
}

/**
 * The line shown on a product page at the point of deciding: the one thing that
 * can't be undone after buying.
 *
 * Split by stock type because the *reason* differs even though the rule doesn't.
 * "Stitched just for you" is true of a crocheted bouquet and plainly false of a
 * bought-in claw clip, and a shopper who reads it on a claw clip stops trusting
 * the rest of the page.
 *
 * Both variants deliberately stay short and defer to the full policy rather than
 * restating it. The authoritative text is the `returns_policy` site setting,
 * editable in admin → Settings; **if that setting is ever changed to allow
 * returns, these two sentences must change with it.** They are hardcoded because
 * they are one-line summaries, not the policy itself.
 */
export function returnsNoteFor(stockType: StockKind): ReturnsNote {
  if (stockType === 'made_to_order') {
    return {
      heading: 'Made to order',
      detail: "stitched just for you, so it isn't eligible for return.",
    }
  }
  return {
    heading: 'Ready to ship',
    detail: "sent from our shelf, so it's on its way quickly — returns and exchanges aren't available.",
  }
}

/** "12–15 days" — the delivery window in words. */
export function deliveryEstimateLabel(config: SiteConfig): string {
  const { deliveryDaysMin: min, deliveryDaysMax: max } = config
  if (!min && !max) return ''
  if (!min || !max) return `${max || min} days`
  return min === max ? `${min} days` : `${min}–${max} days`
}
