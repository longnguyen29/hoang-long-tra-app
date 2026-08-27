-- Hoàng Long budget allocation: approved envelopes, committed spend and paid spend.
-- The ledger is additive. CRM, orders and operating records remain the source of truth.

create or replace function is_budget_approver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff_roles
    where user_id = auth.uid() and role in ('admin', 'manager')
  );
$$;

revoke all on function is_budget_approver() from public;
revoke all on function is_budget_approver() from anon;
grant execute on function is_budget_approver() to authenticated;

create table if not exists budget_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  starts_on date not null,
  ends_on date not null,
  total_limit numeric(16,2) not null default 0 check (total_limit >= 0),
  currency text not null default 'VND' check (currency = 'VND'),
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  note text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_periods_date_order check (ends_on >= starts_on)
);

create unique index if not exists budget_periods_one_active_idx
  on budget_periods(status) where status = 'active';
create index if not exists budget_periods_dates_idx
  on budget_periods(starts_on desc, ends_on desc);

create table if not exists budget_envelopes (
  code text primary key,
  name text not null,
  default_kind text not null check (default_kind in ('operating', 'investment', 'reserve')),
  description text not null default '',
  sort_order smallint not null default 0,
  active boolean not null default true
);

insert into budget_envelopes(code, name, default_kind, description, sort_order)
values
  ('customer_acquisition', 'Thu hút khách hàng', 'operating', 'Quảng cáo, nội dung, hội chợ và kênh tạo khách hàng mới.', 10),
  ('sales_conversion', 'Chuyển đổi bán hàng', 'operating', 'Trà mẫu, thử công thức, tiếp khách và hỗ trợ chốt đơn.', 20),
  ('packaging_label', 'Bao bì & nhãn', 'investment', 'Thiết kế, in thử, khuôn, MOQ và cải thiện hình ảnh sản phẩm.', 30),
  ('production_quality', 'Sản xuất & chất lượng', 'investment', 'Máy móc, kiểm nghiệm, kho và cải thiện quy trình.', 40),
  ('product_development', 'Phát triển sản phẩm', 'investment', 'Công thức, thử nghiệm và sản phẩm riêng cho khách B2B.', 50),
  ('reserve', 'Dự phòng', 'reserve', 'Khoản linh hoạt cho cơ hội hoặc sự cố chưa dự kiến.', 60)
on conflict (code) do update set
  name = excluded.name,
  default_kind = excluded.default_kind,
  description = excluded.description,
  sort_order = excluded.sort_order;

create table if not exists budget_allocations (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references budget_periods(id) on delete cascade,
  envelope_code text not null references budget_envelopes(code) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  spend_kind text not null check (spend_kind in ('recurring', 'one_off', 'reserve')),
  amount numeric(16,2) not null check (amount > 0),
  owner text not null default '',
  expected_outcome text not null check (char_length(btrim(expected_outcome)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budget_allocations_period_idx
  on budget_allocations(period_id, status, created_at desc);
create index if not exists budget_allocations_envelope_idx
  on budget_allocations(envelope_code, period_id);

create table if not exists budget_spend_items (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references budget_allocations(id) on delete cascade,
  description text not null check (char_length(btrim(description)) between 1 and 200),
  vendor text not null default '',
  amount numeric(16,2) not null check (amount > 0),
  status text not null default 'planned' check (status in ('planned', 'committed', 'paid', 'cancelled')),
  incurred_on date,
  due_on date,
  linked_app text not null default '' check (linked_app in ('', 'orders', 'pipeline', 'operations', 'control', 'house')),
  linked_ref text not null default '',
  outcome_note text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budget_spend_allocation_idx
  on budget_spend_items(allocation_id, status, created_at desc);
create index if not exists budget_spend_due_idx
  on budget_spend_items(due_on) where status in ('planned', 'committed');

alter table budget_periods enable row level security;
alter table budget_envelopes enable row level security;
alter table budget_allocations enable row level security;
alter table budget_spend_items enable row level security;

create policy "budget_periods: staff select" on budget_periods
  for select using (is_staff());
create policy "budget_envelopes: staff select" on budget_envelopes
  for select using (is_staff());
create policy "budget_allocations: staff select" on budget_allocations
  for select using (is_staff());
create policy "budget_spend_items: staff select" on budget_spend_items
  for select using (is_staff());

create or replace function create_budget_period(
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_total_limit numeric,
  p_note text default '',
  p_activate boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_budget_approver() then raise exception 'approver_required'; end if;
  if btrim(coalesce(p_name, '')) = '' then raise exception 'name_required'; end if;
  if p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on then raise exception 'invalid_period'; end if;
  if coalesce(p_total_limit, 0) < 0 then raise exception 'invalid_total_limit'; end if;

  if p_activate then
    update budget_periods set status = 'closed', updated_at = now() where status = 'active';
  end if;

  insert into budget_periods(name, starts_on, ends_on, total_limit, note, status)
  values(
    btrim(p_name), p_starts_on, p_ends_on, coalesce(p_total_limit, 0),
    btrim(coalesce(p_note, '')), case when p_activate then 'active' else 'draft' end
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function create_budget_period(text,date,date,numeric,text,boolean) from public;
revoke all on function create_budget_period(text,date,date,numeric,text,boolean) from anon;
grant execute on function create_budget_period(text,date,date,numeric,text,boolean) to authenticated;

create or replace function create_budget_allocation(
  p_period_id uuid,
  p_envelope_code text,
  p_title text,
  p_spend_kind text,
  p_amount numeric,
  p_owner text,
  p_expected_outcome text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if not exists(select 1 from budget_periods where id = p_period_id and status in ('draft', 'active')) then raise exception 'period_not_open'; end if;
  if not exists(select 1 from budget_envelopes where code = p_envelope_code and active) then raise exception 'invalid_envelope'; end if;
  if p_spend_kind not in ('recurring', 'one_off', 'reserve') then raise exception 'invalid_spend_kind'; end if;
  if btrim(coalesce(p_title, '')) = '' or btrim(coalesce(p_expected_outcome, '')) = '' then raise exception 'title_and_outcome_required'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'invalid_amount'; end if;

  insert into budget_allocations(period_id, envelope_code, title, spend_kind, amount, owner, expected_outcome)
  values(p_period_id, p_envelope_code, btrim(p_title), p_spend_kind, p_amount, btrim(coalesce(p_owner, '')), btrim(p_expected_outcome))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function create_budget_allocation(uuid,text,text,text,numeric,text,text) from public;
revoke all on function create_budget_allocation(uuid,text,text,text,numeric,text,text) from anon;
grant execute on function create_budget_allocation(uuid,text,text,text,numeric,text,text) to authenticated;

create or replace function review_budget_allocation(
  p_id uuid,
  p_status text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_period_id uuid; v_amount numeric; v_limit numeric; v_approved numeric;
begin
  if not is_budget_approver() then raise exception 'approver_required'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid_status'; end if;

  select period_id, amount into v_period_id, v_amount
  from budget_allocations where id = p_id and status = 'pending' for update;
  if v_period_id is null then raise exception 'allocation_not_pending'; end if;

  if p_status = 'approved' then
    select total_limit into v_limit from budget_periods where id = v_period_id for update;
    select coalesce(sum(amount), 0) into v_approved from budget_allocations
    where period_id = v_period_id and status = 'approved';
    if v_approved + v_amount > v_limit then raise exception 'period_limit_exceeded'; end if;
  end if;

  update budget_allocations
  set status = p_status,
      approved_by = auth.uid(),
      approved_at = now(),
      review_note = btrim(coalesce(p_note, '')),
      updated_at = now()
  where id = p_id and status = 'pending';
end;
$$;

revoke all on function review_budget_allocation(uuid,text,text) from public;
revoke all on function review_budget_allocation(uuid,text,text) from anon;
grant execute on function review_budget_allocation(uuid,text,text) to authenticated;

create or replace function create_budget_spend(
  p_allocation_id uuid,
  p_description text,
  p_vendor text,
  p_amount numeric,
  p_status text,
  p_incurred_on date,
  p_due_on date,
  p_linked_app text default '',
  p_linked_ref text default '',
  p_outcome_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_limit numeric; v_used numeric;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_status not in ('planned', 'committed', 'paid') then raise exception 'invalid_status'; end if;
  if coalesce(p_linked_app, '') not in ('', 'orders', 'pipeline', 'operations', 'control', 'house') then raise exception 'invalid_linked_app'; end if;
  if btrim(coalesce(p_description, '')) = '' or coalesce(p_amount, 0) <= 0 then raise exception 'description_and_amount_required'; end if;

  select amount into v_limit from budget_allocations where id = p_allocation_id and status = 'approved' for update;
  if v_limit is null then raise exception 'approved_allocation_required'; end if;
  select coalesce(sum(amount), 0) into v_used from budget_spend_items
  where allocation_id = p_allocation_id and status in ('committed', 'paid');
  if p_status in ('committed', 'paid') and v_used + p_amount > v_limit then raise exception 'allocation_exceeded'; end if;

  insert into budget_spend_items(
    allocation_id, description, vendor, amount, status, incurred_on, due_on,
    linked_app, linked_ref, outcome_note
  ) values(
    p_allocation_id, btrim(p_description), btrim(coalesce(p_vendor, '')), p_amount,
    p_status, case when p_status = 'paid' then coalesce(p_incurred_on, current_date) else p_incurred_on end,
    p_due_on, coalesce(p_linked_app, ''),
    btrim(coalesce(p_linked_ref, '')), btrim(coalesce(p_outcome_note, ''))
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function create_budget_spend(uuid,text,text,numeric,text,date,date,text,text,text) from public;
revoke all on function create_budget_spend(uuid,text,text,numeric,text,date,date,text,text,text) from anon;
grant execute on function create_budget_spend(uuid,text,text,numeric,text,date,date,text,text,text) to authenticated;

create or replace function set_budget_spend_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_allocation uuid; v_amount numeric; v_limit numeric; v_used numeric; v_current text;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_status not in ('planned', 'committed', 'paid', 'cancelled') then raise exception 'invalid_status'; end if;

  select allocation_id, amount, status into v_allocation, v_amount, v_current
  from budget_spend_items where id = p_id for update;
  if v_allocation is null then raise exception 'spend_not_found'; end if;
  if not (
    p_status = v_current or
    (v_current = 'planned' and p_status in ('committed', 'cancelled')) or
    (v_current = 'committed' and p_status in ('paid', 'cancelled'))
  ) then raise exception 'invalid_status_transition'; end if;

  if p_status in ('committed', 'paid') then
    select amount into v_limit from budget_allocations where id = v_allocation and status = 'approved';
    if v_limit is null then raise exception 'approved_allocation_required'; end if;
    select coalesce(sum(amount), 0) into v_used from budget_spend_items
    where allocation_id = v_allocation and id <> p_id and status in ('committed', 'paid');
    if v_used + v_amount > v_limit then raise exception 'allocation_exceeded'; end if;
  end if;

  update budget_spend_items
  set status = p_status,
      incurred_on = case when p_status = 'paid' then coalesce(incurred_on, current_date) else incurred_on end,
      updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function set_budget_spend_status(uuid,text) from public;
revoke all on function set_budget_spend_status(uuid,text) from anon;
grant execute on function set_budget_spend_status(uuid,text) to authenticated;

create or replace function budget_snapshot(p_period_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_period_id uuid; v_result jsonb;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  v_period_id := p_period_id;
  if v_period_id is null then
    select id into v_period_id from budget_periods
    order by case when status = 'active' then 0 when status = 'draft' then 1 else 2 end, starts_on desc
    limit 1;
  end if;

  select jsonb_build_object(
    'can_approve', is_budget_approver(),
    'periods', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.starts_on desc)
      from budget_periods p
    ), '[]'::jsonb),
    'period', (select to_jsonb(p) from budget_periods p where p.id = v_period_id),
    'envelopes', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.sort_order)
      from budget_envelopes e where e.active
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'total_limit', coalesce((select total_limit from budget_periods where id = v_period_id), 0),
      'approved_allocated', coalesce((select sum(amount) from budget_allocations where period_id = v_period_id and status = 'approved'), 0),
      'pending_allocated', coalesce((select sum(amount) from budget_allocations where period_id = v_period_id and status = 'pending'), 0),
      'committed', coalesce((
        select sum(s.amount) from budget_spend_items s join budget_allocations a on a.id = s.allocation_id
        where a.period_id = v_period_id and s.status in ('committed', 'paid')
      ), 0),
      'spent', coalesce((
        select sum(s.amount) from budget_spend_items s join budget_allocations a on a.id = s.allocation_id
        where a.period_id = v_period_id and s.status = 'paid'
      ), 0),
      'approval_count', (select count(*) from budget_allocations where period_id = v_period_id and status = 'pending')
    ),
    'allocations', coalesce((
      select jsonb_agg(
        (to_jsonb(a) || jsonb_build_object(
          'envelope_name', e.name,
          'envelope_description', e.description,
          'committed', coalesce((select sum(s.amount) from budget_spend_items s where s.allocation_id = a.id and s.status in ('committed', 'paid')), 0),
          'spent', coalesce((select sum(s.amount) from budget_spend_items s where s.allocation_id = a.id and s.status = 'paid'), 0)
        )) order by e.sort_order, a.created_at desc
      )
      from budget_allocations a join budget_envelopes e on e.code = a.envelope_code
      where a.period_id = v_period_id
    ), '[]'::jsonb),
    'spends', coalesce((
      select jsonb_agg(
        (to_jsonb(s) || jsonb_build_object('allocation_title', a.title, 'envelope_code', a.envelope_code))
        order by s.created_at desc
      )
      from budget_spend_items s join budget_allocations a on a.id = s.allocation_id
      where a.period_id = v_period_id
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function budget_snapshot(uuid) from public;
revoke all on function budget_snapshot(uuid) from anon;
grant execute on function budget_snapshot(uuid) to authenticated;

create or replace function budget_morning_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with active_period as (
    select id, total_limit from budget_periods where status = 'active' limit 1
  ), totals as (
    select
      coalesce(sum(a.amount) filter (where a.status = 'approved'), 0) as allocated,
      coalesce(sum(a.amount) filter (where a.status = 'pending'), 0) as pending,
      count(*) filter (where a.status = 'pending') as pending_count
    from budget_allocations a join active_period p on p.id = a.period_id
  ), spend as (
    select
      coalesce(sum(s.amount) filter (where s.status in ('committed', 'paid')), 0) as committed,
      coalesce(sum(s.amount) filter (where s.status = 'paid'), 0) as spent
    from budget_spend_items s
    join budget_allocations a on a.id = s.allocation_id
    join active_period p on p.id = a.period_id
  ), envelope_risk as (
    select count(*) as risk_count
    from budget_allocations a
    join active_period p on p.id = a.period_id
    where a.status = 'approved' and a.amount > 0 and
      coalesce((select sum(s.amount) from budget_spend_items s where s.allocation_id = a.id and s.status in ('committed', 'paid')), 0) >= a.amount * 0.8
  )
  select case when not is_staff() then null else jsonb_build_object(
    'has_active_period', exists(select 1 from active_period),
    'total_limit', coalesce((select total_limit from active_period), 0),
    'allocated', coalesce((select allocated from totals), 0),
    'pending', coalesce((select pending from totals), 0),
    'pending_count', coalesce((select pending_count from totals), 0),
    'committed', coalesce((select committed from spend), 0),
    'spent', coalesce((select spent from spend), 0),
    'risk_count', coalesce((select risk_count from envelope_risk), 0)
  ) end;
$$;

revoke all on function budget_morning_snapshot() from public;
revoke all on function budget_morning_snapshot() from anon;
grant execute on function budget_morning_snapshot() to authenticated;
