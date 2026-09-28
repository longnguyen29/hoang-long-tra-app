-- Personal owner/manager plans: unfinished features, dated events and reminders.
-- Existing Work Board tasks remain the source of truth for assigned work.
begin;

create table public.dashboard_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null default 'feature' check (kind in ('feature','event','task')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  notes text not null default '' check (char_length(notes) <= 3000),
  event_on date,
  remind_days smallint not null default 1 check (remind_days between 0 and 30),
  notify_telegram boolean not null default false,
  href text not null default '' check (href = '' or href like '/admin/%'),
  status text not null default 'pending' check (status in ('pending','done')),
  completed_at timestamptz,
  seed_key text,
  notified_event_on date,
  notification_claimed_at timestamptz,
  notification_attempts integer not null default 0,
  notification_last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,seed_key)
);
create index dashboard_plans_owner_open_idx on public.dashboard_plans(user_id,status,event_on);
create index dashboard_plans_reminders_idx on public.dashboard_plans(event_on)
  where status='pending' and notify_telegram;

alter table public.dashboard_plans enable row level security;
create policy "dashboard plans own read" on public.dashboard_plans
  for select to authenticated using (is_staff_manager() and user_id=auth.uid());
create policy "dashboard plans own insert" on public.dashboard_plans
  for insert to authenticated with check (is_staff_manager() and user_id=auth.uid());
create policy "dashboard plans own update" on public.dashboard_plans
  for update to authenticated using (is_staff_manager() and user_id=auth.uid())
  with check (is_staff_manager() and user_id=auth.uid());

-- Only the server-side cron may claim reminders. The lease avoids duplicate sends
-- when Vercel invokes the same schedule more than once.
create function public.claim_dashboard_reminder(p_id uuid,p_today date)
returns setof public.dashboard_plans
language plpgsql security definer set search_path=public as $$
begin
  return query
  update public.dashboard_plans p set
    notification_claimed_at=now(),
    notification_attempts=p.notification_attempts+1,
    notification_last_error=''
  where p.id=p_id and p.status='pending' and p.notify_telegram
    and p.event_on between p_today and p_today+p.remind_days::integer
    and p.notified_event_on is distinct from p.event_on
    and (p.notification_claimed_at is null or p.notification_claimed_at<now()-interval '30 minutes')
  returning p.*;
end $$;
revoke all on function public.claim_dashboard_reminder(uuid,date) from public,anon,authenticated;
grant execute on function public.claim_dashboard_reminder(uuid,date) to service_role;

-- Checking yesterday's priority must still work today. The dashboard lists all
-- earlier unchecked priorities separately, so nothing silently disappears.
create or replace function public.set_morning_focus_status(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_status not in ('planned','done') then raise exception 'invalid_status'; end if;
  update public.morning_focus_items set status=p_status,updated_at=now()
  where id=p_id and user_id=auth.uid();
end $$;
revoke all on function public.set_morning_focus_status(uuid,text) from public,anon;
grant execute on function public.set_morning_focus_status(uuid,text) to authenticated;

insert into public.dashboard_plans(user_id,kind,title,notes,href,seed_key)
select user_id,'feature','Thử Procedure Run với đơn B2B đầu tiên',
  'Khi có đơn sỉ mới đã xác nhận: mở quy trình trong Order book, giao người làm, kiểm chứng từ, bằng chứng và bước STOP. Ghi lại điều cần chỉnh sau lần thử thực tế.',
  '/admin/procedures','procedure-first-real-order'
from public.staff_roles where role in ('admin','manager')
on conflict(user_id,seed_key) do nothing;

insert into public.dashboard_plans(user_id,kind,title,notes,href,seed_key)
select user_id,'feature','Thử và chốt 6 công thức V1',
  'Pha thử bằng trà Hoàng Long, ghi kết quả và điều chỉnh định lượng trước khi đưa vào menu mẫu.',
  '/admin/recipes?view=lab','recipe-lab-six-v1'
from public.staff_roles where role in ('admin','manager')
on conflict(user_id,seed_key) do nothing;

commit;
