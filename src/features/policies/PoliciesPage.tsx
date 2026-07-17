import { Link } from 'react-router-dom'
import { PackageCheck, RotateCcw, Truck } from 'lucide-react'
// lucide's brand icons are deprecated — see StorefrontLayout.
import { SiInstagram } from 'react-icons/si'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { deliveryEstimateLabel } from '@/lib/policy'
import { Card, LoadingBlock } from '@/components/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'
import { instagramProfileUrl } from '@/lib/links'
import { formatINR } from '@/lib/format'

/**
 * Shipping, delivery and returns in one place.
 *
 * Every figure here is read from site_settings — the same source the cart and
 * the server-side order maths use — so the page can never quote a threshold the
 * checkout doesn't honour.
 */
export function PoliciesPage() {
  const { data: config, isLoading } = useSiteConfig()

  if (isLoading || !config) return <LoadingBlock label="One moment…" />

  const delivery = deliveryEstimateLabel(config)
  const freeOver = config.freeShippingOver

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <h1 className="font-display text-4xl text-indigo">Shipping &amp; returns</h1>
        <RunningStitch className="mx-auto mt-3 max-w-[140px] text-pink" />
        <p className="mx-auto mt-4 max-w-lg text-ink-muted">
          Everything here is stitched by hand, one piece at a time. Here's exactly
          what to expect once you order.
        </p>
      </header>

      <div className="mt-10 space-y-5">
        <Card className="flex gap-4 p-6">
          <Icon>
            <Truck size={20} />
          </Icon>
          <div>
            <h2 className="font-display text-xl text-indigo">Delivery</h2>
            {delivery && (
              <p className="mt-2 text-ink-muted">
                Orders usually reach you in{' '}
                <strong className="text-ink">{delivery}</strong> from the day they're
                placed. That covers the time to make your piece by hand plus transit —
                so it's a little slower than a factory shop, and a lot more personal.
              </p>
            )}
            <p className="mt-2 text-sm text-ink-faint">
              We ship across India. You'll get an email at every step, and you can
              check in anytime on the{' '}
              <Link to="/track" className="stitch-underline font-medium text-pink-600">
                order tracking page
              </Link>
              .
            </p>
          </div>
        </Card>

        <Card className="flex gap-4 p-6">
          <Icon>
            <PackageCheck size={20} />
          </Icon>
          <div>
            <h2 className="font-display text-xl text-indigo">Shipping charges</h2>
            {freeOver > 0 ? (
              <p className="mt-2 text-ink-muted">
                Shipping is <strong className="text-ink">free on orders over {formatINR(freeOver)}</strong>.
                Below that, a flat {formatINR(config.shippingFee)} is added at checkout —
                you'll always see it before you pay.
              </p>
            ) : (
              <p className="mt-2 text-ink-muted">
                A flat {formatINR(config.shippingFee)} shipping charge is added at
                checkout — you'll always see it before you pay.
              </p>
            )}
          </div>
        </Card>

        <Card className="flex gap-4 p-6">
          <Icon>
            <RotateCcw size={20} />
          </Icon>
          <div>
            <h2 className="font-display text-xl text-indigo">Returns</h2>
            {config.returnsPolicy ? (
              <p className="mt-2 whitespace-pre-line text-ink-muted">{config.returnsPolicy}</p>
            ) : (
              <p className="mt-2 text-ink-muted">
                Because every piece is made to order by hand, we're not able to accept
                returns or exchanges.
              </p>
            )}
          </div>
        </Card>

        <Card className="flex gap-4 p-6">
          <Icon>
            <SiInstagram size={19} aria-hidden />
          </Icon>
          <div>
            <h2 className="font-display text-xl text-indigo">Still have a question?</h2>
            <p className="mt-2 text-ink-muted">
              The quickest way to reach us is a DM — we're happy to talk through
              custom orders, colours and sizes.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <a
                href={instagramProfileUrl(config.instagramHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="stitch-underline font-medium text-pink-600"
              >
                @{config.instagramHandle}
              </a>
              {config.supportEmail && (
                <a
                  href={`mailto:${config.supportEmail}`}
                  className="stitch-underline font-medium text-indigo"
                >
                  {config.supportEmail}
                </a>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink">
      {children}
    </span>
  )
}
