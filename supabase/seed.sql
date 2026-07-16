-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · Seed data (runs on `supabase db reset`)
-- Placeholder catalogue so the storefront + admin have something to show.
-- All images use is_placeholder = true — swap real photos in via admin later.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Categories (two top-level with nested subcategories) ───────────────────
with cat as (
  insert into public.categories (name, slug, description, sort_order) values
    ('Crochet', 'crochet', 'Keychains, plushies, bouquets & more — all hand-crocheted.', 1),
    ('Hair Accessories', 'hair-accessories', 'Bows, scrunchies & claw clips to finish any look.', 2),
    ('Gifting', 'gifting', 'Hampers, car hangings & bundles made to gift.', 3)
  returning id, slug
)
insert into public.categories (parent_id, name, slug, sort_order)
select c.id, sub.name, sub.slug, sub.sort_order
from cat c
join (values
  ('crochet', 'Keychains', 'keychains', 1),
  ('crochet', 'Plushies', 'plushies', 2),
  ('crochet', 'Bouquets', 'bouquets', 3),
  ('hair-accessories', 'Bows', 'bows', 1),
  ('hair-accessories', 'Scrunchies', 'scrunchies', 2),
  ('hair-accessories', 'Claw Clips', 'claw-clips', 3)
) as sub(parent_slug, name, slug, sort_order)
  on sub.parent_slug = c.slug;

-- ── Products ───────────────────────────────────────────────────────────────
insert into public.products
  (category_id, name, slug, short_description, description, base_price,
   compare_at_price, purchase_mode, stock_type, stock_quantity, is_customizable,
   processing_min_days, processing_max_days, is_active, is_featured, sort_order)
select
  (select id from public.categories where slug = p.cat_slug),
  p.name, p.slug, p.short_desc, p.description, p.base_price, p.compare_at,
  p.purchase_mode::public.purchase_mode, p.stock_type::public.stock_type,
  p.stock_qty, p.customizable, p.pmin, p.pmax, true, p.featured, p.sort_order
from (values
  ('keychains', 'Strawberry Keychain', 'strawberry-keychain',
   'A plump little strawberry to brighten your keys.',
   'Hand-crocheted with soft cotton yarn and a sturdy keyring. Roughly 6cm tall.',
   249, 299, 'direct', 'ready_stock', 8, false, 2, 4, true, 1),
  ('plushies', 'Cuddly Bee Plushie', 'cuddly-bee-plushie',
   'A round, huggable bumblebee.',
   'Made to order in fluffy velvet yarn, stuffed soft. About 18cm.',
   749, null, 'direct', 'made_to_order', null, true, 5, 8, true, 2),
  ('bouquets', 'Forever Tulip Bouquet', 'forever-tulip-bouquet',
   'A bouquet of tulips that never wilts.',
   'Five crocheted tulips wrapped in kraft paper — a keepsake bloom.',
   1299, 1499, 'direct', 'made_to_order', null, true, 6, 10, true, 3),
  ('bows', 'Classic Ribbon Bow Clip', 'classic-ribbon-bow-clip',
   'A neat everyday hair bow on an alligator clip.',
   'Yarn bow on a secure clip. Choose your colour at checkout.',
   199, null, 'direct', 'ready_stock', 15, false, 1, 3, false, 4),
  ('scrunchies', 'Soft Cloud Scrunchie', 'soft-cloud-scrunchie',
   'A squishy, gentle-on-hair scrunchie.',
   'Crocheted over a strong elastic. Ready to ship.',
   149, null, 'direct', 'ready_stock', 20, false, 1, 2, false, 5),
  ('gifting', 'Custom Wedding Hamper', 'custom-wedding-hamper',
   'A fully bespoke crochet hamper — designed with you over DM.',
   'Every hamper is unique. Message us on Instagram to plan yours.',
   0, null, 'dm_only', 'made_to_order', null, true, 10, 21, true, 6)
) as p(cat_slug, name, slug, short_desc, description, base_price, compare_at,
       purchase_mode, stock_type, stock_qty, customizable, pmin, pmax,
       featured, sort_order);

-- ── A couple of colour variants for the bow ────────────────────────────────
insert into public.product_variants (product_id, name, sort_order)
select p.id, v.name, v.sort_order
from public.products p
join (values
  ('classic-ribbon-bow-clip', 'Yarn Pink', 1),
  ('classic-ribbon-bow-clip', 'Marigold', 2),
  ('classic-ribbon-bow-clip', 'Deep Indigo', 3),
  ('soft-cloud-scrunchie', 'Sage', 1),
  ('soft-cloud-scrunchie', 'Ivory', 2)
) as v(slug, name, sort_order) on v.slug = p.slug;

-- ── Placeholder images (one per product) ───────────────────────────────────
insert into public.product_images (product_id, storage_path, alt_text, is_placeholder, sort_order)
select id, 'placeholder/' || slug || '.svg',
       name || ' — placeholder image', true, 0
from public.products;

-- ── A few curated, published testimonials ──────────────────────────────────
insert into public.reviews (author_name, rating, body, is_published, sort_order) values
  ('Ananya R.', 5, 'The strawberry keychain is even cuter in person. Packaged so sweetly!', true, 1),
  ('Meera & Kabir', 5, 'Ordered a custom hamper for our wedding — everyone kept asking where it was from. 💕', true, 2),
  ('Priya S.', 4, 'Lovely bee plushie, super soft. Took a few days but so worth it.', true, 3);
