-- Customer notes and trade sample requests.
--
-- Additive only. Nothing here drops or rewrites a column, so everything the admin has
-- entered live is untouched.

-- ---------- customer_notes: what the house remembers about a customer ----------
-- Keyed by the same lowered, trimmed contact string the rest of the app uses to mean "one
-- customer" (see customer_profiles_summary), because retail checkout is guest-first and
-- there is no account to hang this off.
--
-- Deliberately separate from orders.note. That note belongs to one order and is often the
-- customer's own words; this is the house's private memory of the person — how they take
-- their tea, which branch they collect from, who to ask for.
create table if not exists customer_notes (
  contact_key text primary key,
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

-- ---------- sample_requests: cafés asking for a trade sample ----------
-- The qualifying answers are stored, not just checked, so staff can see what was promised
-- before a free pack goes out the door.
create table if not exists sample_requests (
  id text primary key,
  ts timestamptz not null default now(),
  store_name text not null,
  contact_name text not null default '',
  phone text not null,
  address text not null,
  pack text not null default '50g',
  -- the three qualifying questions
  has_shop boolean not null default false,
  can_reformulate boolean not null default false,
  can_feedback boolean not null default false,
  note text not null default '',
  status text not null default 'new' check (status in ('new', 'sent', 'declined', 'converted')),
  unread boolean not null default true
);

create index if not exists sample_requests_ts_idx on sample_requests(ts desc);

alter table customer_notes enable row level security;

create policy "customer_notes: staff select" on customer_notes for select using (is_staff());
create policy "customer_notes: staff insert" on customer_notes for insert with check (is_staff());
create policy "customer_notes: staff update" on customer_notes for update using (is_staff());
create policy "customer_notes: staff delete" on customer_notes for delete using (is_staff());

-- No public access of any kind. These are the house's private remarks about named people;
-- a readable policy here would expose staff opinions of customers to those customers.

alter table sample_requests enable row level security;

create policy "sample_requests: staff select" on sample_requests for select using (is_staff());
create policy "sample_requests: staff update" on sample_requests for update using (is_staff());
create policy "sample_requests: staff delete" on sample_requests for delete using (is_staff());

-- No public select and no public insert: rows carry a shop's address and phone, and writes
-- go through submit_sample_request() so the qualifying answers are validated server-side
-- rather than trusted from a form that anyone can edit.
