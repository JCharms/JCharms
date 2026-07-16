/** Builders for external links (Instagram DM redirects, etc.). */

const FALLBACK_HANDLE = 'j_.charms'

export function instagramProfileUrl(handle?: string): string {
  return `https://instagram.com/${handle || FALLBACK_HANDLE}`
}

/**
 * Instagram DM deep link for custom / dm_only products. Instagram has no public
 * "prefilled DM" URL, so we open the profile's DM surface; the customer taps
 * Message. Optionally pass a product name for future query use.
 */
export function instagramDmUrl(handle?: string, _productName?: string): string {
  return `https://ig.me/m/${handle || FALLBACK_HANDLE}`
}
