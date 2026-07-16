-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0300 · Site settings (admin-editable, config-over-hardcoding)
--
-- Anything a non-technical owner might reasonably want to change without a
-- redeploy lives here: shipping fee, Instagram handle, support email, banner.
-- Values are JSONB so a setting can be a string, number, boolean or object.
-- ─────────────────────────────────────────────────────────────────────────

create table public.site_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);

create trigger trg_site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

-- These settings are non-sensitive and drive the public storefront, so public
-- read is fine; only admins may write.
alter table public.site_settings enable row level security;

create policy "public reads settings"
  on public.site_settings for select to anon, authenticated
  using (true);

create policy "admins manage settings"
  on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Seed sensible defaults ─────────────────────────────────────────────────
insert into public.site_settings (key, value, description) values
  ('shipping_fee',        '80',                          'Flat pan-India India Post shipping fee (INR).'),
  ('free_shipping_over',  '1500',                        'Order subtotal (INR) above which shipping is free. 0 disables.'),
  ('instagram_handle',    '"j_.charms"',                 'Instagram username (no @). Used for DM redirects + footer.'),
  ('support_email',       '"hello@jcharms.example"',     'Customer support / order email address.'),
  ('support_phone',       '""',                          'Optional WhatsApp / support phone number.'),
  ('announcement',        '{"enabled": true, "text": "Handmade to order — dispatch in 3–5 days ✨"}',
                                                         'Top-of-site announcement banner.'),
  ('store_open',          'true',                        'Master switch — set false to pause on-site checkout.')
on conflict (key) do nothing;
