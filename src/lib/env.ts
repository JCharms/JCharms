/**
 * Centralised, validated access to client-side env vars.
 * Fails loudly at startup if a required var is missing, rather than
 * surfacing a confusing runtime error deep in a Supabase call.
 */
function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill it in.`,
    )
  }
  return value
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  // Optional at build time — checkout guards for its presence.
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID ?? '',
  /**
   * Canonical public origin, e.g. https://jcharms.netlify.app — no trailing
   * slash. Optional: empty falls back to the current origin (see lib/siteUrl).
   * Set it in production so auth emails always link to the live site.
   */
  siteUrl: (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, ''),
} as const
