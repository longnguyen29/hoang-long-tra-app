-- Hoàng Long Morning Desk: one daily operating surface above the specialist apps.
-- Live operational facts stay in their source tables. This migration stores only
-- staff intent (mode, focus, resume point) and reviewed company memory.

create table if not exists morning_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'owner' check (mode in ('owner', 'sales', 'operations')),
  last_app_key text not null default '',
  last_href text not null default '',
  last_label text not null default '',
  last_context jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists morning_focus_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  work_date date not null default current_date,
  position smallint not null check (position between 1 and 3),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  app_key text not null check (app_key in ('orders', 'pipeline', 'operations', 'control', 'house')),
  href text not null,
  status text not null default 'planned' check (status in ('planned', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint morning_focus_items_one_slot unique (user_id, work_date, position)
);

create table if not exists company_memory_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('decision', 'policy', 'learning')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null default '',
  source text not null default 'morning_desk',
  status text not null default 'inbox' check (status in ('inbox', 'approved', 'archived')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  review_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists morning_focus_items_today_idx
  on morning_focus_items(user_id, work_date, position);
create index if not exists company_memory_items_status_idx
  on company_memory_items(status, created_at desc);

alter table morning_preferences enable row level security;
alter table morning_focus_items enable row level security;
alter table company_memory_items enable row level security;

drop policy if exists "morning_preferences: own select" on morning_preferences;
drop policy if exists "morning_preferences: own insert" on morning_preferences;
drop policy if exists "morning_preferences: own update" on morning_preferences;
create policy "morning_preferences: own select" on morning_preferences
  for select using (is_staff() and user_id = auth.uid());
create policy "morning_preferences: own insert" on morning_preferences
  for insert with check (is_staff() and user_id = auth.uid());
create policy "morning_preferences: own update" on morning_preferences
  for update using (is_staff() and user_id = auth.uid())
  with check (is_staff() and user_id = auth.uid());

drop policy if exists "morning_focus_items: own select" on morning_focus_items;
drop policy if exists "morning_focus_items: own insert" on morning_focus_items;
drop policy if exists "morning_focus_items: own update" on morning_focus_items;
create policy "morning_focus_items: own select" on morning_focus_items
  for select using (is_staff() and user_id = auth.uid());
create policy "morning_focus_items: own insert" on morning_focus_items
  for insert with check (is_staff() and user_id = auth.uid());
create policy "morning_focus_items: own update" on morning_focus_items
  for update using (is_staff() and user_id = auth.uid())
  with check (is_staff() and user_id = auth.uid());

drop policy if exists "company_memory_items: staff select" on company_memory_items;
drop policy if exists "company_memory_items: staff insert" on company_memory_items;
drop policy if exists "company_memory_items: staff update" on company_memory_items;
create policy "company_memory_items: staff select" on company_memory_items
  for select using (is_staff());
create policy "company_memory_items: staff insert" on company_memory_items
  for insert with check (is_staff() and created_by = auth.uid());
create policy "company_memory_items: staff update" on company_memory_items
  for update using (is_staff()) with check (is_staff());

create or replace function morning_desk_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_operations jsonb;
  v_result jsonb;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  select operations_control_snapshot() into v_operations;

  select jsonb_build_object(
    'today', current_date,
    'operations', v_operations,
    'queue', jsonb_build_object(
      'orders_unread', (select count(*) from orders where unread and status <> 'completed'),
      'orders_open', (select count(*) from orders where status <> 'completed'),
      'leads_unread', (select count(*) from leads where unread),
      'samples_waiting', (select count(*) from sample_requests where unread or status = 'new'),
      'messages_unread', (select count(*) from support_threads where unread_for_admin),
      'sessions_pending', (select count(*) from tea_sessions where status = 'pending'),
      'pipeline_due', (
        select count(*) from trade_opportunities
        where stage <> 'lost' and next_action_at is not null and next_action_at <= now()
      )
    ),
    'preference', coalesce((
      select to_jsonb(p) - 'user_id' from morning_preferences p where p.user_id = auth.uid()
    ), jsonb_build_object('mode', 'owner')),
    'focus', coalesce((
      select jsonb_agg(to_jsonb(f) - 'user_id' order by f.position)
      from morning_focus_items f
      where f.user_id = auth.uid() and f.work_date = current_date
    ), '[]'::jsonb),
    'memory', jsonb_build_object(
      'inbox_count', (select count(*) from company_memory_items where status = 'inbox'),
      'inbox', coalesce((
        select jsonb_agg(to_jsonb(m) order by m.created_at desc)
        from (
          select * from company_memory_items where status = 'inbox'
          order by created_at desc limit 6
        ) m
      ), '[]'::jsonb),
      'approved', coalesce((
        select jsonb_agg(to_jsonb(m) order by m.approved_at desc nulls last, m.created_at desc)
        from (
          select * from company_memory_items where status = 'approved'
          order by approved_at desc nulls last, created_at desc limit 6
        ) m
      ), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function morning_desk_snapshot() from public;
revoke all on function morning_desk_snapshot() from anon;
grant execute on function morning_desk_snapshot() to authenticated;

create or replace function save_morning_preference(
  p_mode text,
  p_last_app_key text default '',
  p_last_href text default '',
  p_last_label text default '',
  p_last_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_mode not in ('owner', 'sales', 'operations') then raise exception 'invalid_mode'; end if;

  insert into morning_preferences(user_id, mode, last_app_key, last_href, last_label, last_context)
  values(auth.uid(), p_mode, coalesce(p_last_app_key, ''), coalesce(p_last_href, ''), coalesce(p_last_label, ''), coalesce(p_last_context, '{}'::jsonb))
  on conflict (user_id) do update set
    mode = excluded.mode,
    last_app_key = case when excluded.last_href = '' then morning_preferences.last_app_key else excluded.last_app_key end,
    last_href = case when excluded.last_href = '' then morning_preferences.last_href else excluded.last_href end,
    last_label = case when excluded.last_href = '' then morning_preferences.last_label else excluded.last_label end,
    last_context = case when excluded.last_href = '' then morning_preferences.last_context else excluded.last_context end,
    updated_at = now();
end;
$$;

revoke all on function save_morning_preference(text,text,text,text,jsonb) from public;
revoke all on function save_morning_preference(text,text,text,text,jsonb) from anon;
grant execute on function save_morning_preference(text,text,text,text,jsonb) to authenticated;

create or replace function save_morning_focus(
  p_position integer,
  p_title text,
  p_app_key text,
  p_href text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_position not between 1 and 3 then raise exception 'invalid_position'; end if;
  if p_app_key not in ('orders', 'pipeline', 'operations', 'control', 'house') then raise exception 'invalid_app'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'title_required'; end if;

  insert into morning_focus_items(user_id, work_date, position, title, app_key, href)
  values(auth.uid(), current_date, p_position, btrim(p_title), p_app_key, p_href)
  on conflict (user_id, work_date, position) do update set
    title = excluded.title,
    app_key = excluded.app_key,
    href = excluded.href,
    status = 'planned',
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function save_morning_focus(integer,text,text,text) from public;
revoke all on function save_morning_focus(integer,text,text,text) from anon;
grant execute on function save_morning_focus(integer,text,text,text) to authenticated;

create or replace function set_morning_focus_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_status not in ('planned', 'done') then raise exception 'invalid_status'; end if;

  update morning_focus_items
  set status = p_status, updated_at = now()
  where id = p_id and user_id = auth.uid() and work_date = current_date;
end;
$$;

revoke all on function set_morning_focus_status(uuid,text) from public;
revoke all on function set_morning_focus_status(uuid,text) from anon;
grant execute on function set_morning_focus_status(uuid,text) to authenticated;

create or replace function capture_company_memory(
  p_kind text,
  p_title text,
  p_body text default '',
  p_source text default 'morning_desk'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_kind not in ('decision', 'policy', 'learning') then raise exception 'invalid_kind'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'title_required'; end if;

  insert into company_memory_items(kind, title, body, source, created_by)
  values(p_kind, btrim(p_title), btrim(coalesce(p_body, '')), coalesce(nullif(btrim(p_source), ''), 'morning_desk'), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function capture_company_memory(text,text,text,text) from public;
revoke all on function capture_company_memory(text,text,text,text) from anon;
grant execute on function capture_company_memory(text,text,text,text) to authenticated;

create or replace function review_company_memory(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from staff_roles
    where user_id = auth.uid() and role in ('admin', 'manager')
  ) then raise exception 'review_not_authorised'; end if;
  if p_status not in ('approved', 'archived') then raise exception 'invalid_status'; end if;

  update company_memory_items
  set status = p_status,
      approved_by = case when p_status = 'approved' then auth.uid() else approved_by end,
      approved_at = case when p_status = 'approved' then now() else approved_at end,
      updated_at = now()
  where id = p_id and status = 'inbox';
end;
$$;

revoke all on function review_company_memory(uuid,text) from public;
revoke all on function review_company_memory(uuid,text) from anon;
grant execute on function review_company_memory(uuid,text) to authenticated;
