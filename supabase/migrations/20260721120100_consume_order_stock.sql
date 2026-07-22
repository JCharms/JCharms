-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0903 · Draw down stock when an order is paid
--
-- stock_quantity was being collected in the admin editor but never spent, so a
-- ready_stock item with "1 left" could be sold indefinitely. This consumes it,
-- once, at the moment payment is confirmed.
--
-- Why here and not in TypeScript: decrementing correctly under concurrency
-- needs read-modify-write in a single statement. `set stock_quantity =
-- stock_quantity - qty` is evaluated by Postgres against the locked row, so two
-- simultaneous orders cannot both read "1 left" and both succeed. Doing the
-- same in JS would reintroduce exactly the race we are closing.
--
-- Made-to-order items are skipped: they are crocheted on demand and have no
-- shelf to draw from. Rows with a null stock_quantity are untracked and stay
-- null. greatest(...,0) means a manual stock edit mid-checkout can never push a
-- row negative and trip the table's check constraint.
-- ─────────────────────────────────────────────────────────────────────────

-- Its own claim column, deliberately NOT reusing notified_at. The email claim
-- is released when every send fails so a retry can pick it up; stock must never
-- be deducted twice, so it needs a guard that is never released.
alter table public.orders
  add column if not exists stock_consumed_at timestamptz;

comment on column public.orders.stock_consumed_at is
  'When this order''s quantities were deducted from ready_stock inventory. '
  'Set once and never cleared — the deduction is not repeatable.';

create or replace function public.consume_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed integer;
begin
  -- Claim, atomically. If another caller already consumed this order (webhook
  -- retry, or the browser path racing the webhook) this matches nothing and we
  -- return without touching inventory.
  update public.orders
     set stock_consumed_at = now()
   where id = p_order_id
     and payment_status = 'paid'
     and stock_consumed_at is null;

  get diagnostics v_claimed = row_count;
  if v_claimed = 0 then
    return;
  end if;

  -- Variant-level stock: the specific colour/style that left the shelf.
  update public.product_variants v
     set stock_quantity = greatest(v.stock_quantity - oi.quantity, 0)
    from public.order_items oi
    join public.products p on p.id = oi.product_id
   where oi.order_id = p_order_id
     and oi.variant_id = v.id
     and v.stock_quantity is not null
     and p.stock_type = 'ready_stock';

  -- Product-level stock, only for lines that did not carry their own variant
  -- count — otherwise a single sale would be deducted twice.
  update public.products p
     set stock_quantity = greatest(p.stock_quantity - oi.quantity, 0)
    from public.order_items oi
    left join public.product_variants v on v.id = oi.variant_id
   where oi.order_id = p_order_id
     and oi.product_id = p.id
     and p.stock_quantity is not null
     and p.stock_type = 'ready_stock'
     and (v.id is null or v.stock_quantity is null);
end;
$$;

comment on function public.consume_order_stock(uuid) is
  'Deducts a paid order''s quantities from ready_stock inventory. Called exactly '
  'once per order from the notification claim in _shared/orderNotifications.ts.';

-- Service role only. Customers must never be able to move inventory, and the
-- callers that need this all run with the service key inside Edge Functions.
revoke all on function public.consume_order_stock(uuid) from public, anon, authenticated;
