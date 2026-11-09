-- Explicitly opted-in personal-Zalo local bridge credentials. No Zalo cookies, tokens,
-- sessions or third-party service passwords are stored in this database.
begin;
create table public.customer_memory_bridges (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(label) between 1 and 100),
  channel text not null default 'zalo_personal' check(channel='zalo_personal'),
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index customer_memory_bridges_active_idx on public.customer_memory_bridges(active, created_at desc);
alter table public.customer_memory_bridges enable row level security;
revoke all on public.customer_memory_bridges from public, anon, authenticated;
grant all on public.customer_memory_bridges to service_role;
commit;
