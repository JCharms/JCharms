import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, ShoppingBag } from 'lucide-react'
import { checkoutSchema, type CheckoutFormValues } from './schema'
import { useCheckout } from './useCheckout'
import { useCartStore, selectSubtotal } from '@/store/cart'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useAuthStore } from '@/features/auth/authStore'
import { deliveryEstimateLabel, shippingForSubtotal } from '@/lib/policy'
import { Button, Input, Select, Textarea, Card, Price } from '@/components/ui'
import { ProductImage } from '@/features/products/components/ProductImage'
import { INDIAN_STATES } from '@/lib/indianStates'
import { formatINR } from '@/lib/format'

export function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore(selectSubtotal)
  const { data: config } = useSiteConfig()
  const user = useAuthStore((s) => s.user)
  const { placeOrder, isPlacing } = useCheckout()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    // Flag mistakes as they leave each field rather than in one wall of red at
    // the end — this is the longest form on the site.
    mode: 'onTouched',
    defaultValues: { customerEmail: user?.email ?? '' },
  })

  useEffect(() => {
    if (items.length === 0) navigate('/shop', { replace: true })
  }, [items.length, navigate])

  const shipping = config ? shippingForSubtotal(config, subtotal) : 0
  const total = subtotal + shipping
  const wantsAccount = watch('createAccount')
  const deliveryEstimate = config ? deliveryEstimateLabel(config) : ''

  if (items.length === 0) return null

  // Master switch — the owner can pause on-site checkout from admin settings.
  if (config && !config.storeOpen) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-indigo">We're on a little break 🧶</h1>
        <p className="mt-3 text-ink-muted">
          On-site checkout is paused right now. Your bag is saved — please check
          back soon, or reach us on Instagram to order.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl text-indigo">Checkout</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
        <Lock size={14} /> Secure payment via Razorpay
      </p>

      <form
        onSubmit={handleSubmit(placeOrder)}
        className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]"
      >
        {/* Details */}
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <h2 className="font-display text-xl text-indigo">Your details</h2>
            <Input
              label="Full name"
              autoComplete="name"
              {...register('customerName')}
              error={errors.customerName?.message}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                {...register('customerEmail')}
                error={errors.customerEmail?.message}
                hint="Your order confirmation goes here."
              />
              <Input
                label="Mobile number"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit"
                {...register('customerPhone')}
                error={errors.customerPhone?.message}
                hint="So the courier can reach you."
              />
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="font-display text-xl text-indigo">Shipping address</h2>
            <Input
              label="Address line 1"
              autoComplete="address-line1"
              placeholder="Flat / house no., building, street"
              {...register('line1')}
              error={errors.line1?.message}
            />
            <Input
              label="Address line 2 (optional)"
              autoComplete="address-line2"
              placeholder="Area, landmark"
              {...register('line2')}
              error={errors.line2?.message}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="City"
                autoComplete="address-level2"
                {...register('city')}
                error={errors.city?.message}
              />
              {/* Was a free-text field, which accepted anything at all. */}
              <Select
                label="State"
                autoComplete="address-level1"
                defaultValue=""
                {...register('state')}
                error={errors.state?.message}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Select>
              <Input
                label="Pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                {...register('pincode')}
                error={errors.pincode?.message}
              />
            </div>
            <Textarea label="Order note (optional)" rows={3} {...register('customerNote')} error={errors.customerNote?.message} />
          </Card>

          {/* Optional account — a side-offer, never a gate (spec §5). */}
          {!user && (
            <Card className="space-y-3 p-6">
              <label className="flex items-start gap-3">
                <input type="checkbox" {...register('createAccount')} className="mt-1 h-4 w-4 accent-pink" />
                <span>
                  <span className="font-medium text-ink">Create an account to track orders faster next time</span>
                  <span className="block text-sm text-ink-faint">Optional — you can always check out as a guest.</span>
                </span>
              </label>
              {wantsAccount && (
                <Input
                  label="Choose a password"
                  type="password"
                  {...register('password')}
                  error={errors.password?.message}
                  hint="At least 6 characters"
                />
              )}
            </Card>
          )}
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-24 space-y-4 p-6">
            <h2 className="font-display text-xl text-indigo">Order summary</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage path={item.imagePath} isPlaceholder={!item.imagePath} name={item.name} className="h-full w-full" />
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-ink-faint">
                        {item.variantName ? `${item.variantName} · ` : ''}Qty {item.quantity}
                      </p>
                    </div>
                    <Price amount={item.unitPrice * item.quantity} size="sm" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-dashed border-ivory-300 pt-4 text-sm">
              <Row label="Subtotal" value={<Price amount={subtotal} size="sm" />} />
              <Row label={shipping === 0 ? 'Shipping (free!)' : 'Shipping'} value={<Price amount={shipping} size="sm" />} />
              <div className="flex items-center justify-between pt-2 font-semibold text-ink">
                <span>Total</span>
                <Price amount={total} />
              </div>
            </div>
            <Button type="submit" size="lg" fullWidth isLoading={isPlacing}>
              <ShoppingBag size={18} /> Pay {formatINR(total)} securely
            </Button>
            {/* The two things people ask after paying — said before they do. */}
            {config && (
              <p className="text-center text-xs leading-relaxed text-ink-faint">
                {deliveryEstimate && <>Delivery in {deliveryEstimate}. </>}
                Handmade to order, so returns aren't available —{' '}
                <Link to="/policies" className="stitch-underline text-pink-600">
                  see our policy
                </Link>
                .
              </p>
            )}
            <Link to="/shop" className="block text-center text-sm text-ink-muted hover:text-indigo">
              Continue shopping
            </Link>
          </Card>
        </div>
      </form>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-ink-muted">
      <span>{label}</span>
      {value}
    </div>
  )
}
