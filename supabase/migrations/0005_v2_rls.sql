-- House of Hoàng Long v2.0 — Row Level Security for new tables
-- Run after 0004_v2_schema.sql.

-- ---------- catalog_variants: same visibility as their parent product ----------
alter table catalog_variants enable row level security;

create policy "catalog_variants: public read" on catalog_variants
  for select to anon, authenticated
  using (true);

create policy "catalog_variants: staff insert" on catalog_variants
  for insert to authenticated
  with check (is_staff());

create policy "catalog_variants: staff update" on catalog_variants
  for update using (is_staff());

create policy "catalog_variants: staff delete" on catalog_variants
  for delete using (is_staff());

-- ---------- testimonials: public may only read approved reviews; customers may submit their own, unapproved ----------
-- Replaces the blanket "public read" policy from 0002_rls.sql now that `approved` is meaningful —
-- Postgres OR's multiple SELECT policies together, so the old using(true) policy must be dropped,
-- not left in place, or it would still let anon read pending/rejected reviews.
drop policy if exists "testimonials: public read" on testimonials;

create policy "testimonials: public read approved" on testimonials
  for select to anon, authenticated
  using (approved = true or is_staff());

create policy "testimonials: public insert own review" on testimonials
  for insert to anon, authenticated
  with check (approved = false);

-- ---------- library_articles: public reference content ----------
alter table library_articles enable row level security;

create policy "library_articles: public read" on library_articles
  for select to anon, authenticated
  using (true);

create policy "library_articles: staff insert" on library_articles
  for insert to authenticated
  with check (is_staff());

create policy "library_articles: staff update" on library_articles
  for update using (is_staff());

create policy "library_articles: staff delete" on library_articles
  for delete using (is_staff());

-- ---------- gallery_images: public to view, staff to manage ----------
alter table gallery_images enable row level security;

create policy "gallery_images: public read" on gallery_images
  for select to anon, authenticated
  using (true);

create policy "gallery_images: staff insert" on gallery_images
  for insert to authenticated
  with check (is_staff());

create policy "gallery_images: staff delete" on gallery_images
  for delete using (is_staff());

-- ---------- settings_home: not sensitive, public to view, staff to manage ----------
alter table settings_home enable row level security;

create policy "settings_home: public read" on settings_home
  for select to anon, authenticated
  using (true);

create policy "settings_home: staff update" on settings_home
  for update using (is_staff());

create policy "settings_home: staff insert" on settings_home
  for insert to authenticated
  with check (is_staff());

-- ---------- wholesale_accounts: staff only — public verifies via RPC, never lists ----------
alter table wholesale_accounts enable row level security;

create policy "wholesale_accounts: staff select" on wholesale_accounts
  for select using (is_staff());

create policy "wholesale_accounts: staff insert" on wholesale_accounts
  for insert to authenticated
  with check (is_staff());

create policy "wholesale_accounts: staff update" on wholesale_accounts
  for update using (is_staff());

create policy "wholesale_accounts: staff delete" on wholesale_accounts
  for delete using (is_staff());

-- ---------- storage: "images" bucket (product photos, gallery, home photo) ----------
create policy "images bucket: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'images');

create policy "images bucket: staff insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and is_staff());

create policy "images bucket: staff update" on storage.objects
  for update using (bucket_id = 'images' and is_staff());

create policy "images bucket: staff delete" on storage.objects
  for delete using (bucket_id = 'images' and is_staff());
