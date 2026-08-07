-- House of Hoàng Long v3.0 — RLS for product_reviews
-- Run after 0012_v3_product_reviews.sql.

alter table product_reviews enable row level security;

create policy "product_reviews: staff select" on product_reviews
  for select using (is_staff());

create policy "product_reviews: staff update" on product_reviews
  for update using (is_staff());

create policy "product_reviews: staff delete" on product_reviews
  for delete using (is_staff());

-- Deliberately no public select and no public insert.
--
-- Insert: unlike `testimonials` (which lets anon insert directly with RLS pinning
-- approved = false), a review here may only exist if the reviewer actually bought the
-- product. A client-side check would be trivially bypassed, so writes go exclusively
-- through submit_product_review() — same RPC-only approach as book_tea_session().
--
-- Select: rows carry the reviewer's phone/email. Public reads go through
-- list_approved_product_reviews(), which returns approved rows without that column.
