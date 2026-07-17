import { supabase } from '@/lib/supabaseClient'
import { unwrapList } from './_helpers'
import { SITE_CONFIG_DEFAULTS as DEFAULTS, type SiteConfig } from '@/lib/policy'
import type { Json, SiteSetting } from '@/types/database'

/**
 * Typed access to admin-editable site config (spec §3c). The storefront reads
 * these instead of hardcoding shipping fees, handles, banner text, etc.
 *
 * This module owns *reading* the settings; what they mean (shipping maths,
 * delivery wording) lives in `@/lib/policy` alongside the SiteConfig shape.
 */
export type { SiteConfig }

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
    deliveryDaysMin: num('delivery_days_min', DEFAULTS.deliveryDaysMin),
    deliveryDaysMax: num('delivery_days_max', DEFAULTS.deliveryDaysMax),
    returnsPolicy: str('returns_policy', DEFAULTS.returnsPolicy),
    instagramHandle: str('instagram_handle', DEFAULTS.instagramHandle),
    supportEmail: str('support_email', DEFAULTS.supportEmail),
    supportPhone: str('support_phone', DEFAULTS.supportPhone),
    announcement:
      (map.get('announcement') as SiteConfig['announcement']) ?? DEFAULTS.announcement,
    storeOpen: (map.get('store_open') as boolean) ?? DEFAULTS.storeOpen,
  }
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
