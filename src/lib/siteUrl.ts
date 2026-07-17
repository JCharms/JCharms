import { env } from './env'

/**
 * Absolute URLs back into this site, for links that leave the browser and have
 * to find their way home — Supabase auth emails, mainly.
 *
 * Why not just `window.location.origin`? Supabase only honours a `redirectTo`
 * that matches its **Redirect URLs** allow-list; anything else silently falls
 * back to the project's **Site URL**. So every origin the app can be served
 * from (localhost, Netlify deploy previews, the live domain) would need to be
 * allow-listed, or its emails land somewhere unhelpful.
 *
 * Setting `VITE_SITE_URL` to the canonical domain pins every emailed link to
 * the one origin that's allow-listed, whichever origin generated it. Left
 * unset (local dev), it falls back to the current origin.
 *
 * See DEVELOPER_GUIDE.md → "Auth email redirects" for the matching dashboard
 * settings; both halves are required.
 */
export function siteUrl(path = '/'): string {
  const base = env.siteUrl || window.location.origin
  // `new URL` normalises the join, so callers needn't care about slashes and a
  // trailing-slash mismatch can't quietly break the allow-list match.
  return new URL(path, base).toString()
}
