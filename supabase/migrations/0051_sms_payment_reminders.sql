-- One guarded SMS reminder per receivable, sent only after completion + 3 days and
-- only while a positive balance remains. Phone/content stay in orders and are never
-- duplicated into this audit table.
begin;

create table if not exists sms_payment_reminders (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  receivable_id text not null unique references receivables(id) on delete cascade,
  amount_due numeric(14,2) not null default 0 check (amount_due >= 0),
  status text not null default 'pending' check (status in ('pending','sending','queued','sent','failed','skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text not null default '',
  provider_state text not null default '',
  last_error text not null default '',
  skip_reason text not null default '',
  queued_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_payment_reminders_order_idx on sms_payment_reminders(order_id, created_at desc);
create index if not exists sms_payment_reminders_retry_idx on sms_payment_reminders(status, attempts, created_at)
  where status in ('pending','failed');

alter table sms_payment_reminders enable row level security;
create policy "sms_payment_reminders: staff select" on sms_payment_reminders
  for select using (is_staff());

commit;
