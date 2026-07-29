-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · MAINTENANCE · Wipe test data before going live
--
-- Run this ONCE against the PRODUCTION database, right before launch, to clear
-- the orders/reviews accumulated while testing so the admin dashboard starts
-- from a true zero.
--
-- ⚠️  THIS IS DESTRUCTIVE AND IRREVERSIBLE. It deletes ALL orders and ALL
--     reviews. Only run it when you are certain none of that data is real.
--
-- WHAT IT DELETES
--   • orders            → resets revenue, order counts, the 30-day chart,
--                         top-products, and orders-by-status on the dashboard
--   • order_items       → removed automatically (FK cascade from orders)
--   • reviews           → the homepage "little love notes" testimonials
--   • order_number_seq  → reset so your first REAL order is JC-1000 again
--
-- WHAT IT KEEPS (untouched)
--   • admin_profiles + the admin auth user  (your login)
--   • products / product_variants / product_images / categories  (the catalogue)
--   • site_settings  (shipping fee, banner, Instagram handle, store-open switch…)
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
--   (Or: psql "<connection string>" -f supabase/maintenance/reset-store-data.sql)
--   Do NOT put this in supabase/migrations/ — it must never run on db:reset.
-- ─────────────────────────────────────────────────────────────────────────

begin;

-- Show what we're about to remove (appears in the SQL Editor's messages/logs).
do $$
declare
  v_orders  integer;
  v_items   integer;
  v_reviews integer;
begin
  select count(*) into v_orders  from public.orders;
  select count(*) into v_items   from public.order_items;
  select count(*) into v_reviews from public.reviews;
  raise notice 'Before wipe → orders: %, order_items: %, reviews: %',
    v_orders, v_items, v_reviews;
end $$;

-- 1) Orders. order_items has `on delete cascade`, so deleting the parent rows
--    clears the line items too — but we delete items first anyway to keep the
--    intent explicit and independent of the FK rule.
delete from public.order_items;
delete from public.orders;

-- 2) Reviews (all of them — these were seeded/added for testing).
delete from public.reviews;

-- 3) Restart the friendly order-number counter so the first live order is
--    JC-1000 (not JC-1000-plus-however-many-tests-you-ran).
alter sequence public.order_number_seq restart with 1000;

-- Confirm we're clean.
do $$
declare
  v_orders  integer;
  v_reviews integer;
begin
  select count(*) into v_orders  from public.orders;
  select count(*) into v_reviews from public.reviews;
  raise notice 'After wipe  → orders: %, reviews: %  (both should be 0)',
    v_orders, v_reviews;
end $$;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- IMPORTANT — read this, it is NOT handled above:
--
-- • PRODUCT STOCK: every test order that reached "paid" drew down
--   products.stock_quantity / product_variants.stock_quantity (see the
--   consume_order_stock function). Those decrements are NOT reversed here,
--   because the original quantities aren't recorded anywhere to restore from.
--   → Before launch, open Admin → Catalogue and re-set the stock quantity on
--     every ready_stock product/variant to its correct value. (made_to_order
--     items are unaffected — they don't track stock.)
--
-- • TEST CUSTOMER ACCOUNTS: signups you made while testing still exist in
--   Authentication → Users. They don't affect any dashboard metric (nothing
--   counts users), so this script leaves them alone. Delete them by hand from
--   the dashboard if you want a truly clean user list — but NEVER delete your
--   admin user, and note that orders.user_id is `on delete set null`, so
--   removing a user won't break anything even if they had orders.
--
-- • STORAGE: product photos and review screenshots in the storage buckets are
--   not touched. Delete unused review screenshots manually if you like; product
--   photos you want to keep.
-- ─────────────────────────────────────────────────────────────────────────
