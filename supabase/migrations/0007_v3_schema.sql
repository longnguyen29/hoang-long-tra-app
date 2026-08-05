-- House of Hoàng Long v3.0 — schema updates
-- Run after 0001-0006. Safe to run once; uses IF NOT EXISTS / conflict-safe patterns where possible.

-- ---------- customer_profiles: one row per authenticated customer (retail or wholesale) ----------
create table if not exists customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text default '',
  created_at timestamptz not null default now()
);

-- ---------- wholesale_accounts: move from shared partner-code gate to per-user approval ----------
alter table wholesale_accounts add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table wholesale_accounts add column if not exists wholesale_verified boolean not null default false;
alter table wholesale_accounts alter column code drop not null;
create unique index if not exists wholesale_accounts_user_id_key on wholesale_accounts(user_id) where user_id is not null;

-- ---------- tea_sessions: "Đặt lịch buổi trà riêng" — one paid 1-on-1 session per day ----------
create table if not exists tea_sessions (
  id text primary key,
  date date not null,
  customer_name text not null,
  contact text not null,
  note text default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  payment_method text not null default 'qr' check (payment_method in ('qr', 'cash')),
  created_at timestamptz not null default now()
);

-- Only one non-cancelled booking per date — enforced here AND inside book_tea_session()
-- via an advisory lock, so a direct insert can never race past this either.
create unique index if not exists tea_sessions_one_active_per_day
  on tea_sessions(date) where status <> 'cancelled';
