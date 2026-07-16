import { supabase } from '@/lib/supabaseClient'
import { unwrapList } from './_helpers'
import type { Json, SiteSetting } from '@/types/database'

/**
 * Typed access to admin-editable site config (spec §3c). The storefront reads
 * these instead of hardcoding shipping fees, handles, banner text, etc.
 */
export interface SiteConfig {
  shippingFee: number
  freeShippingOver: number
  instagramHandle: string
  supportEmail: string
  supportPhone: string
  announcement: { enabled: boolean; text: string }
  storeOpen: boolean
}

const DEFAULTS: SiteConfig = {
  shippingFee: 80,
  freeShippingOver: 0,
  instagramHandle: 'j_.charms',
  supportEmail: '',
  supportPhone: '',
  announcement: { enabled: false, text: '' },
  storeOpen: true,
}

/** Read every setting and shape it into a typed config object. */
export async function getSiteConfig(): Promise<SiteConfig> {
  const rows = unwrapList(
    await supabase.from('site_settings').select('*'),
    'getSiteConfig',
  )
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const num = (k: string, d: number) => {
    const v = map.get(k)
    return typeof v === 'number' ? v : d
  }
  const str = (k: string, d: string) => {
    const v = map.get(k)
    return typeof v === 'string' ? v : d
  }
  return {
    shippingFee: num('shipping_fee', DEFAULTS.shippingFee),
    freeShippingOver: num('free_shipping_over', DEFAULTS.freeShippingOver),
    instagramHandle: str('instagram_handle', DEFAULTS.instagramHandle),
    supportEmail: str('support_email', DEFAULTS.supportEmail),
    supportPhone: str('support_phone', DEFAULTS.supportPhone),
    announcement:
      (map.get('announcement') as SiteConfig['announcement']) ?? DEFAULTS.announcement,
    storeOpen: (map.get('store_open') as boolean) ?? DEFAULTS.storeOpen,
  }
}

/** Compute the shipping fee for a given subtotal using config thresholds. */
export function shippingForSubtotal(config: SiteConfig, subtotal: number): number {
  if (config.freeShippingOver > 0 && subtotal >= config.freeShippingOver) return 0
  return config.shippingFee
}

// ── Admin ───────────────────────────────────────────────────────────────────
/** Raw settings rows for the admin settings form. */
export async function adminListSettings(): Promise<SiteSetting[]> {
  return unwrapList(
    await supabase.from('site_settings').select('*').order('key'),
    'adminListSettings',
  )
}

export async function updateSetting(key: string, value: Json): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .update({ value })
    .eq('key', key)
  if (error) throw new Error(`[updateSetting:${key}] ${error.message}`)
}

/** Upsert several settings at once (settings form save). */
export async function saveSettings(entries: Record<string, Json>): Promise<void> {
  const results = await Promise.all(
    Object.entries(entries).map(([key, value]) =>
      supabase.from('site_settings').update({ value }).eq('key', key),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(`[saveSettings] ${failed.error.message}`)
}
