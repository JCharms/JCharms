-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0200 · Catalogue: categories, products, variants, images
-- Public may read only active rows; admins have full control (RLS below).
-- ─────────────────────────────────────────────────────────────────────────

-- ── Categories (self-nesting via parent_id) ───────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories (id) on delete set null,
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);
create index categories_active_idx on public.categories (is_active);

-- ── Products ──────────────────────────────────────────────────────────────
create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid references public.categories (id) on delete set null,
  name               text not null,
  slug               text not null unique,
  short_description  text,
  description        text,
  base_price         numeric(10, 2) not null check (base_price >= 0),
  compare_at_price   numeric(10, 2) check (compare_at_price >= 0),
  purchase_mode      public.purchase_mode not null default 'direct',
  stock_type         public.stock_type not null default 'made_to_order',
  stock_quantity     integer check (stock_quantity >= 0), -- null = not tracked
  is_customizable    boolean not null default false,
  processing_min_days integer check (processing_min_days >= 0),
  processing_max_days integer check (processing_max_days >= 0),
  is_active          boolean not null default true,
  is_featured        boolean not null default false,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint processing_range_ok
    check (processing_max_days is null
        or processing_min_days is null
        or processing_max_days >= processing_min_days)
);
create index products_category_idx on public.products (category_id);
create index products_active_idx on public.products (is_active);
create index products_featured_idx on public.products (is_featured) where is_featured;

-- ── Variants (colour / style; optional price + stock override) ─────────────
create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  name           text not null,                 -- e.g. "Pastel Pink"
  sku            text,
  price_override numeric(10, 2) check (price_override >= 0),
  stock_quantity integer check (stock_quantity >= 0),
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);

-- ── Images (placeholder now, real photos swapped in later) ─────────────────
create table public.product_images (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  variant_id     uuid references public.product_variants (id) on delete set null,
  storage_path   text not null,               -- path within the storage bucket
  alt_text       text,
  is_placeholder boolean not null default true,
  sort_order     integer not null default 0,  -- drag-to-reorder gallery
  created_at     timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ── updated_at triggers ────────────────────────────────────────────────────
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_product_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.product_images    enable row level security;

-- Public read: only active/live rows. anon + authenticated.
create policy "public reads active categories"
  on public.categories for select to anon, authenticated
  using (is_active);

create policy "public reads active products"
  on public.products for select to anon, authenticated
  using (is_active);

create policy "public reads active variants"
  on public.product_variants for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_active
    )
  );

create policy "public reads images of active products"
  on public.product_images for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_active
    )
  );

-- Admin full control on every catalogue table.
create policy "admins manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage variants" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage images" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
