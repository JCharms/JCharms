/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Bitbew — "Designed & built by" footer credit.        DROP-IN / COPY-PASTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Paste this one file into any React + Tailwind project and render
 *  `<BuiltByBitbew />` as the last thing inside the <footer>. That's it.
 *
 *  It is deliberately self-contained:
 *    · no imports — not even React (the modern JSX transform doesn't need it),
 *      so there is nothing to install and no path alias to fix up;
 *    · no image files — the wordmark is inlined as a base64 PNG (2 KB), so
 *      there is no /public asset to remember to copy across;
 *    · stock Tailwind classes only — no custom design tokens, no `cn()` helper.
 *
 *  Two links, on purpose:
 *    · the wordmark opens bitbew.com     — for someone browsing;
 *    · the number opens a WhatsApp chat  — for someone ready to talk, with the
 *      first message already typed for them. A `tel:` link fires a call dialog,
 *      which on desktop does nothing useful and on mobile is a bigger ask than
 *      most curious visitors will make.
 *
 *  Tone it to the footer it sits on: `tone="dark"` (default) for a dark footer,
 *  `tone="light"` for a pale one. Everything else has a sensible default.
 */

export interface BuiltByBitbewProps {
  /** WhatsApp number in international form. Non-digits are stripped. */
  phone?: string
  /** How the number reads on screen. */
  phoneLabel?: string
  /**
   * Pre-filled first message. NOTE: WhatsApp pre-fills the *visitor's* outgoing
   * message, so this is written in their voice, not ours — the "here's who we
   * are" reply belongs in a WhatsApp Business greeting/away message.
   */
  message?: string
  /** Where the wordmark points. */
  site?: string
  /** Lead-in text before the wordmark. */
  prefix?: string
  /** Match the footer underneath: light ink on dark, or dark ink on light. */
  tone?: 'dark' | 'light'
  /** Extra classes on the outer strip (spacing, borders, background…). */
  className?: string
}

/** Bitbew wordmark, 231×42, white-on-transparent. */
const LOGO_SRC =
  'data:image/png;base64,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'

/** WhatsApp glyph (Simple Icons, CC0) — inlined so there's no icon dependency. */
const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'

/**
 * ASCII only, on purpose. Percent-encoding an emoji here is perfectly valid,
 * but the browser → WhatsApp Desktop protocol handoff mangles non-BMP
 * characters on Windows and the visitor sees a "?" box sitting in their
 * composer. Not worth risking a first impression on decoration.
 */
const DEFAULT_MESSAGE =
  "Hi Bitbew! I came across a website you built and I'd love one for my business."

export function BuiltByBitbew({
  phone = '918146622525',
  phoneLabel = '+91 81466 22525',
  message = DEFAULT_MESSAGE,
  site = 'https://bitbew.com',
  prefix = 'Designed & built by',
  tone = 'dark',
  className = '',
}: BuiltByBitbewProps) {
  // wa.me takes digits only — no +, spaces or dashes.
  const chatUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

  const dark = tone === 'dark'
  const border = dark ? 'border-white/10' : 'border-black/10'
  const muted = dark ? 'text-white/50' : 'text-black/45'
  const bright = dark ? 'hover:text-white/90' : 'hover:text-black/80'
  // The wordmark PNG is white, so it needs inverting on a pale footer.
  const logoTone = dark ? '' : 'invert'

  return (
    <div className={`border-t ${border} px-4 py-3.5 ${className}`}>
      <p
        className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] ${muted}`}
      >
        <span>{prefix}</span>

        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Bitbew — opens in a new tab"
          className="inline-flex"
        >
          <img
            src={LOGO_SRC}
            alt="Bitbew"
            width={231}
            height={42}
            loading="lazy"
            decoding="async"
            className={`h-3.5 w-auto opacity-70 transition-opacity hover:opacity-100 ${logoTone}`}
          />
        </a>

        <span aria-hidden>·</span>

        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Chat with Bitbew on WhatsApp at ${phoneLabel}`}
          title="Chat with us on WhatsApp"
          className={`inline-flex items-center gap-1.5 tabular-nums transition-colors ${bright}`}
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="currentColor"
            aria-hidden
            className="shrink-0"
          >
            <path d={WHATSAPP_PATH} />
          </svg>
          {phoneLabel}
        </a>
      </p>
    </div>
  )
}
