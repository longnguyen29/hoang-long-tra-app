-- Vietnamese-first work assignment for managers and low-tech staff.
-- A work slip has one owner, one due time and a small, audited state machine.

create or replace function is_staff_manager()
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

revoke all on function is_staff_manager() from public;
grant execute on function is_staff_manager() to authenticated;

create table if not exists staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into staff_profiles(user_id, display_name)
select
  roles.user_id,
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(users.email, '@', 1), ''),
    'Nhân viên Hoàng Long'
  )
from staff_roles roles
join auth.users users on users.id = roles.user_id
on conflict (user_id) do nothing;

create table if not exists work_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  instructions text not null default '',
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  assigned_to uuid not null references staff_profiles(user_id) on delete restrict,
  recurrence text not null check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly')),
  start_on date not null,
  due_time time not null default '17:00',
  next_run_on date not null,
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  reference_text text not null default '',
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references work_templates(id) on delete set null,
  occurrence_on date,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  instructions text not null default '',
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  assigned_to uuid not null references staff_profiles(user_id) on delete restrict,
  assigned_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  due_at timestamptz not null,
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  reference_text text not null default '',
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'blocked', 'completed', 'cancelled')),
  blocked_note text not null default '',
  completion_note text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_tasks_one_template_occurrence unique(template_id, occurrence_on)
);

create table if not exists work_task_events (
  id bigint generated always as identity primary key,
  task_id uuid not null references work_tasks(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists work_tasks_assignee_due_idx
  on work_tasks(assigned_to, status, due_at);
create index if not exists work_tasks_manager_due_idx
  on work_tasks(status, due_at);
create index if not exists work_templates_next_idx
  on work_templates(active, next_run_on);
create index if not exists work_task_events_task_idx
  on work_task_events(task_id, created_at desc);

alter table staff_profiles enable row level security;
alter table work_templates enable row level security;
alter table work_tasks enable row level security;
alter table work_task_events enable row level security;

drop policy if exists "staff_profiles: staff select" on staff_profiles;
create policy "staff_profiles: staff select" on staff_profiles
  for select using (is_staff());
drop policy if exists "staff_profiles: manager update" on staff_profiles;
create policy "staff_profiles: manager update" on staff_profiles
  for update using (is_staff_manager()) with check (is_staff_manager());

drop policy if exists "work_templates: visible select" on work_templates;
create policy "work_templates: visible select" on work_templates
  for select using (is_staff_manager() or assigned_to = auth.uid());
drop policy if exists "work_templates: manager insert" on work_templates;
create policy "work_templates: manager insert" on work_templates
  for insert with check (is_staff_manager() and created_by = auth.uid());
drop policy if exists "work_templates: manager update" on work_templates;
create policy "work_templates: manager update" on work_templates
  for update using (is_staff_manager()) with check (is_staff_manager());

drop policy if exists "work_tasks: visible select" on work_tasks;
create policy "work_tasks: visible select" on work_tasks
  for select using (is_staff_manager() or assigned_to = auth.uid() or assigned_by = auth.uid());
drop policy if exists "work_tasks: manager insert" on work_tasks;
create policy "work_tasks: manager insert" on work_tasks
  for insert with check (is_staff_manager() and assigned_by = auth.uid());
drop policy if exists "work_tasks: manager update" on work_tasks;
create policy "work_tasks: manager update" on work_tasks
  for update using (is_staff_manager()) with check (is_staff_manager());

drop policy if exists "work_task_events: visible select" on work_task_events;
create policy "work_task_events: visible select" on work_task_events
  for select using (
    exists (
      select 1 from work_tasks task
      where task.id = task_id
        and (is_staff_manager() or task.assigned_to = auth.uid() or task.assigned_by = auth.uid())
    )
  );

create or replace function next_work_occurrence(p_date date, p_recurrence text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare v_next date;
begin
  if p_recurrence = 'daily' then return p_date + 1; end if;
  if p_recurrence = 'weekly' then return p_date + 7; end if;
  if p_recurrence = 'monthly' then return (p_date + interval '1 month')::date; end if;
  if p_recurrence = 'weekdays' then
    v_next := p_date + 1;
    while extract(isodow from v_next) in (6, 7) loop v_next := v_next + 1; end loop;
    return v_next;
  end if;
  raise exception 'invalid_recurrence';
end;
$$;

create or replace function generate_due_work_tasks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template work_templates%rowtype;
  v_occurrence date;
  v_created integer := 0;
  v_guard integer;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  for v_template in
    select * from work_templates where active and next_run_on <= current_date
    order by next_run_on
  loop
    v_occurrence := v_template.next_run_on;
    v_guard := 0;
    while v_occurrence <= current_date and v_guard < 370 loop
      insert into work_tasks(
        template_id, occurrence_on, title, instructions, checklist, assigned_to,
        assigned_by, due_at, priority, reference_text
      ) values (
        v_template.id, v_occurrence, v_template.title, v_template.instructions,
        v_template.checklist, v_template.assigned_to, v_template.created_by,
        (v_occurrence + v_template.due_time) at time zone 'Asia/Ho_Chi_Minh',
        v_template.priority, v_template.reference_text
      ) on conflict (template_id, occurrence_on) do nothing;
      if found then v_created := v_created + 1; end if;
      v_occurrence := next_work_occurrence(v_occurrence, v_template.recurrence);
      v_guard := v_guard + 1;
    end loop;
    update work_templates set next_run_on = v_occurrence, updated_at = now()
    where id = v_template.id;
  end loop;

  return v_created;
end;
$$;

create or replace function save_work_instruction(
  p_title text,
  p_instructions text,
  p_checklist jsonb,
  p_assigned_to uuid,
  p_due_at timestamptz,
  p_recurrence text,
  p_start_on date,
  p_due_time time,
  p_priority text,
  p_reference_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_staff_manager() then raise exception 'not_authorised'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'title_required'; end if;
  if p_priority not in ('normal', 'urgent') then raise exception 'invalid_priority'; end if;
  if not exists(select 1 from staff_profiles where user_id = p_assigned_to and active) then
    raise exception 'assignee_not_found';
  end if;
  if coalesce(jsonb_typeof(p_checklist), 'array') <> 'array' then raise exception 'invalid_checklist'; end if;

  if p_recurrence = 'once' then
    if p_due_at is null then raise exception 'due_at_required'; end if;
    insert into work_tasks(
      title, instructions, checklist, assigned_to, assigned_by, due_at, priority, reference_text
    ) values (
      btrim(p_title), btrim(coalesce(p_instructions, '')), coalesce(p_checklist, '[]'::jsonb),
      p_assigned_to, auth.uid(), p_due_at, p_priority, btrim(coalesce(p_reference_text, ''))
    ) returning id into v_id;
  else
    if p_recurrence not in ('daily', 'weekdays', 'weekly', 'monthly') then raise exception 'invalid_recurrence'; end if;
    if p_start_on is null or p_due_time is null then raise exception 'schedule_required'; end if;
    insert into work_templates(
      title, instructions, checklist, assigned_to, recurrence, start_on, due_time,
      next_run_on, priority, reference_text, created_by
    ) values (
      btrim(p_title), btrim(coalesce(p_instructions, '')), coalesce(p_checklist, '[]'::jsonb),
      p_assigned_to, p_recurrence, p_start_on, p_due_time, p_start_on,
      p_priority, btrim(coalesce(p_reference_text, '')), auth.uid()
    ) returning id into v_id;
    perform generate_due_work_tasks();
  end if;

  return v_id;
end;
$$;

create or replace function set_work_task_status(p_id uuid, p_status text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task work_tasks%rowtype;
  v_manager boolean := is_staff_manager();
  v_message text;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  select * into v_task from work_tasks where id = p_id for update;
  if v_task.id is null then raise exception 'task_not_found'; end if;
  if not v_manager and v_task.assigned_to <> auth.uid() then raise exception 'not_assigned'; end if;
  if p_status not in ('assigned', 'in_progress', 'blocked', 'completed', 'cancelled') then raise exception 'invalid_status'; end if;
  if p_status = 'cancelled' and not v_manager then raise exception 'manager_required'; end if;
  if p_status = 'assigned' and not v_manager then raise exception 'manager_required'; end if;

  if not v_manager and not (
    (v_task.status = 'assigned' and p_status in ('in_progress', 'blocked')) or
    (v_task.status = 'in_progress' and p_status in ('blocked', 'completed')) or
    (v_task.status = 'blocked' and p_status in ('in_progress', 'completed')) or
    v_task.status = p_status
  ) then raise exception 'invalid_transition'; end if;

  update work_tasks set
    status = p_status,
    blocked_note = case when p_status = 'blocked' then btrim(coalesce(p_note, '')) when p_status = 'in_progress' then '' else blocked_note end,
    completion_note = case when p_status = 'completed' then btrim(coalesce(p_note, '')) else completion_note end,
    started_at = case when p_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
    completed_at = case when p_status = 'completed' then now() when p_status in ('assigned', 'in_progress') then null else completed_at end,
    updated_at = now()
  where id = p_id;

  v_message := case p_status
    when 'assigned' then 'Đã đưa việc về trạng thái chờ nhận.'
    when 'in_progress' then 'Đã bắt đầu công việc.'
    when 'blocked' then 'Đã báo vướng: ' || coalesce(nullif(btrim(p_note), ''), 'Chưa ghi lý do.')
    when 'completed' then 'Đã hoàn tất công việc.'
    when 'cancelled' then 'Quản lý đã hủy công việc.'
  end;
  insert into work_task_events(task_id, actor_id, event_type, message)
  values(p_id, auth.uid(), p_status, v_message);
end;
$$;

create or replace function set_work_template_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff_manager() then raise exception 'not_authorised'; end if;
  update work_templates set active = p_active, updated_at = now() where id = p_id;
  if not found then raise exception 'template_not_found'; end if;
end;
$$;

create or replace function log_work_task_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into work_task_events(task_id, actor_id, event_type, message)
  values(new.id, new.assigned_by, 'created', 'Đã giao việc.');
  return new;
end;
$$;

drop trigger if exists work_task_created_event on work_tasks;
create trigger work_task_created_event
after insert on work_tasks
for each row execute function log_work_task_created();

create or replace function ensure_staff_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into staff_profiles(user_id, display_name)
  select
    new.user_id,
    coalesce(
      nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(users.email, '@', 1), ''),
      'Nhân viên Hoàng Long'
    )
  from auth.users users where users.id = new.user_id
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists staff_role_ensures_profile on staff_roles;
create trigger staff_role_ensures_profile
after insert on staff_roles
for each row execute function ensure_staff_profile();

revoke all on function generate_due_work_tasks() from public;
revoke all on function save_work_instruction(text,text,jsonb,uuid,timestamptz,text,date,time,text,text) from public;
revoke all on function set_work_task_status(uuid,text,text) from public;
revoke all on function set_work_template_active(uuid,boolean) from public;
grant execute on function generate_due_work_tasks() to authenticated;
grant execute on function save_work_instruction(text,text,jsonb,uuid,timestamptz,text,date,time,text,text) to authenticated;
grant execute on function set_work_task_status(uuid,text,text) to authenticated;
grant execute on function set_work_template_active(uuid,boolean) to authenticated;

-- Morning Desk can link a focus item directly to Work.
alter table morning_focus_items drop constraint if exists morning_focus_items_app_key_check;
alter table morning_focus_items add constraint morning_focus_items_app_key_check
  check (app_key in ('orders', 'pipeline', 'operations', 'control', 'house', 'work'));

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
  if p_app_key not in ('orders', 'pipeline', 'operations', 'control', 'house', 'work') then raise exception 'invalid_app'; end if;
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
