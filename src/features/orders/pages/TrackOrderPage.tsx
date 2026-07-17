import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, PackageSearch } from 'lucide-react'
import { trackOrder } from '@/data/orders'
import { OrderCard } from '@/features/orders/components/OrderCard'
import { Button, Input, Card, EmptyState } from '@/components/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'
import type { OrderWithItems } from '@/types/domain'

const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
/** "+91 98765 43210" / "098765-43210" → "9876543210", else null. */
const toMobile = (v: string): string | null => {
  const digits = v.replace(/[\s()-]/g, '').replace(/^(\+91|91|0)/, '')
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

const schema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(1, 'Enter your order number (e.g. JC-1000)')
    // Accept "1000", "jc-1000" or "JC1000": the number is retyped off an email,
    // so the exact shape is a coin toss and the lookup is an exact match.
    .transform((v) => {
      const clean = v.toUpperCase().replace(/\s/g, '')
      return /^\d+$/.test(clean) ? `JC-${clean}` : clean.replace(/^JC-?/, 'JC-')
    })
    .pipe(
      z
        .string()
        .regex(/^JC-\d+$/, 'Order numbers look like JC-1000 — check your confirmation email'),
    ),
  contact: z
    .string()
    .trim()
    .min(1, 'Enter the email or phone from your order')
    // Normalise here so the stored value is what gets compared — checkout saves
    // a bare 10-digit number, so sending "+91…" would never match.
    .transform((v) => toMobile(v) ?? v.toLowerCase())
    .pipe(
      z
        .string()
        .refine(
          (v) => isEmail(v) || toMobile(v) !== null,
          'Enter the email address or 10-digit mobile number you used on the order',
        ),
    ),
})
type Values = z.infer<typeof schema>

/**
 * Guest order tracking. Looks up via the track-order Edge Function, which
 * requires order number + matching contact (orders have no anon DB access).
 */
export function TrackOrderPage() {
  const [params] = useSearchParams()
  const [result, setResult] = useState<OrderWithItems | null | 'none'>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { orderNumber: params.get('order') ?? '' },
  })

  async function onSubmit(values: Values) {
    setLoading(true)
    setResult(null)
    try {
      const order = await trackOrder({
        orderNumber: values.orderNumber,
        contact: values.contact,
      })
      setResult(order ?? 'none')
    } catch {
      setResult('none')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-4xl text-indigo">Track your order</h1>
        <RunningStitch className="mx-auto mt-3 max-w-[140px] text-pink" />
        <p className="mt-3 text-sm text-ink-muted">
          Pop in your order number and the email or phone you used at checkout.
        </p>
      </div>

      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Order number"
            placeholder="JC-1000"
            {...register('orderNumber')}
            error={errors.orderNumber?.message}
          />
          <Input
            label="Email or phone"
            placeholder="you@email.com or 9876543210"
            {...register('contact')}
            error={errors.contact?.message}
          />
          <Button type="submit" fullWidth size="lg" isLoading={loading}>
            <Search size={18} /> Find my order
          </Button>
        </form>
      </Card>

      <div className="mt-8">
        {result === 'none' && (
          <EmptyState
            icon={PackageSearch}
            title="No matching order found"
            description="Double-check your order number and the contact details you used. Still stuck? Message us on Instagram."
          />
        )}
        {result && result !== 'none' && <OrderCard order={result} />}
      </div>
    </div>
  )
}
