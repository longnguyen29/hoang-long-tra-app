-- Transactional Zalo delivery messages. Carrier webhooks enqueue exactly one message
-- when an order first reaches delivered; the provider response stays auditable here.

create table if not exists zalo_oauth_tokens (
  id integer primary key default 1 check (id = 1),
  oa_id text not null default '',
  access_token text not null default '',
  refresh_token text not null default '',
  access_expires_at timestamptz,
  refresh_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Tokens are intentionally service-role only. Even staff browser sessions must never be
-- able to select an OA access or refresh token.
alter table zalo_oauth_tokens enable row level security;

create table if not exists customer_notifications (
  id text primary key,
  order_id text not null,
  channel text not null default 'zalo_zbs' check (channel in ('zalo_zbs')),
  event_key text not null,
  recipient text not null default '',
  template_kind text not null check (template_kind in ('delivered_paid', 'delivered_due')),
  template_id text not null default '',
  template_data jsonb not null default '{}'::jsonb,
  amount_due numeric(14,2) not null default 0 check (amount_due >= 0),
  status text not null default 'pending' check (
    status in ('pending', 'pending_configuration', 'sending', 'sent', 'failed', 'skipped')
  ),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text not null default '',
  last_error text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_notifications_event_unique unique (channel, event_key)
);

create index if not exists customer_notifications_status_idx
  on customer_notifications(status, created_at)
  where status in ('pending', 'pending_configuration', 'failed');
create index if not exists customer_notifications_order_idx
  on customer_notifications(order_id, created_at desc);

alter table customer_notifications enable row level security;
create policy "customer_notifications: staff select" on customer_notifications
  for select using (is_staff());
