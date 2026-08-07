-- House of Hoàng Long v3.0 — per-product reviews + sold counter
-- Run after 0011_v3_session_time.sql.
--
-- Separate from the existing `testimonials` table on purpose: testimonials stay the
-- general "what customers say about the house" wall (no product link, no rating), while
-- these are per-product, star-rated, and only submittable by someone who actually bought
-- the product (enforced server-side in submit_product_review — see 0014).

create table if not exists product_reviews (
  id text primary key,
  product_id text not null references catalog_products(id) on delete cascade,
  reviewer_name text not null,
  -- phone/email the customer used at checkout: needed to verify the purchase and to stop
  -- one person reviewing the same product repeatedly. Never exposed publicly — the public
  -- read path (list_approved_product_reviews) omits this column entirely.
  contact text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_product_idx on product_reviews(product_id);

-- One review per contact per product.
create unique index if not exists product_reviews_one_per_contact
  on product_reviews(product_id, lower(contact));

-- ---------- catalog_products: staff-controlled "sold" counter ----------
-- Auto-incremented by submit_retail_order, but staff can overwrite it by hand in
-- Front Desk › Catalog — the manual value always wins. Badge is hidden when 0.
alter table catalog_products add column if not exists sold_count integer not null default 0;
