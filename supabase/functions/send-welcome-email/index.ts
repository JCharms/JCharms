import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleOptions, json } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { getEmailProvider } from '../_shared/services/email.ts'
import { welcomeEmail } from '../_shared/emailTemplates.ts'

/**
 * Sends the one-time warm welcome email after a new account's email is verified.
 *
 * Called from the browser (with the user's JWT) as soon as the client sees a
 * confirmed session that hasn't been welcomed yet. It is idempotent: a
 * `welcomed` flag is written to the user's app_metadata *before* sending, so a
 * reload or a stale JWT can never trigger a duplicate. app_metadata (not
 * user_metadata) is used because it is not user-editable.
 */
Deno.serve(async (req) => {
  const pre = handleOptions(req)
  if (pre) return pre

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Not authenticated.' }, 401)

    // Resolve the calling user from their JWT.
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Not authenticated.' }, 401)

    // Only welcome verified accounts, and only once.
    if (!user.email_confirmed_at) return json({ skipped: 'unconfirmed' })

    const admin = createAdminClient()
    // Re-read server-side so a stale JWT flag can't cause a double send.
    const { data: fresh } = await admin.auth.admin.getUserById(user.id)
    const appMeta = fresh?.user?.app_metadata ?? {}
    if (appMeta.welcomed) return json({ skipped: 'already' })

    // Mark welcomed first — a failed send is better than a duplicate one.
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...appMeta, welcomed: true },
    })

    const name = (user.user_metadata?.full_name as string | undefined) ?? 'there'
    const { subject, html } = welcomeEmail(name, {
      storeUrl: Deno.env.get('SITE_URL') ?? undefined,
      instagramUrl: Deno.env.get('INSTAGRAM_URL') ?? undefined,
    })
    await getEmailProvider().send({ to: user.email!, subject, html })

    return json({ ok: true })
  } catch (err) {
    console.error('[send-welcome-email]', err)
    return json({ error: (err as Error).message ?? 'Failed to send welcome.' }, 400)
  }
})
