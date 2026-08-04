-- House of Hoàng Long v2.0 — schema updates
-- Run after 0001-0003. Safe to run once; uses IF NOT EXISTS / conflict-safe patterns where possible.

-- ---------- catalog_products: new fields ----------
alter table catalog_products add column if not exists price numeric;
alter table catalog_products add column if not exists stock_ha_giang integer;
alter table catalog_products add column if not exists stock_soc_son integer;
alter table catalog_products add column if not exists batch text default '';
alter table catalog_products add column if not exists photo_position text default '50% 50%';
alter table catalog_products add column if not exists limited boolean not null default false;

-- allow the new "sample" line
alter table catalog_products drop constraint if exists catalog_products_line_check;
alter table catalog_products add constraint catalog_products_line_check
  check (line in ('everyday', 'reserve', 'sample'));

-- ---------- catalog_variants: size/weight variants (Reserve line) ----------
create table if not exists catalog_variants (
  product_id text not null references catalog_products(id) on delete cascade,
  weight text not null,
  price numeric,
  stock_ha_giang integer,
  stock_soc_son integer,
  primary key (product_id, weight)
);

-- ---------- orders: new fields ----------
alter table orders add column if not exists estimated_total numeric;
alter table orders add column if not exists payment_method text not null default 'qr';
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check check (payment_method in ('qr', 'cash'));
alter table orders add column if not exists tracking_code text default '';

-- ---------- testimonials: customer-submitted reviews need approval ----------
alter table testimonials add column if not exists approved boolean not null default true;

-- ---------- library_articles: general tea knowledge (Reading tab) ----------
create table if not exists library_articles (
  id text primary key,
  category text not null,
  title jsonb not null default '{}',
  body jsonb not null default '{}'
);

-- ---------- gallery_images: Library > Gallery tab ----------
create table if not exists gallery_images (
  id text primary key,
  url text not null,
  caption jsonb default '{}',
  created_at timestamptz not null default now()
);

-- ---------- settings_home: featured home photo ----------
create table if not exists settings_home (
  id integer primary key default 1 check (id = 1),
  featured_photo text default ''
);
insert into settings_home (id) values (1) on conflict (id) do nothing;

-- ---------- wholesale_accounts: partner ID gate for House Partners ----------
create table if not exists wholesale_accounts (
  id text primary key,
  code text not null unique,
  business_name text not null,
  contact text default '',
  created_at timestamptz not null default now()
);

-- ---------- Storage bucket for product/gallery/home photos ----------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;
