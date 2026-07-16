-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0500 · Reviews / curated testimonials
-- Owner-curated (not open user submissions): admin adds, edits, orders,
-- and toggles publish. Public reads only published rows.
-- ─────────────────────────────────────────────────────────────────────────

create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  author_name     text not null,
  rating          integer check (rating between 1 and 5),
  body            text not null,
  screenshot_path text,                       -- optional storage path
  product_id      uuid references public.products (id) on delete set null,
  is_published    boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index reviews_published_idx on public.reviews (is_published, sort_order);

create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

create policy "public reads published reviews"
  on public.reviews for select to anon, authenticated
  using (is_published);

create policy "admins manage reviews"
  on public.reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
