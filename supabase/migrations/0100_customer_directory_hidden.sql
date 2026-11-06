-- Reversible list hiding, without deleting customers, orders or their histories.
create table if not exists public.customer_directory_hidden (
  kind text not null check (kind in ('opportunity','order')),
  entry_id text not null,
  hidden_at timestamptz not null default now(),
  primary key (kind, entry_id)
);
alter table public.customer_directory_hidden enable row level security;
drop policy if exists "customer_directory_hidden_staff_select" on public.customer_directory_hidden;
create policy "customer_directory_hidden_staff_select" on public.customer_directory_hidden for select using (public.is_staff());
drop policy if exists "customer_directory_hidden_staff_insert" on public.customer_directory_hidden;
create policy "customer_directory_hidden_staff_insert" on public.customer_directory_hidden for insert with check (public.is_staff());
drop policy if exists "customer_directory_hidden_staff_delete" on public.customer_directory_hidden;
create policy "customer_directory_hidden_staff_delete" on public.customer_directory_hidden for delete using (public.is_staff());

-- Staff-approved links between existing orders and CRM records.
create table if not exists public.customer_directory_order_links (
  order_id text primary key references public.orders(id) on delete cascade,
  opportunity_id text not null references public.trade_opportunities(id) on delete cascade,
  linked_at timestamptz not null default now()
);
alter table public.customer_directory_order_links enable row level security;
drop policy if exists "customer_directory_links_staff_select" on public.customer_directory_order_links;
create policy "customer_directory_links_staff_select" on public.customer_directory_order_links for select using (public.is_staff());
drop policy if exists "customer_directory_links_staff_insert" on public.customer_directory_order_links;
create policy "customer_directory_links_staff_insert" on public.customer_directory_order_links for insert with check (public.is_staff());
drop policy if exists "customer_directory_links_staff_update" on public.customer_directory_order_links;
create policy "customer_directory_links_staff_update" on public.customer_directory_order_links for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "customer_directory_links_staff_delete" on public.customer_directory_order_links;
create policy "customer_directory_links_staff_delete" on public.customer_directory_order_links for delete using (public.is_staff());
