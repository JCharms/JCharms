import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useAdminSettings, useSaveSettings } from './hooks'
import { Card, Button, Input, Textarea, LoadingBlock } from '@/components/ui'

/**
 * Admin-editable site config — the non-technical owner changes these without a
 * redeploy (spec §3c). Each field maps to a site_settings key.
 */
export function SettingsPage() {
  const { data: config, isLoading } = useAdminSettings()
  const save = useSaveSettings()

  const [form, setForm] = useState({
    shippingFee: 0,
    freeShippingOver: 0,
    instagramHandle: '',
    supportEmail: '',
    supportPhone: '',
    announcementEnabled: false,
    announcementText: '',
    storeOpen: true,
  })

  useEffect(() => {
    if (config) {
      setForm({
        shippingFee: config.shippingFee,
        freeShippingOver: config.freeShippingOver,
        instagramHandle: config.instagramHandle,
        supportEmail: config.supportEmail,
        supportPhone: config.supportPhone,
        announcementEnabled: config.announcement.enabled,
        announcementText: config.announcement.text,
        storeOpen: config.storeOpen,
      })
    }
  }, [config])

  function onSave() {
    save.mutate({
      shipping_fee: Number(form.shippingFee),
      free_shipping_over: Number(form.freeShippingOver),
      instagram_handle: form.instagramHandle,
      support_email: form.supportEmail,
      support_phone: form.supportPhone,
      announcement: { enabled: form.announcementEnabled, text: form.announcementText },
      store_open: form.storeOpen,
    })
  }

  if (isLoading) return <LoadingBlock />

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl text-indigo">Settings</h1>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-indigo">Shipping</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Flat shipping fee (₹)"
            inputMode="numeric"
            value={form.shippingFee}
            onChange={(e) => set('shippingFee', Number(e.target.value))}
          />
          <Input
            label="Free shipping over (₹, 0 = off)"
            inputMode="numeric"
            value={form.freeShippingOver}
            onChange={(e) => set('freeShippingOver', Number(e.target.value))}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-indigo">Contact</h2>
        <Input
          label="Instagram handle (no @)"
          value={form.instagramHandle}
          onChange={(e) => set('instagramHandle', e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Support email" type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
          <Input label="Support phone" value={form.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-indigo">Announcement banner</h2>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-pink"
            checked={form.announcementEnabled}
            onChange={(e) => set('announcementEnabled', e.target.checked)}
          />
          Show the top banner
        </label>
        <Textarea
          label="Banner text"
          rows={2}
          value={form.announcementText}
          onChange={(e) => set('announcementText', e.target.value)}
        />
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="font-display text-lg text-indigo">Store status</h2>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-pink"
            checked={form.storeOpen}
            onChange={(e) => set('storeOpen', e.target.checked)}
          />
          Store open (uncheck to pause on-site checkout)
        </label>
      </Card>

      <Button size="lg" onClick={onSave} isLoading={save.isPending}>
        <Save size={18} /> Save settings
      </Button>
    </div>
  )
}
