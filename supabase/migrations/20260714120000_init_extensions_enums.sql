-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0000 · Extensions, enums & shared helpers
-- ─────────────────────────────────────────────────────────────────────────

-- gen_random_uuid() is in core (PG13+); citext for case-insensitive lookups.
create extension if not exists "citext" with schema extensions;

-- ── Domain enums ──────────────────────────────────────────────────────────
-- How a product is bought: on-site checkout, or Instagram-DM-only (custom work).
create type public.purchase_mode as enum ('direct', 'dm_only');

-- Whether an item is on the shelf or crocheted after ordering.
create type public.stock_type as enum ('ready_stock', 'made_to_order');

-- Fulfillment lifecycle. Allowed transitions are enforced in the data layer
-- (src/data/orderStateMachine.ts) — this enum only defines the vocabulary.
create type public.order_status as enum (
  'placed', 'processing', 'shipped', 'delivered', 'cancelled'
);

-- Payment lifecycle, driven by Razorpay verification + webhooks.
create type public.payment_status as enum (
  'pending', 'paid', 'failed', 'refunded'
);

-- ── Shared trigger: keep updated_at honest ────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'BEFORE UPDATE trigger fn — stamps updated_at = now() on every row change.';
