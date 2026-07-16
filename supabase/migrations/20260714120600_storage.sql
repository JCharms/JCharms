-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0600 · Storage buckets for product photos & review screenshots
-- Public read (images shown on the storefront); only admins may upload/modify.
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('review-screenshots', 'review-screenshots', true)
on conflict (id) do nothing;

-- Public read for both buckets.
create policy "public reads product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "public reads review screenshots"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'review-screenshots');

-- Admin-only writes (insert / update / delete) in both buckets.
create policy "admins write product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy "admins write review screenshots"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'review-screenshots' and public.is_admin());
create policy "admins update review screenshots"
  on storage.objects for update to authenticated
  using (bucket_id = 'review-screenshots' and public.is_admin());
create policy "admins delete review screenshots"
  on storage.objects for delete to authenticated
  using (bucket_id = 'review-screenshots' and public.is_admin());
