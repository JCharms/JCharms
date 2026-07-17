import { BadgeCheck, MapPin, ShieldCheck, Truck } from 'lucide-react'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { deliveryEstimateLabel } from '@/lib/policy'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * The four reassurances a first-time buyer of handmade goods wants before
 * paying a stranger: the money is safe, the thing is good, it's genuinely
 * handmade here, and it will actually turn up.
 *
 * Delivery and shipping copy read from site_settings, so the promise made here
 * can't drift from what checkout charges.
 */
export function TrustBadges({ className }: { className?: string }) {
  const { data: config } = useSiteConfig()

  const delivery = config ? deliveryEstimateLabel(config) : ''
  const freeOver = config?.freeShippingOver ?? 0

  const badges = [
    {
      icon: ShieldCheck,
      title: 'Secure payment',
      body: 'UPI, cards & netbanking through Razorpay. Your card details never touch our site.',
    },
    {
      icon: BadgeCheck,
      title: 'Assured quality',
      body: 'Every piece is checked by hand and packed with care before it leaves us.',
    },
    {
      icon: MapPin,
      title: 'Made in India',
      body: 'Crocheted one at a time, at home — never mass-produced.',
    },
    {
      icon: Truck,
      title: delivery ? `Delivered in ${delivery}` : 'Timely delivery',
      body:
        freeOver > 0
          ? `Tracked all the way to your door. Free over ${formatINR(freeOver)}.`
          : 'Tracked all the way to your door.',
    },
  ]

  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-6 rounded-2xl border border-ivory-300 bg-white/70 px-5 py-7 sm:px-8 lg:grid-cols-4',
        className,
      )}
    >
      {badges.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink">
            <Icon size={26} strokeWidth={1.75} aria-hidden />
          </span>
          <p className="mt-3 font-display text-base text-indigo">{title}</p>
          <p className="mt-1 max-w-[22ch] text-xs leading-relaxed text-ink-muted">{body}</p>
        </li>
      ))}
    </ul>
  )
}
