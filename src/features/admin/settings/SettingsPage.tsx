import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useAdminSettings, useSaveSettings } from './hooks'
import { settingsSchema, type SettingsFormValues } from './schema'
import { Card, Button, Input, Textarea, LoadingBlock } from '@/components/ui'

/**
 * Admin-editable site config — the non-technical owner changes these without a
 * redeploy (spec §3c). Each field maps to a site_settings key.
 */
export function SettingsPage() {
  const { data: config, isLoading } = useAdminSettings()
  const save = useSaveSettings()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema) })

  // Populate once the saved values arrive, and re-sync after a successful save
  // so `isDirty` returns to false.
  useEffect(() => {
    if (!config) return
    reset({
      shippingFee: config.shippingFee,
      freeShippingOver: config.freeShippingOver,
      deliveryDaysMin: config.deliveryDaysMin,
      deliveryDaysMax: config.deliveryDaysMax,
      returnsPolicy: config.returnsPolicy,
      instagramHandle: config.instagramHandle,
      supportEmail: config.supportEmail,
      supportPhone: config.supportPhone,
      announcementEnabled: config.announcement.enabled,
      announcementText: config.announcement.text,
      storeOpen: config.storeOpen,
    })
  }, [config, reset])

  function onSubmit(values: SettingsFormValues) {
    save.mutate({
      shipping_fee: values.shippingFee,
      free_shipping_over: values.freeShippingOver,
      delivery_days_min: values.deliveryDaysMin,
      delivery_days_max: values.deliveryDaysMax,
      returns_policy: values.returnsPolicy,
      instagram_handle: values.instagramHandle,
      support_email: values.supportEmail,
      support_phone: values.supportPhone,
      announcement: { enabled: values.announcementEnabled, text: values.announcementText },
      store_open: values.storeOpen,
    })
  }

  if (isLoading) return <LoadingBlock />

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-indigo">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          These change what customers see on the website straight away — no need to
          ask anyone to update the code.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-indigo">Shipping</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Shipping charge (₹)"
            inputMode="numeric"
            {...register('shippingFee')}
            error={errors.shippingFee?.message}
            hint="Added to every order below the free-shipping amount."
          />
          <Input
            label="Free shipping over (₹)"
            inputMode="numeric"
            {...register('freeShippingOver')}
            error={errors.freeShippingOver?.message}
            hint="Orders at or above this ship free. Enter 0 to always charge."
          />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-indigo">Delivery &amp; returns</h2>
        <p className="text-sm text-ink-muted">
          Shown on every product page, at checkout and on the “Shipping &amp; returns”
          page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Delivery takes at least (days)"
            inputMode="numeric"
            {...register('deliveryDaysMin')}
            error={errors.deliveryDaysMin?.message}
          />
          <Input
            label="…and at most (days)"
            inputMode="numeric"
            {...register('deliveryDaysMax')}
            error={errors.deliveryDaysMax?.message}
            hint="Customers see this as a range, e.g. “12–15 days”."
          />
        </div>
        <Textarea
          label="Returns policy"
          rows={4}
          {...register('returnsPolicy')}
          error={errors.returnsPolicy?.message}
        />
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-indigo">Contact</h2>
        <Input
          label="Instagram handle"
          {...register('instagramHandle')}
          error={errors.instagramHandle?.message}
          hint="Username only, without the @."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Support email"
            type="email"
            {...register('supportEmail')}
            error={errors.supportEmail?.message}
            hint="Optional — shown in the footer."
          />
          <Input
            label="Support phone"
            inputMode="numeric"
            {...register('supportPhone')}
            error={errors.supportPhone?.message}
            hint="Optional — 10 digits."
          />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-indigo">Announcement banner</h2>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 accent-pink" {...register('announcementEnabled')} />
          Show the strip at the top of the website
        </label>
        <Textarea
          label="Banner text"
          rows={2}
          {...register('announcementText')}
          error={errors.announcementText?.message}
        />
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="font-display text-lg text-indigo">Store status</h2>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 accent-pink" {...register('storeOpen')} />
          Store open
        </label>
        <p className="text-xs text-ink-faint">
          Unchecking this pauses checkout — customers can still browse, but can't pay.
          Use it when you need a break from new orders.
        </p>
      </Card>

      <Button type="submit" size="lg" isLoading={save.isPending} disabled={!isDirty}>
        <Save size={18} /> {isDirty ? 'Save settings' : 'Saved'}
      </Button>
    </form>
  )
}
