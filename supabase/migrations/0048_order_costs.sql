-- Cost ledger attached to each order. A cost can optionally create one linked expense-inbox item.

create table if not exists order_costs (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  category text not null check (category in ('tea', 'packaging', 'shipping', 'production', 'labor', 'other')),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  payment_status text not null default 'planned' check (payment_status in ('planned', 'committed', 'paid')),
  incurred_on date not null default current_date,
  note text not null default '',
  expense_id uuid unique references expense_inbox(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_costs_order_date_idx
  on order_costs(order_id, incurred_on desc, created_at desc);

alter table order_costs enable row level security;

drop policy if exists "order_costs: staff select" on order_costs;
create policy "order_costs: staff select" on order_costs
  for select using (is_staff());

drop policy if exists "order_costs: staff insert" on order_costs;
create policy "order_costs: staff insert" on order_costs
  for insert to authenticated with check (is_staff() and created_by = auth.uid());

drop policy if exists "order_costs: staff update" on order_costs;
create policy "order_costs: staff update" on order_costs
  for update using (is_staff()) with check (is_staff());

drop policy if exists "order_costs: staff delete" on order_costs;
create policy "order_costs: staff delete" on order_costs
  for delete using (is_staff());
