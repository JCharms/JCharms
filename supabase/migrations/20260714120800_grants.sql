-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0800 · Role privileges
--
-- RLS controls WHICH ROWS a role may touch, but Postgres still needs
-- table-level GRANTs to allow the operation at all. These grants are safe
-- precisely because RLS is enabled on every table: a granted operation still
-- has to pass a policy. Without them, PostgREST returns "permission denied".
-- ─────────────────────────────────────────────────────────────────────────

-- Public, read-only catalogue + settings + reviews (rows further filtered by RLS).
grant select on
  public.categories,
  public.products,
  public.product_variants,
  public.product_images,
  public.site_settings,
  public.reviews
to anon, authenticated;

-- Logged-in users: read own orders (RLS), and — for admins only, enforced by
-- the is_admin() policies — write across the catalogue. A non-admin has no
-- matching write policy, so these grants expose nothing extra to customers.
grant select, insert, update, delete on
  public.categories,
  public.products,
  public.product_variants,
  public.product_images,
  public.site_settings,
  public.reviews,
  public.orders,
  public.order_items
to authenticated;

grant select on public.admin_profiles to authenticated;

-- Analytics views (security_invoker → underlying orders RLS still applies).
grant select on
  public.admin_revenue_summary,
  public.admin_orders_by_status,
  public.admin_revenue_daily,
  public.admin_top_products
to authenticated;

-- Future tables created in later migrations inherit sensible defaults so we
-- never trip over missing grants again.
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
