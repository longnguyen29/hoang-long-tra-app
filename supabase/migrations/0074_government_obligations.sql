-- Manager-owned obligation settings reuse the existing calendar and Telegram
-- reminder queue. Suggested draft topics below have no presumed deadline.
begin;

create table if not exists public.government_obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  authority text not null default '' check (char_length(authority) <= 180),
  category text not null default 'general' check (char_length(btrim(category)) between 1 and 80),
  notes text not null default '' check (char_length(notes) <= 3000),
  source_url text not null default '' check (
    char_length(source_url) <= 2048 and (source_url = '' or source_url ~ '^https://[^[:space:]]+$')
  ),
  first_due_on date check (first_due_on is null or (isfinite(first_due_on)
    and first_due_on between date '1900-01-01' and date '2199-12-31')),
  repeat_months integer not null default 0 check (repeat_months in (0, 1, 3, 6, 12)),
  due_rule text not null default 'day_of_month' check (due_rule in ('day_of_month', 'month_end')),
  deadline_confirmed boolean not null default false,
  notify_telegram boolean not null default true,
  active boolean not null default true,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_due_on is null or due_rule <> 'month_end' or
    first_due_on = (date_trunc('month', first_due_on::timestamp) + interval '1 month - 1 day')::date)
);

alter table public.government_obligations drop constraint if exists government_obligations_first_due_on_check;
alter table public.government_obligations add constraint government_obligations_first_due_on_check
  check (first_due_on is null or (isfinite(first_due_on)
    and first_due_on between date '1900-01-01' and date '2199-12-31'));

alter table public.government_obligations enable row level security;
drop policy if exists "government obligations own read" on public.government_obligations;
create policy "government obligations own read" on public.government_obligations
  for select to authenticated
  using (public.is_staff_manager() and user_id = auth.uid());
revoke all on public.government_obligations from public, anon, authenticated;
grant select on public.government_obligations to authenticated;
grant all on public.government_obligations to service_role;

alter table public.dashboard_plans
  add column if not exists obligation_id uuid,
  add column if not exists obligation_version integer,
  add column if not exists reminder_unit text not null default 'day';

alter table public.dashboard_plans drop constraint if exists dashboard_plans_kind_check;
alter table public.dashboard_plans add constraint dashboard_plans_kind_check
  check (kind in ('feature', 'event', 'task', 'obligation'));
alter table public.dashboard_plans drop constraint if exists dashboard_plans_status_check;
alter table public.dashboard_plans add constraint dashboard_plans_status_check
  check (status in ('pending', 'done', 'cancelled'));
alter table public.dashboard_plans drop constraint if exists dashboard_plans_reminder_unit_check;
alter table public.dashboard_plans add constraint dashboard_plans_reminder_unit_check
  check (reminder_unit in ('day', 'month'));
alter table public.dashboard_plans drop constraint if exists dashboard_plans_obligation_version_check;
alter table public.dashboard_plans add constraint dashboard_plans_obligation_version_check
  check ((obligation_id is null and obligation_version is null and kind <> 'obligation') or
    (obligation_id is not null and obligation_version is not null and obligation_version >= 1 and kind = 'obligation' and event_on is not null));

do $$
begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.dashboard_plans'::regclass and conname = 'dashboard_plans_obligation_id_fkey') then
    alter table public.dashboard_plans add constraint dashboard_plans_obligation_id_fkey
      foreign key (obligation_id) references public.government_obligations(id) on delete restrict;
  end if;
end;
$$;

create unique index if not exists dashboard_plans_obligation_occurrence_idx
  on public.dashboard_plans (obligation_id, event_on, obligation_version)
  where obligation_id is not null;
create index if not exists government_obligations_owner_active_idx
  on public.government_obligations (user_id, active, first_due_on);

-- Existing calendar RLS remains in force. Even an owner who can write their
-- calendar cannot link an occurrence to someone else's private obligation.
create or replace function public.validate_dashboard_obligation_owner()
returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_owner uuid;
  v_version integer;
begin
  if new.obligation_id is not null then
    select user_id, version into v_owner, v_version
      from public.government_obligations where id = new.obligation_id;
    if not found or v_owner is distinct from new.user_id or
      new.obligation_version is null or new.obligation_version < 1 or new.obligation_version > v_version then
      raise exception 'invalid_obligation_reference';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_dashboard_obligation_owner() from public, anon, authenticated;
drop trigger if exists dashboard_plans_obligation_owner on public.dashboard_plans;
create trigger dashboard_plans_obligation_owner
  before insert or update of obligation_id, obligation_version, user_id on public.dashboard_plans
  for each row execute function public.validate_dashboard_obligation_owner();

create or replace function public.save_government_obligation(
  p_id uuid,
  p_title text,
  p_authority text,
  p_category text,
  p_notes text,
  p_source_url text,
  p_first_due_on date,
  p_repeat_months integer,
  p_due_rule text,
  p_deadline_confirmed boolean,
  p_notify_telegram boolean,
  p_active boolean,
  p_expected_version integer
)
returns setof public.government_obligations
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_previous public.government_obligations%rowtype;
  v_saved public.government_obligations%rowtype;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 180 then
    raise exception 'invalid_obligation_title';
  end if;
  if char_length(coalesce(p_authority, '')) > 180 or
    char_length(btrim(coalesce(p_category, 'general'))) not between 1 and 80 or
    char_length(coalesce(p_notes, '')) > 3000 then
    raise exception 'invalid_obligation_details';
  end if;
  if char_length(coalesce(p_source_url, '')) > 2048 or
    (coalesce(p_source_url, '') <> '' and p_source_url !~ '^https://[^[:space:]]+$') then
    raise exception 'invalid_obligation_source';
  end if;
  if p_first_due_on is not null and (not isfinite(p_first_due_on) or
    p_first_due_on not between date '1900-01-01' and date '2199-12-31') then
    raise exception 'invalid_obligation_date';
  end if;
  if p_repeat_months is null or p_repeat_months not in (0, 1, 3, 6, 12) or
    p_due_rule is null or p_due_rule not in ('day_of_month', 'month_end') then
    raise exception 'invalid_obligation_recurrence';
  end if;
  if p_first_due_on is not null and p_due_rule = 'month_end' and
    p_first_due_on <> (date_trunc('month', p_first_due_on::timestamp) + interval '1 month - 1 day')::date then
    raise exception 'invalid_obligation_month_end';
  end if;
  if p_deadline_confirmed is null or p_notify_telegram is null or p_active is null then
    raise exception 'invalid_obligation_flags';
  end if;

  if p_id is null then
    if p_expected_version is not null then raise exception 'obligation_conflict'; end if;
    insert into public.government_obligations (
      user_id, title, authority, category, notes, source_url, first_due_on,
      repeat_months, due_rule, deadline_confirmed, notify_telegram, active
    ) values (
      auth.uid(), btrim(p_title), btrim(coalesce(p_authority, '')), btrim(coalesce(p_category, 'general')),
      coalesce(p_notes, ''), coalesce(p_source_url, ''), p_first_due_on, p_repeat_months, p_due_rule,
      p_deadline_confirmed, p_notify_telegram, p_active
    ) returning * into v_saved;
  else
    if p_expected_version is null or p_expected_version < 1 then raise exception 'obligation_conflict'; end if;
    select * into v_previous from public.government_obligations
      where id = p_id and user_id = auth.uid() for update;
    if not found or v_previous.version <> p_expected_version then raise exception 'obligation_conflict'; end if;

    if row(v_previous.title, v_previous.authority, v_previous.category, v_previous.notes,
      v_previous.source_url, v_previous.first_due_on, v_previous.repeat_months, v_previous.due_rule,
      v_previous.deadline_confirmed, v_previous.notify_telegram, v_previous.active) is not distinct from
      row(btrim(p_title), btrim(coalesce(p_authority, '')), btrim(coalesce(p_category, 'general')),
      coalesce(p_notes, ''), coalesce(p_source_url, ''), p_first_due_on, p_repeat_months, p_due_rule,
      p_deadline_confirmed, p_notify_telegram, p_active) then
      return next v_previous;
      return;
    end if;

    update public.government_obligations set
      title = btrim(p_title), authority = btrim(coalesce(p_authority, '')),
      category = btrim(coalesce(p_category, 'general')), notes = coalesce(p_notes, ''),
      source_url = coalesce(p_source_url, ''), first_due_on = p_first_due_on,
      repeat_months = p_repeat_months, due_rule = p_due_rule,
      deadline_confirmed = p_deadline_confirmed, notify_telegram = p_notify_telegram,
      active = p_active, version = version + 1, updated_at = now()
    where id = p_id and user_id = auth.uid() and version = p_expected_version
    returning * into v_saved;
    if not found then raise exception 'obligation_conflict'; end if;

    -- Preserve completed and overdue unfinished work. Upcoming pending rows are
    -- superseded, never deleted; the new version can produce the new dates.
    update public.dashboard_plans set status = 'cancelled', notify_telegram = false,
      notification_claimed_at = null, updated_at = now()
    where obligation_id = p_id and user_id = auth.uid() and status = 'pending' and event_on >= v_today;
  end if;
  return next v_saved;
end;
$$;
revoke all on function public.save_government_obligation(uuid, text, text, text, text, text, date, integer, text, boolean, boolean, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.save_government_obligation(uuid, text, text, text, text, text, date, integer, text, boolean, boolean, boolean, integer)
  to authenticated;

-- Called internally by the owner wrapper and by the service cron. Config rows
-- are locked so a simultaneous save cannot leave a stale future event active.
create or replace function public.materialize_government_obligations(p_owner uuid, p_year integer)
returns integer
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_config public.government_obligations%rowtype;
  v_start date;
  v_end date;
  v_due date;
  v_n integer;
  v_first_n integer;
  v_last_n integer;
  v_count integer := 0;
  v_added integer;
begin
  if p_year is null or p_year not between 1900 and 2200 then raise exception 'invalid_obligation_year'; end if;
  if p_owner is null or not exists (select 1 from public.staff_roles
    where user_id = p_owner and role in ('admin', 'manager')) then raise exception 'manager_required'; end if;
  v_start := make_date(p_year, 1, 1);
  v_end := make_date(p_year + 2, 1, 1);

  for v_config in select * from public.government_obligations
    where user_id = p_owner and active and deadline_confirmed and first_due_on is not null
    for update
  loop
    if v_config.repeat_months = 0 then
      v_first_n := 0;
      v_last_n := 0;
    else
      -- Calculate indices from the original anchor rather than from the prior
      -- occurrence. Jan 31 -> Feb 28 -> Mar 31 therefore never drifts to Mar 28.
      v_first_n := greatest(0, floor(((extract(year from v_start) - extract(year from v_config.first_due_on)) * 12 +
        extract(month from v_start) - extract(month from v_config.first_due_on)) / v_config.repeat_months)::integer - 1);
      v_last_n := greatest(0, floor(((extract(year from v_end) - extract(year from v_config.first_due_on)) * 12 +
        extract(month from v_end) - extract(month from v_config.first_due_on)) / v_config.repeat_months)::integer + 1);
    end if;

    for v_n in v_first_n..v_last_n loop
      v_due := (v_config.first_due_on::timestamp + make_interval(months => v_n * v_config.repeat_months))::date;
      if v_config.due_rule = 'month_end' then
        v_due := (date_trunc('month', v_due::timestamp) + interval '1 month - 1 day')::date;
      end if;
      if v_due >= v_start and v_due < v_end then
        insert into public.dashboard_plans (
          user_id, kind, title, notes, event_on, remind_days, reminder_unit,
          notify_telegram, href, obligation_id, obligation_version, notified_event_on
        )
        select p_owner, 'obligation', v_config.title,
          left(concat_ws(E'\n', nullif(v_config.authority, ''), nullif(v_config.source_url, ''), nullif(v_config.notes, '')), 3000),
          v_due, 30, 'month', v_config.notify_telegram, '/admin/#government-obligations', v_config.id, v_config.version,
          case when exists (select 1 from public.dashboard_plans prior
            where prior.obligation_id = v_config.id and prior.event_on = v_due and prior.notified_event_on = v_due)
            then v_due else null end
        -- A completed or overdue pending occurrence stays linked to its prior
        -- config version; reconfiguring must not recreate that same obligation.
        where not exists (select 1 from public.dashboard_plans existing
          where existing.obligation_id = v_config.id and existing.event_on = v_due and existing.status <> 'cancelled')
        on conflict (obligation_id, event_on, obligation_version) where obligation_id is not null do nothing;
        get diagnostics v_added = row_count;
        v_count := v_count + v_added;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.materialize_government_obligations(uuid, integer) from public, anon, authenticated;
grant execute on function public.materialize_government_obligations(uuid, integer) to service_role;

create or replace function public.ensure_government_obligation_occurrences(p_year integer)
returns integer
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
  return public.materialize_government_obligations(auth.uid(), p_year);
end;
$$;
revoke all on function public.ensure_government_obligation_occurrences(integer) from public, anon, authenticated;
grant execute on function public.ensure_government_obligation_occurrences(integer) to authenticated;

create or replace function public.ensure_government_obligation_calendar(p_year integer)
returns integer
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_owner uuid;
  v_count integer := 0;
begin
  if p_year is null or p_year not between 1900 and 2200 then raise exception 'invalid_obligation_year'; end if;
  for v_owner in select distinct obligations.user_id from public.government_obligations obligations
    join public.staff_roles roles on roles.user_id = obligations.user_id and roles.role in ('admin', 'manager')
    where obligations.active and obligations.deadline_confirmed and obligations.first_due_on is not null
  loop
    v_count := v_count + public.materialize_government_obligations(v_owner, p_year);
  end loop;
  return v_count;
end;
$$;
revoke all on function public.ensure_government_obligation_calendar(integer) from public, anon, authenticated;
grant execute on function public.ensure_government_obligation_calendar(integer) to service_role;

-- Preserve the existing lease, attempt count and sent-event deduplication.
-- A calendar-month notice can be 28–31 days before its deadline.
create or replace function public.claim_dashboard_reminder(p_id uuid, p_today date)
returns setof public.dashboard_plans
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  return query
  update public.dashboard_plans p set
    notification_claimed_at = now(),
    notification_attempts = p.notification_attempts + 1,
    notification_last_error = ''
  where p.id = p_id and p.status = 'pending' and p.notify_telegram
    and p.event_on is not null and p_today <= p.event_on
    and ((p.reminder_unit = 'day' and p_today >= p.event_on - p.remind_days::integer) or
      (p.reminder_unit = 'month' and p_today >= (p.event_on::timestamp - interval '1 month')::date))
    and (p.kind <> 'obligation' or exists (select 1 from public.government_obligations obligation
      where obligation.id = p.obligation_id and obligation.user_id = p.user_id and obligation.active
        and obligation.deadline_confirmed and obligation.notify_telegram
        and obligation.first_due_on is not null and obligation.version = p.obligation_version))
    and p.notified_event_on is distinct from p.event_on
    and (p.notification_claimed_at is null or p.notification_claimed_at < now() - interval '30 minutes')
  returning p.*;
end;
$$;
revoke all on function public.claim_dashboard_reminder(uuid, date) from public, anon, authenticated;
grant execute on function public.claim_dashboard_reminder(uuid, date) to service_role;

-- These are review topics, not an assertion that all obligations apply to this
-- business. The legal form, filing method and actual documents remain unknown.
-- Undated, unconfirmed drafts cannot produce events or Telegram messages.
insert into public.government_obligations (
  user_id, title, authority, category, notes, source_url,
  first_due_on, repeat_months, deadline_confirmed
)
select roles.user_id, candidate.title, candidate.authority, candidate.category,
  candidate.notes, candidate.source_url, null, 0, false
from public.staff_roles roles
cross join (values
  ('Khai và nộp thuế định kỳ', 'Cơ quan thuế', 'tax',
    'Danh mục gợi ý, cần xác nhận áp dụng với kế toán/cơ quan phụ trách. Chưa có hạn chính thức; nhập hạn từ hồ sơ/thông báo thực tế. Không mặc định lịch kiểm tra.',
    'https://xaydungchinhsach.chinhphu.vn/quy-dinh-thoi-han-nop-ho-so-khai-thue-119260703120801722.htm'),
  ('Báo cáo tài chính và quyết toán thuế năm', 'Cơ quan thuế', 'annual',
    'Danh mục gợi ý dành cho doanh nghiệp, cần xác nhận loại hình pháp lý và nghĩa vụ áp dụng với kế toán/cơ quan phụ trách. Chưa có hạn chính thức; nhập hạn từ hồ sơ/thông báo thực tế. Không mặc định lịch kiểm tra.',
    'https://xaydungchinhsach.chinhphu.vn/quy-dinh-thoi-han-nop-ho-so-khai-thue-119260703120801722.htm'),
  ('Đóng BHXH và cập nhật người tham gia', 'Cơ quan BHXH', 'insurance',
    'Danh mục gợi ý, cần xác nhận áp dụng với kế toán/cơ quan phụ trách. Chưa có hạn chính thức; nhập hạn từ hồ sơ/thông báo thực tế. Không mặc định lịch kiểm tra.',
    'https://xaydungchinhsach.chinhphu.vn/toan-van-luat-so-41-2024-qh15-bao-hiem-xa-hoi-119240723163650489.htm'),
  ('Rà soát hồ sơ an toàn thực phẩm / giấy chứng nhận', 'Cơ quan quản lý an toàn thực phẩm', 'license',
    'Danh mục gợi ý, cần xác nhận áp dụng với kế toán/cơ quan phụ trách. Chưa có hạn chính thức; nhập hạn từ hồ sơ/thông báo thực tế. Không mặc định lịch kiểm tra.',
    'https://baochinhphu.vn/tiep-tuc-ap-dung-nghi-dinh-15-2018-nd-cp-ve-an-toan-thuc-pham-cho-den-khi-co-quy-dinh-moi-102260408123934123.htm'),
  ('Phản hồi công văn / chuẩn bị kiểm tra', 'Cơ quan gửi công văn', 'correspondence',
    'Danh mục gợi ý, cần xác nhận áp dụng với kế toán/cơ quan phụ trách. Chưa có hạn chính thức; nhập hạn từ hồ sơ/thông báo thực tế. Không mặc định lịch kiểm tra.',
    'https://xaydungchinhsach.chinhphu.vn/toan-van-luat-thanh-tra-119250704080101722.htm')
) candidate(title, authority, category, notes, source_url)
where roles.role in ('admin', 'manager') and not exists (
  select 1 from public.government_obligations existing
  where existing.user_id = roles.user_id and existing.title = candidate.title
);

commit;
