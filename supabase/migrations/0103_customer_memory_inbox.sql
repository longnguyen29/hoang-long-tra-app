-- Private customer conversation memory and approval inbox.
-- Staff can read via manager-authenticated API; only service role writes.
begin;

create table public.customer_memory_threads (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('facebook','zalo_personal','zalo_oa','manual')),
  external_id text not null check (length(external_id) between 1 and 240),
  display_name text not null default '' check (length(display_name)<=160),
  summary text not null default '' check (length(summary)<=1500),
  facts jsonb not null default '[]'::jsonb check (jsonb_typeof(facts)='array' and octet_length(facts::text)<60000),
  next_action text not null default '' check (length(next_action)<=300),
  next_action_at timestamptz,
  status text not null default 'open' check (status in ('open','waiting_customer','waiting_us','done')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel, external_id)
);
create index customer_memory_due_idx on public.customer_memory_threads(next_action_at)
  where status <> 'done' and next_action_at is not null;
create index customer_memory_recent_idx on public.customer_memory_threads(last_message_at desc);

create table public.customer_memory_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.customer_memory_threads(id) on delete cascade,
  external_message_id text not null check (length(external_message_id) between 1 and 240),
  direction text not null check (direction in ('inbound','outbound')),
  body text not null check (length(trim(body)) between 1 and 12000),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(thread_id, external_message_id)
);
create index customer_memory_message_order_idx on public.customer_memory_messages(thread_id,occurred_at desc);

create table public.customer_memory_drafts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.customer_memory_threads(id) on delete cascade,
  message_id uuid not null unique references public.customer_memory_messages(id) on delete cascade,
  body text not null default '' check (length(body)<=4000),
  status text not null default 'processing' check (status in ('processing','draft','approved','sent','send_failed','ai_unavailable')),
  ai_error text not null default '' check (length(ai_error)<=100),
  telegram_notified_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_memory_drafts_thread_idx on public.customer_memory_drafts(thread_id, created_at desc);

create table public.customer_memory_events (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.customer_memory_drafts(id) on delete cascade,
  event text not null check(event in ('created','ai_ready','ai_failed','edited','approved','sent','send_failed','snoozed')),
  detail text not null default '' check(length(detail)<=300),
  created_at timestamptz not null default now()
);

alter table public.customer_memory_threads enable row level security;
alter table public.customer_memory_messages enable row level security;
alter table public.customer_memory_drafts enable row level security;
alter table public.customer_memory_events enable row level security;
create policy customer_memory_threads_manager_select on public.customer_memory_threads
  for select to authenticated using(public.is_staff_manager());
create policy customer_memory_messages_manager_select on public.customer_memory_messages
  for select to authenticated using(public.is_staff_manager());
create policy customer_memory_drafts_manager_select on public.customer_memory_drafts
  for select to authenticated using(public.is_staff_manager());
create policy customer_memory_events_manager_select on public.customer_memory_events
  for select to authenticated using(public.is_staff_manager());
revoke all on public.customer_memory_threads, public.customer_memory_messages,
  public.customer_memory_drafts, public.customer_memory_events from public,anon,authenticated;
grant select on public.customer_memory_threads,public.customer_memory_messages,
  public.customer_memory_drafts,public.customer_memory_events to authenticated;
grant all on public.customer_memory_threads,public.customer_memory_messages,
  public.customer_memory_drafts,public.customer_memory_events to service_role;
commit;
