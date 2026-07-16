-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0400 · Orders & order items
--
-- SECURITY MODEL (see spec §4):
--   • NO anonymous access at all. Guests never touch these tables directly.
--   • All order creation + guest lookup happens in Edge Functions using the
--     service-role key (which bypasses RLS). The browser anon key can only:
--       - a logged-in customer reading THEIR OWN orders (order history)
--       - an admin reading/managing everything
--   • order_items snapshot name/price at purchase time and never rely on a
--     live join back to products that may later change or be deleted.
-- ─────────────────────────────────────────────────────────────────────────

-- Friendly sequential order numbers: JC-1000, JC-1001, …
create sequence if not exists public.order_number_seq start with 1000;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,
  user_id           uuid references auth.users (id) on delete set null, -- null = guest

  -- Contact + shipping snapshot (works for guests and account holders alike).
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text not null,
  shipping_address  jsonb not null,   -- { line1, line2, city, state, pincode }

  -- Lifecycle
  order_status      public.order_status   not null default 'placed',
  payment_status    public.payment_status not null default 'pending',

  -- Money (INR). Totals are computed server-side, never trusted from client.
  subtotal          numeric(10, 2) not null check (subtotal >= 0),
  shipping_fee      numeric(10, 2) not null default 0 check (shipping_fee >= 0),
  total             numeric(10, 2) not null check (total >= 0),

  -- Razorpay
  razorpay_order_id   text,
  razorpay_payment_id text,

  -- Fulfillment
  courier           text default 'India Post',
  tracking_number   text,
  shipped_at        timestamptz,
  delivered_at      timestamptz,

  customer_note     text,
  admin_note        text,

  placed_at         timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (order_status);
create index orders_payment_idx on public.orders (payment_status);
create index orders_placed_idx on public.orders (placed_at desc);
create index orders_rzp_order_idx on public.orders (razorpay_order_id);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  variant_id   uuid references public.product_variants (id) on delete set null,
  -- Snapshots — the source of truth for what was actually bought.
  product_name text not null,
  variant_name text,
  unit_price   numeric(10, 2) not null check (unit_price >= 0),
  quantity     integer not null check (quantity > 0),
  line_total   numeric(10, 2) not null check (line_total >= 0),
  created_at   timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- Assign the friendly number on insert if not supplied.
create or replace function public.assign_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'JC-' || nextval('public.order_number_seq')::text;
  end if;
  return new;
end;
$$;

create trigger trg_orders_number before insert on public.orders
  for each row execute function public.assign_order_number();
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ═══ RLS — deny by default, explicit narrow grants ═════════════════════════
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Logged-in customers may read (only) their own orders. No insert/update/delete
-- from the browser — writes go through service-role Edge Functions.
create policy "customers read own orders"
  on public.orders for select to authenticated
  using (user_id = auth.uid());

create policy "customers read own order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- Admins: full read + management (status updates, tracking, notes).
create policy "admins manage orders"
  on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admins manage order items"
  on public.order_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- NOTE: anon has zero policies here → all anon access is denied by RLS.
