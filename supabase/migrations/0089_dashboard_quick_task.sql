-- Larger personal task text; keep owner-only RLS and the existing three slots.
begin;

alter table public.morning_focus_items drop constraint if exists morning_focus_items_title_check;
alter table public.morning_focus_items add constraint morning_focus_items_title_check
  check (char_length(btrim(title)) between 1 and 1000);

alter table public.dashboard_plans drop constraint if exists dashboard_plans_title_check;
alter table public.dashboard_plans add constraint dashboard_plans_title_check
  check (char_length(btrim(title)) between 1 and 500);
alter table public.dashboard_plans drop constraint if exists dashboard_plans_notes_check;
alter table public.dashboard_plans add constraint dashboard_plans_notes_check
  check (char_length(notes) <= 6000);

-- All destinations already offered by Morning Desk must also be valid in SQL.
alter table public.morning_focus_items drop constraint if exists morning_focus_items_app_key_check;
alter table public.morning_focus_items add constraint morning_focus_items_app_key_check
  check (app_key in ('orders','pipeline','operations','control','house','work','growth','knowledge',
    'recipes','discovery','procedures','documents','partnerNetwork'));

create or replace function public.save_morning_focus(p_position integer, p_title text, p_app_key text, p_href text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_position is null or p_position not between 1 and 3 then raise exception 'invalid_position'; end if;
  if p_app_key is null or p_app_key not in ('orders','pipeline','operations','control','house','work','growth','knowledge',
    'recipes','discovery','procedures','documents','partnerNetwork') then raise exception 'invalid_app'; end if;
  if btrim(coalesce(p_title,'')) = '' then raise exception 'title_required'; end if;
  if char_length(btrim(p_title)) > 1000 then raise exception 'title_too_long'; end if;
  insert into public.morning_focus_items(user_id,work_date,position,title,app_key,href)
  values(auth.uid(),current_date,p_position,btrim(p_title),p_app_key,p_href)
  on conflict (user_id,work_date,position) do update set
    title=excluded.title,app_key=excluded.app_key,href=excluded.href,
    status='planned',updated_at=now()
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.save_morning_focus(integer,text,text,text) from public,anon;
grant execute on function public.save_morning_focus(integer,text,text,text) to authenticated;

commit;
