-- Tây Bắc farm goods, sold by the House on behalf of the people who grow them.
--
-- Not a marketplace. The House uploads and sells everything; a vendor never signs in, never
-- sees an order, never gets paid through the site. So there is no vendor account, no order
-- splitting and no payout ledger — a vendor is a profile attached to products, and the whole
-- point of the profile is that the farmer gets a face rather than a credit line.
--
-- Additive only: catalog_products gains two nullable/defaulted columns, so every product the
-- House has already entered keeps working untouched and reads as tea, which it is.

create table if not exists vendors (
  id text primary key,
  name text not null,
  region text not null default '',        -- "Hà Giang", "Sơn La", "Điện Biên"
  photo text not null default '',
  crops text not null default '',         -- one line: "chè shan, mật ong bạc hà"
  story_vi text not null default '',
  story_en text not null default '',
  -- Internal only. Never returned by the public function below: a farmer's phone number on
  -- a public page is a burden handed to them, not visibility given to them.
  phone text not null default '',
  note text not null default '',          -- House's own notes, never public
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists vendors_active_idx on vendors(active, sort_order);

alter table vendors enable row level security;

-- Dropped first because Postgres has no "create policy if not exists", and without this a
-- second run of the file dies on the first policy — after the table and columns are already
-- there, so the error reads like a real conflict rather than "you have already done this".
drop policy if exists "vendors: staff select" on vendors;
drop policy if exists "vendors: staff insert" on vendors;
drop policy if exists "vendors: staff update" on vendors;
drop policy if exists "vendors: staff delete" on vendors;

create policy "vendors: staff select" on vendors for select using (is_staff());
create policy "vendors: staff insert" on vendors for insert with check (is_staff());
create policy "vendors: staff update" on vendors for update using (is_staff());
create policy "vendors: staff delete" on vendors for delete using (is_staff());

-- No public select policy. Visitors read through list_public_vendors() instead, which drops
-- phone and note — the same reasoning that keeps reviewer contacts out of product_reviews.
create or replace function list_public_vendors()
returns table (
  id text, name text, region text, photo text, crops text,
  story_vi text, story_en text, sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.name, v.region, v.photo, v.crops, v.story_vi, v.story_en, v.sort_order
  from vendors v
  where v.active = true
  order by v.sort_order, v.name;
$$;

revoke all on function list_public_vendors() from public;
grant execute on function list_public_vendors() to anon, authenticated;

-- ---------- products ----------
-- kind separates the tea from the farm goods. Defaulted to 'tea' so every existing row is
-- correct the moment this runs, and the Shop's queries keep returning exactly what they did.
alter table catalog_products add column if not exists kind text not null default 'tea';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_products_kind_check') then
    alter table catalog_products add constraint catalog_products_kind_check
      check (kind in ('tea', 'goods'));
  end if;
end $$;

-- on delete set null, not cascade: removing a vendor profile must never silently delete the
-- products the House is still holding stock of and selling.
alter table catalog_products add column if not exists vendor_id text
  references vendors(id) on delete set null;

create index if not exists catalog_products_kind_idx on catalog_products(kind);
create index if not exists catalog_products_vendor_idx on catalog_products(vendor_id);

-- Recyclable through the existing bin, so a mistaken deletion is as recoverable here as it
-- is for an order. Replaces the function from 0025 by adding one table to the allowlist.
create or replace function hl_recyclable(p_table text) returns boolean
language sql immutable as $$
  select p_table in ('orders', 'leads', 'sample_requests', 'tea_sessions', 'customer_notes', 'vendors');
$$;
