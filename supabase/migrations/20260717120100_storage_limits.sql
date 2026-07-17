-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0901 · Image bucket limits
--
-- The buckets were created without a size cap or type restriction, so the
-- upload forms would happily accept a 40MB photo straight off a phone (slow to
-- upload, slow for every shopper who then loads the product page) or a PDF.
--
-- The admin forms check the same rules before uploading so the owner gets a
-- readable message; this is the backstop that makes the rule actually true.
-- ─────────────────────────────────────────────────────────────────────────

update storage.buckets
   set file_size_limit = 5242880, -- 5 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id in ('product-images', 'review-screenshots');
