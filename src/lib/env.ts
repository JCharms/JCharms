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
} as const
