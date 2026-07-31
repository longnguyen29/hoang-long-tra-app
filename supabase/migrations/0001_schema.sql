-- House of Hoàng Long — schema
-- Run this in the Supabase SQL editor (or via `supabase db push` if you use the CLI).

create table if not exists staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'employee' check (role in ('admin', 'manager', 'employee')),
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  ts timestamptz not null default now(),
  type text not null check (type in ('wholesale', 'retail')),
  customer_name text not null,
  contact text not null,
  address text default '',
  tax_number text default '',
  vat numeric,
  promo jsonb,
  note text default '',
  lines jsonb not null default '[]',
  total_kg numeric,
  total_items integer,
  tier jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'completed')),
  unread boolean not null default true
);

create table if not exists leads (
  id text primary key,
  ts timestamptz not null default now(),
  name text not null,
  contact text not null,
  interest text not null check (interest in ('wholesale', 'retail')),
  unread boolean not null default true
);

create table if not exists support_threads (
  id text primary key,
  customer_id text not null unique,
  customer_name text not null default 'Guest',
  role text,
  messages jsonb not null default '[]',
  unread_for_admin boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists wiki_articles (
  id text primary key,
  category text not null,
  title jsonb not null default '{}',
  body jsonb not null default '{}'
);

create table if not exists catalog_products (
  id text primary key,
  line text not null check (line in ('everyday', 'reserve')),
  available boolean not null default true,
  name jsonb not null default '{}',
  notes jsonb default '{}',
  brew jsonb default '{}',
  pack_size text default '',
  photo_url text default ''
);

create table if not exists testimonials (
  id text primary key,
  name text not null,
  quote text not null
);

create table if not exists promos (
  id text primary key,
  code text not null unique,
  percent numeric not null check (percent > 0 and percent <= 100),
  owner_name text default '',
  active boolean not null default true
);

create table if not exists settings_payment (
  id integer primary key default 1 check (id = 1),
  bin text default '',
  bank_short_name text default '',
  account_number text default '',
  account_name text default ''
);

insert into settings_payment (id) values (1) on conflict (id) do nothing;
