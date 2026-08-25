-- Wholesale relationship pipeline and multi-line quotations.
-- Additive only: existing leads, samples, partners, catalogue and orders stay untouched.

create table if not exists trade_opportunities (
  id text primary key,
  contact_key text not null unique,
  business_name text not null,
  contact text not null,
  stage text not null default 'lead'
    check (stage in ('lead', 'sample_requested', 'sample_sent', 'feedback', 'quoted', 'won', 'active', 'lost')),
  source_type text not null default 'manual',
  source_id text,
  owner text not null default '',
  monthly_potential_kg numeric(12,2) not null default 0 check (monthly_potential_kg >= 0),
  next_action text not null default '',
  next_action_at timestamptz,
  notes text not null default '',
  lost_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trade_opportunities_stage_idx on trade_opportunities(stage, next_action_at);
create index if not exists trade_opportunities_action_idx on trade_opportunities(next_action_at) where stage <> 'lost';

create table if not exists trade_quotes (
  id text primary key,
  opportunity_id text references trade_opportunities(id) on delete set null,
  customer_name text not null,
  contact text not null,
  address text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted')),
  lines jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  total numeric(14,2) not null default 0 check (total >= 0),
  payment_method text not null default 'qr' check (payment_method in ('qr', 'cash')),
  valid_until date,
  terms text not null default '',
  note text not null default '',
  created_by text not null default '',
  converted_order_id text references orders(id) on delete set null,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_quotes_has_lines check (jsonb_typeof(lines) = 'array')
);

create index if not exists trade_quotes_opportunity_idx on trade_quotes(opportunity_id, created_at desc);
create index if not exists trade_quotes_status_idx on trade_quotes(status, valid_until);

alter table trade_opportunities enable row level security;
alter table trade_quotes enable row level security;

drop policy if exists "trade_opportunities: staff select" on trade_opportunities;
drop policy if exists "trade_opportunities: staff insert" on trade_opportunities;
drop policy if exists "trade_opportunities: staff update" on trade_opportunities;
drop policy if exists "trade_opportunities: staff delete" on trade_opportunities;
create policy "trade_opportunities: staff select" on trade_opportunities for select using (is_staff());
create policy "trade_opportunities: staff insert" on trade_opportunities for insert with check (is_staff());
create policy "trade_opportunities: staff update" on trade_opportunities for update using (is_staff()) with check (is_staff());
create policy "trade_opportunities: staff delete" on trade_opportunities for delete using (is_staff());

drop policy if exists "trade_quotes: staff select" on trade_quotes;
drop policy if exists "trade_quotes: staff insert" on trade_quotes;
drop policy if exists "trade_quotes: staff update" on trade_quotes;
create policy "trade_quotes: staff select" on trade_quotes for select using (is_staff());
create policy "trade_quotes: staff insert" on trade_quotes for insert with check (is_staff());
create policy "trade_quotes: staff update" on trade_quotes for update using (is_staff()) with check (is_staff());
-- Quote history is commercial evidence: correct status instead of deleting it.

-- Seed the pipeline from business intent already captured by the House.
insert into trade_opportunities (id, contact_key, business_name, contact, stage, source_type, source_id, next_action, next_action_at, created_at, updated_at)
select 'opp-lead-' || substr(md5(l.id), 1, 12), lower(btrim(l.contact)), coalesce(nullif(btrim(l.business_name), ''), nullif(btrim(l.name), ''), 'Chưa đặt tên'), btrim(l.contact), 'lead', 'lead', l.id,
       'Liên hệ và xác nhận nhu cầu', coalesce(l.ts, now()) + interval '1 day', coalesce(l.ts, now()), now()
from leads l where nullif(btrim(l.contact), '') is not null
on conflict (contact_key) do nothing;

insert into trade_opportunities (id, contact_key, business_name, contact, stage, source_type, source_id, next_action, next_action_at, created_at, updated_at)
select 'opp-sample-' || substr(md5(s.id), 1, 12), lower(btrim(s.phone)), s.store_name, btrim(s.phone),
       case when s.status = 'sent' then 'sample_sent' when s.status = 'converted' then 'won' else 'sample_requested' end,
       'sample', s.id,
       case when s.status = 'sent' then 'Hỏi phản hồi sau khi thử trà' when s.status = 'converted' then 'Chuẩn bị đường tái đặt hàng' else 'Xác nhận và gửi mẫu' end,
       coalesce(s.ts, now()) + case when s.status = 'sent' then interval '7 days' else interval '1 day' end,
       coalesce(s.ts, now()), now()
from sample_requests s where nullif(btrim(s.phone), '') is not null
on conflict (contact_key) do update set
  business_name = excluded.business_name,
  source_type = excluded.source_type,
  source_id = excluded.source_id,
  updated_at = now()
where trade_opportunities.stage in ('lead', 'sample_requested');

insert into trade_opportunities (id, contact_key, business_name, contact, stage, source_type, source_id, next_action, created_at, updated_at)
select 'opp-partner-' || substr(md5(w.id), 1, 12), lower(btrim(w.contact)), w.business_name, btrim(w.contact), 'active', 'partner', w.id,
       'Hẹn nhịp tái đặt hàng', coalesce(w.created_at, now()), now()
from wholesale_accounts w where nullif(btrim(w.contact), '') is not null
on conflict (contact_key) do update set
  business_name = excluded.business_name,
  stage = case when trade_opportunities.stage = 'lost' then trade_opportunities.stage else 'active' end,
  source_type = excluded.source_type,
  source_id = excluded.source_id,
  updated_at = now();

create or replace function convert_trade_quote_to_order(p_quote_id text, p_actor text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  q trade_quotes%rowtype;
  v_order_id text;
  v_total_kg numeric;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  select * into q from trade_quotes where id = p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if q.converted_order_id is not null then return q.converted_order_id; end if;
  if q.status <> 'accepted' then raise exception 'quote_not_accepted'; end if;

  select coalesce(sum(coalesce((line->>'qty')::numeric, 0)), 0)
  into v_total_kg from jsonb_array_elements(q.lines) line;

  v_order_id := 'order-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4);
  insert into orders (
    id, ts, type, customer_name, contact, address, note, lines, total_kg,
    estimated_total, payment_method, status, tracking_code, unread
  ) values (
    v_order_id, now(), 'wholesale', q.customer_name, q.contact, q.address,
    concat('Từ báo giá ', q.id, case when q.note <> '' then E'\n' || q.note else '' end),
    q.lines, v_total_kg, q.total, q.payment_method, 'pending', '', true
  );

  update trade_quotes set status = 'converted', converted_order_id = v_order_id, updated_at = now() where id = q.id;
  update trade_opportunities set stage = 'won', next_action = 'Xác nhận và chuẩn bị đơn đầu tiên', next_action_at = now(), updated_at = now()
  where id = q.opportunity_id;

  return v_order_id;
end;
$$;

revoke all on function convert_trade_quote_to_order(text, text) from public;
grant execute on function convert_trade_quote_to_order(text, text) to authenticated;
