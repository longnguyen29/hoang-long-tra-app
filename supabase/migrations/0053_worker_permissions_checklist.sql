-- Keep low-tech employees inside their assigned work surface and make checklists actionable.
-- Managers/admins retain the broader operating-system access previously represented by is_staff().

create or replace function is_work_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from staff_roles where user_id=auth.uid())
$$;

revoke all on function is_work_staff() from public,anon;
grant execute on function is_work_staff() to authenticated;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from staff_roles
    where user_id=auth.uid() and role in ('admin','manager')
  )
$$;

revoke all on function is_staff() from public;
grant execute on function is_staff() to authenticated,anon;

drop policy if exists "staff_profiles: staff select" on staff_profiles;
drop policy if exists "staff_profiles: manager or self select" on staff_profiles;
create policy "staff_profiles: manager or self select" on staff_profiles
  for select using(is_staff_manager() or user_id=auth.uid());

alter table work_tasks add column if not exists checklist_done jsonb not null default '[]'::jsonb
  check(jsonb_typeof(checklist_done)='array');

create or replace function set_work_task_checklist(p_id uuid,p_index integer,p_checked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task work_tasks%rowtype;
  v_done jsonb;
begin
  if not is_work_staff() then raise exception 'not_authorised'; end if;
  select * into v_task from work_tasks where id=p_id for update;
  if v_task.id is null then raise exception 'task_not_found'; end if;
  if not is_staff_manager() and v_task.assigned_to<>auth.uid() then raise exception 'not_assigned'; end if;
  if p_index<0 or p_index>=jsonb_array_length(v_task.checklist) then raise exception 'invalid_checklist_index'; end if;

  select coalesce(jsonb_agg(item order by item),'[]'::jsonb) into v_done
  from (
    select distinct item
    from (
      select value::integer item
      from jsonb_array_elements_text(coalesce(v_task.checklist_done,'[]'::jsonb))
      where value~'^[0-9]+$'
      union all
      select p_index where p_checked
    ) candidates
    where item>=0 and item<jsonb_array_length(v_task.checklist)
      and (p_checked or item<>p_index)
  ) cleaned;

  update work_tasks set checklist_done=v_done,updated_at=now() where id=p_id;
  return v_done;
end;
$$;

create or replace function set_work_task_status(p_id uuid,p_status text,p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task work_tasks%rowtype;
  v_manager boolean := is_staff_manager();
  v_message text;
  v_done_count integer;
begin
  if not is_work_staff() then raise exception 'not_authorised'; end if;
  select * into v_task from work_tasks where id=p_id for update;
  if v_task.id is null then raise exception 'task_not_found'; end if;
  if not v_manager and v_task.assigned_to<>auth.uid() then raise exception 'not_assigned'; end if;
  if p_status not in ('assigned','in_progress','blocked','completed','cancelled') then raise exception 'invalid_status'; end if;
  if p_status in ('cancelled','assigned') and not v_manager then raise exception 'manager_required'; end if;

  if not v_manager and not (
    (v_task.status='assigned' and p_status in ('in_progress','blocked')) or
    (v_task.status='in_progress' and p_status in ('blocked','completed')) or
    (v_task.status='blocked' and p_status in ('in_progress','completed')) or
    v_task.status=p_status
  ) then raise exception 'invalid_transition'; end if;

  if p_status='completed' and jsonb_array_length(v_task.checklist)>0 then
    select count(distinct value::integer) into v_done_count
    from jsonb_array_elements_text(coalesce(v_task.checklist_done,'[]'::jsonb))
    where value~'^[0-9]+$' and value::integer between 0 and jsonb_array_length(v_task.checklist)-1;
    if v_done_count<jsonb_array_length(v_task.checklist) then raise exception 'checklist_incomplete'; end if;
  end if;

  update work_tasks set
    status=p_status,
    blocked_note=case when p_status='blocked' then btrim(coalesce(p_note,'')) when p_status='in_progress' then '' else blocked_note end,
    completion_note=case when p_status='completed' then btrim(coalesce(p_note,'')) else completion_note end,
    started_at=case when p_status='in_progress' then coalesce(started_at,now()) else started_at end,
    completed_at=case when p_status='completed' then now() when p_status in ('assigned','in_progress') then null else completed_at end,
    updated_at=now()
  where id=p_id;

  v_message:=case p_status
    when 'assigned' then 'Đã đưa việc về trạng thái chờ nhận.'
    when 'in_progress' then 'Đã bắt đầu công việc.'
    when 'blocked' then 'Đã báo vướng: '||coalesce(nullif(btrim(p_note),''),'Chưa ghi lý do.')
    when 'completed' then 'Đã hoàn tất công việc.'
    when 'cancelled' then 'Quản lý đã hủy công việc.'
  end;
  insert into work_task_events(task_id,actor_id,event_type,message)
  values(p_id,auth.uid(),p_status,v_message);
end;
$$;

revoke all on function set_work_task_checklist(uuid,integer,boolean) from public,anon;
revoke all on function set_work_task_status(uuid,text,text) from public,anon;
grant execute on function set_work_task_checklist(uuid,integer,boolean) to authenticated;
grant execute on function set_work_task_status(uuid,text,text) to authenticated;
