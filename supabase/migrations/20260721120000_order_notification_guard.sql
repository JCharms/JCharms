-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0902 · Order notification idempotency guard
--
-- A paid order can be confirmed by two independent server-side paths:
--
--   · verify-razorpay-payment — the browser relays Razorpay's signed callback
--     (fast: the customer has the email before they leave the thank-you page);
--   · razorpay-webhook — Razorpay calls us server-to-server (reliable: still
--     arrives if the customer closed the tab mid-payment).
--
-- Both verify the HMAC with the secret key, so either is a trustworthy trigger.
-- Whichever wins the race must send exactly once. This column is the lock:
-- the sender claims it with a conditional UPDATE ... WHERE notified_at IS NULL,
-- and Postgres' row-level locking means only one caller can ever win, even if
-- both fire in the same millisecond.
--
-- Nullable with no default, so every existing order is treated as "not yet
-- notified" — which is correct: those predate the owner notification entirely.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.orders
  add column if not exists notified_at timestamptz;

comment on column public.orders.notified_at is
  'When the paid-order emails (customer confirmation + owner alert) were sent. '
  'Claimed atomically so the browser-verify and webhook paths cannot double-send.';

-- Lets the webhook find unnotified paid orders cheaply. Partial: the row leaves
-- the index as soon as it is notified, so it stays tiny regardless of order volume.
create index if not exists orders_pending_notification_idx
  on public.orders (razorpay_order_id)
  where notified_at is null;
