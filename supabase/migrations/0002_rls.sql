-- House of Hoàng Long — Row Level Security
-- Run after 0001_schema.sql.

-- Helper: is the currently authenticated user a staff member?
-- SECURITY DEFINER so it can read staff_roles regardless of the caller's own RLS visibility.
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from staff_roles where user_id = auth.uid());
$$;

revoke all on function is_staff() from public;
grant execute on function is_staff() to authenticated, anon;

-- ---------- staff_roles ----------
alter table staff_roles enable row level security;

create policy "staff_roles: self read" on staff_roles
  for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for anon/authenticated on purpose.
-- Grant staff access via the Supabase SQL editor (service role bypasses RLS) — see supabase/README.md.

-- ---------- orders ----------
alter table orders enable row level security;

create policy "orders: staff select" on orders
  for select using (is_staff());

create policy "orders: staff update" on orders
  for update using (is_staff());

create policy "orders: staff delete" on orders
  for delete using (is_staff());

create policy "orders: public insert" on orders
  for insert to anon, authenticated
  with check (status = 'pending' and unread = true);

-- ---------- leads ----------
alter table leads enable row level security;

create policy "leads: staff select" on leads
  for select using (is_staff());

create policy "leads: staff update" on leads
  for update using (is_staff());

create policy "leads: staff delete" on leads
  for delete using (is_staff());

create policy "leads: public insert" on leads
  for insert to anon, authenticated
  with check (unread = true);

-- ---------- support_threads ----------
-- No anon policies at all: customers only ever touch this table through the
-- submit_customer_message / get_customer_thread RPCs (0003_functions.sql), which
-- are SECURITY DEFINER and scoped to a single thread by customer_id. This keeps
-- "customers can't list or read anyone else's conversation" true while still
-- allowing a customer to continue their own multi-message thread.
alter table support_threads enable row level security;

create policy "support_threads: staff select" on support_threads
  for select using (is_staff());

create policy "support_threads: staff update" on support_threads
  for update using (is_staff());

create policy "support_threads: staff delete" on support_threads
  for delete using (is_staff());

-- ---------- wiki_articles (public content) ----------
alter table wiki_articles enable row level security;

create policy "wiki_articles: public read" on wiki_articles
  for select to anon, authenticated
  using (true);

create policy "wiki_articles: staff insert" on wiki_articles
  for insert to authenticated
  with check (is_staff());

create policy "wiki_articles: staff update" on wiki_articles
  for update using (is_staff());

create policy "wiki_articles: staff delete" on wiki_articles
  for delete using (is_staff());

-- ---------- catalog_products (public content) ----------
alter table catalog_products enable row level security;

create policy "catalog_products: public read" on catalog_products
  for select to anon, authenticated
  using (true);

create policy "catalog_products: staff insert" on catalog_products
  for insert to authenticated
  with check (is_staff());

create policy "catalog_products: staff update" on catalog_products
  for update using (is_staff());

create policy "catalog_products: staff delete" on catalog_products
  for delete using (is_staff());

-- ---------- testimonials (public content) ----------
alter table testimonials enable row level security;

create policy "testimonials: public read" on testimonials
  for select to anon, authenticated
  using (true);

create policy "testimonials: staff insert" on testimonials
  for insert to authenticated
  with check (is_staff());

create policy "testimonials: staff update" on testimonials
  for update using (is_staff());

create policy "testimonials: staff delete" on testimonials
  for delete using (is_staff());

-- ---------- promos ----------
-- Not publicly readable as a table (would leak every code) — customers can only
-- validate a single code through the apply_promo_code RPC.
alter table promos enable row level security;

create policy "promos: staff select" on promos
  for select using (is_staff());

create policy "promos: staff insert" on promos
  for insert to authenticated
  with check (is_staff());

create policy "promos: staff update" on promos
  for update using (is_staff());

create policy "promos: staff delete" on promos
  for delete using (is_staff());

-- ---------- settings_payment ----------
-- Staff-only table access (per brief). Public checkout reads it through the
-- get_payment_info RPC instead, which returns only the single settings row.
alter table settings_payment enable row level security;

create policy "settings_payment: staff select" on settings_payment
  for select using (is_staff());

create policy "settings_payment: staff update" on settings_payment
  for update using (is_staff());

create policy "settings_payment: staff insert" on settings_payment
  for insert to authenticated
  with check (is_staff());
