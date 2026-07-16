-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0700 · Admin analytics views ("at a glance, how's business")
--
-- Aggregation lives in SQL (not client-side crunching of the orders table) so
-- the dashboard stays fast as volume grows. Views run security_invoker so the
-- caller''s RLS applies: an admin (admin_profiles → can read all orders) sees
-- store-wide numbers; nobody else can read across the table.
-- ─────────────────────────────────────────────────────────────────────────

-- Headline figures.
create view public.admin_revenue_summary
with (security_invoker = on) as
select
  coalesce(sum(total) filter (where payment_status = 'paid'), 0)          as total_revenue,
  count(*)                                                                as total_orders,
  count(*) filter (where payment_status = 'paid')                        as paid_orders,
  coalesce(
    round(avg(total) filter (where payment_status = 'paid'), 2), 0
  )                                                                       as avg_order_value
from public.orders;

-- Order count by fulfillment status (placed / processing / shipped / …).
create view public.admin_orders_by_status
with (security_invoker = on) as
select order_status, count(*) as order_count
from public.orders
group by order_status;

-- Paid revenue per day over the last 30 days (drives the dashboard chart).
create view public.admin_revenue_daily
with (security_invoker = on) as
select
  date_trunc('day', placed_at)::date as day,
  count(*)                           as order_count,
  coalesce(sum(total) filter (where payment_status = 'paid'), 0) as revenue
from public.orders
where placed_at >= (now() - interval '30 days')
group by 1
order by 1;

-- Top 5 best-selling products by quantity (paid orders only).
create view public.admin_top_products
with (security_invoker = on) as
select
  oi.product_id,
  oi.product_name,
  sum(oi.quantity)   as units_sold,
  sum(oi.line_total) as revenue
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.payment_status = 'paid'
group by oi.product_id, oi.product_name
order by units_sold desc
limit 5;
