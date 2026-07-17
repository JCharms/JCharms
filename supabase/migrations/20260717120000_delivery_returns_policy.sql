-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0900 · Delivery + returns policy settings
--
-- The owner confirmed her actual terms:
--   · delivery takes 12–15 days
--   · orders over ₹999 ship free (was seeded at ₹1500)
--   · items are handmade to order and are not returnable
--
-- These live in site_settings rather than in the code so she can revise them
-- from the admin panel without a redeploy (spec §3c). The storefront and the
-- order-total maths in create-razorpay-order both read from here, so changing
-- a value stays consistent everywhere.
-- ─────────────────────────────────────────────────────────────────────────

-- The free-shipping threshold she actually offers.
update public.site_settings
   set value = '999'
 where key = 'free_shipping_over';

-- Delivery window, stored as two numbers so the UI can render "12–15 days" and
-- the admin form can enforce min <= max.
insert into public.site_settings (key, value, description) values
  ('delivery_days_min', '12', 'Typical delivery estimate — lower bound, in days.'),
  ('delivery_days_max', '15', 'Typical delivery estimate — upper bound, in days.'),
  ('returns_policy',
   '"Every piece is crocheted by hand just for you, so we''re not able to accept returns or exchanges. If your order turns up damaged or incorrect, message us within 48 hours of delivery and we''ll make it right."',
   'Returns / exchange policy shown on the product, checkout and policy pages.')
on conflict (key) do nothing;

-- Keep the default banner honest about the new threshold. Only touch the text
-- we originally seeded — never clobber a message she has since written herself.
update public.site_settings
   set value = jsonb_set(
         value,
         '{text}',
         '"Handmade to order · Free shipping on orders over ₹999 ✨"'
       )
 where key = 'announcement'
   and value ->> 'text' = 'Handmade to order — dispatch in 3–5 days ✨';
