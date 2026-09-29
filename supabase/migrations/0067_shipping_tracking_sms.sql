-- One customer SMS per order/carrier/tracking code. Keep phone and message in orders,
-- not in this operational delivery ledger. A corrected waybill gets its own record.
begin;

create table if not exists sms_tracking_updates (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  shipping_carrier text not null,
  tracking_code text not null,
  status text not null default 'pending' check (status in ('pending','sending','queued','failed','needs_phone','skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  claimed_at timestamptz,
  queued_at timestamptz,
  provider_message_id text not null default '',
  provider_state text not null default '',
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, shipping_carrier, tracking_code)
);

create index if not exists sms_tracking_updates_retry_idx
  on sms_tracking_updates(status, created_at)
  where status in ('pending','failed','needs_phone','sending');

alter table sms_tracking_updates enable row level security;
drop policy if exists "sms_tracking_updates: staff select" on sms_tracking_updates;
create policy "sms_tracking_updates: staff select" on sms_tracking_updates
  for select using (is_staff());

commit;
