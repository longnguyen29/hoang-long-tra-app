-- A manager may waive the checklist for one small B2B order without erasing its record.
-- An unresolved STOP still prevents dispatch, even when the run is waived.
begin;

alter table public.procedure_runs
  add column if not exists waiver_reason text not null default '',
  add column if not exists waived_by uuid references auth.users(id),
  add column if not exists waived_at timestamptz;

alter table public.procedure_runs drop constraint if exists procedure_runs_status_check;
alter table public.procedure_runs add constraint procedure_runs_status_check
  check (status in ('active','completed','waived'));
alter table public.procedure_runs add constraint procedure_runs_waiver_reason_check
  check (status <> 'waived' or (length(btrim(waiver_reason)) >= 10 and waived_by is not null and waived_at is not null));

create function public.guard_procedure_run_waiver() returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='waived' and old.status is distinct from new.status
    and exists(select 1 from public.procedure_blockers where run_id=new.id and stop_work and status in ('open','resolved')) then
    raise exception 'procedure_stop_blocker_open';
  end if;
  return new;
end $$;
create trigger guard_procedure_run_waiver before update of status on public.procedure_runs
for each row execute function public.guard_procedure_run_waiver();

create or replace function public.guard_procedure_order_stage() returns trigger language plpgsql set search_path=public as $$
declare v_run uuid; v_status text;
begin
  if (new.stage not in ('shipping','completed') and new.status not in ('shipped','completed'))
    or (new.stage is not distinct from old.stage and new.status is not distinct from old.status) then return new; end if;
  select id,status into v_run,v_status from public.procedure_runs where order_id=new.id;
  if v_run is null then return new; end if;
  if exists(select 1 from public.procedure_blockers where run_id=v_run and stop_work and status in ('open','resolved')) then
    raise exception 'procedure_stop_or_preflight_incomplete';
  end if;
  if v_status='waived' then return new; end if;
  if not exists(select 1 from public.procedure_items where run_id=v_run)
    or exists(select 1 from public.procedure_items where run_id=v_run and required and critical
      and stage_key in ('order_confirmation','stock_production','logistics','documents_checked','vehicle_inspection','loading_dispatch')
      and status not in ('verified','not_required')) then
    raise exception 'procedure_stop_or_preflight_incomplete';
  end if;
  return new;
end $$;

commit;
