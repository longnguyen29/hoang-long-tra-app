-- Customer-specific commercial quotes.
-- A quote is a dated promise, not a mutable price override. New negotiations create new
-- rows; older rows remain visible and may be marked replaced or expired.

create table if not exists customer_quotes (
  id text primary key,
  contact_key text not null,
  product_id text,
  product_name jsonb not null default '{}'::jsonb,
  price numeric(14,2) not null check (price >= 0),
  currency text not null default 'VND' check (currency = 'VND'),
  unit text not null default 'kg',
  min_quantity numeric(12,2) not null default 0 check (min_quantity >= 0),
  includes_delivery boolean not null default false,
  includes_vat boolean not null default false,
  terms text not null default '',
  reason text not null default '',
  quoted_at date not null default current_date,
  valid_until date,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'expired', 'replaced')),
  approved_by text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_quotes_valid_dates
    check (valid_until is null or valid_until >= quoted_at)
);

create index if not exists customer_quotes_contact_idx
  on customer_quotes (contact_key, quoted_at desc, created_at desc);
create index if not exists customer_quotes_product_idx
  on customer_quotes (product_id) where product_id is not null;

alter table customer_quotes enable row level security;

create policy "customer_quotes: staff select" on customer_quotes
  for select using (is_staff());
create policy "customer_quotes: staff insert" on customer_quotes
  for insert with check (is_staff());
create policy "customer_quotes: staff update" on customer_quotes
  for update using (is_staff()) with check (is_staff());

-- Deliberately no delete policy: commercial history should be corrected with status, not erased.

