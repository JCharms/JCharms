/**
 * Email provider abstraction (spec §3d). Handlers call sendEmail(); swapping
 * Resend for another provider means reimplementing this one file.
 */
export interface EmailMessage {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>
}

class ResendProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        reply_to: message.replyTo,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Resend send failed (${res.status}): ${detail}`)
    }
  }
}

/** No-op provider used when email isn't configured (local dev), so order flow
 *  never breaks just because RESEND_API_KEY is unset. */
class NoopEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[email:noop] would send "${message.subject}" to ${message.to}`)
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('ORDER_EMAIL_FROM') ?? 'J Charms <orders@jcharms.example>'
  if (!apiKey) return new NoopEmailProvider()
  return new ResendProvider(apiKey, from)
}
