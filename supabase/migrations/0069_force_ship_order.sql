-- Manager-only, atomic exception for a single B2B order. The Procedure Run,
-- including any STOP and evidence, stays in the archive for review.
begin;

create or replace function public.guard_procedure_run_waiver() returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='waived' and old.status is distinct from new.status
    and current_setting('app.force_ship_order',true) is distinct from new.order_id
    and exists(select 1 from public.procedure_blockers where run_id=new.id and stop_work and status in ('open','resolved')) then
    raise exception 'procedure_stop_blocker_open';
  end if;
  return new;
end $$;

create or replace function public.guard_procedure_order_stage() returns trigger language plpgsql set search_path=public as $$
declare v_run uuid; v_status text;
begin
  if (new.stage not in ('shipping','completed') and new.status not in ('shipped','completed'))
    or (new.stage is not distinct from old.stage and new.status is not distinct from old.status) then return new; end if;
  select id,status into v_run,v_status from public.procedure_runs where order_id=new.id;
  if v_run is null or v_status='waived' then return new; end if;
  if exists(select 1 from public.procedure_blockers where run_id=v_run and stop_work and status in ('open','resolved'))
    or not exists(select 1 from public.procedure_items where run_id=v_run)
    or exists(select 1 from public.procedure_items where run_id=v_run and required and critical
      and stage_key in ('order_confirmation','stock_production','logistics','documents_checked','vehicle_inspection','loading_dispatch')
      and status not in ('verified','not_required')) then
    raise exception 'procedure_stop_or_preflight_incomplete';
  end if;
  return new;
end $$;

create function public.force_ship_order(p_order_id text,p_reason text,p_actor uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_run uuid; v_run_status text; v_type text; v_stage text; v_actor text;
begin
  if not exists(select 1 from public.staff_roles where user_id=p_actor and role in ('admin','manager')) then
    raise exception 'manager_required';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 10 and 1000 then
    raise exception 'force_reason_required';
  end if;
  select type,stage into v_type,v_stage from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_type<>'wholesale' or v_stage<>'packing' then raise exception 'order_not_ready_for_force_shipping'; end if;
  select id,status into v_run,v_run_status from public.procedure_runs where order_id=p_order_id for update;
  if v_run is null or v_run_status='completed' then raise exception 'procedure_run_not_active'; end if;

  perform set_config('app.force_ship_order',p_order_id,true);
  update public.procedure_runs set status='waived',waiver_reason=btrim(p_reason),waived_by=p_actor,
    waived_at=now(),updated_at=now() where id=v_run;
  update public.orders set stage='shipping',status='shipped',unread=false where id=p_order_id;
  select coalesce(email,p_actor::text) into v_actor from auth.users where id=p_actor;
  insert into public.procedure_events(run_id,actor_id,action,detail)
    values(v_run,p_actor,'forced_shipping','Quản lý tắt quy trình và chuyển Đang giao. Lý do: '||btrim(p_reason));
  insert into public.order_events(order_id,kind,message,actor)
    values(p_order_id,'force_shipping','Bỏ qua Procedure Run và chuyển sang Đang giao. Lý do: '||btrim(p_reason),coalesce(v_actor,p_actor::text));
end $$;

revoke all on function public.force_ship_order(text,text,uuid) from public,anon,authenticated;
grant execute on function public.force_ship_order(text,text,uuid) to service_role;

commit;
