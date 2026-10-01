-- One action: shut down the entire Procedure Run and move an unfinished B2B
-- order to Shipping, so the existing carrier/tracking SMS flow can run.
begin;

create or replace function public.force_ship_order(p_order_id text,p_reason text,p_actor uuid)
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
  if v_type<>'wholesale' or v_stage='completed' then raise exception 'order_not_ready_for_force_shipping'; end if;
  select id,status into v_run,v_run_status from public.procedure_runs where order_id=p_order_id for update;
  if v_run is null or v_run_status='completed' then raise exception 'procedure_run_not_active'; end if;

  perform set_config('app.force_ship_order',p_order_id,true);
  update public.procedure_runs set status='waived',waiver_reason=btrim(p_reason),waived_by=p_actor,
    waived_at=now(),updated_at=now(),next_action='Theo dõi giao hàng và SMS trong Order book' where id=v_run;
  update public.orders set stage='shipping',status='shipped',unread=false where id=p_order_id;
  select coalesce(email,p_actor::text) into v_actor from auth.users where id=p_actor;
  insert into public.procedure_events(run_id,actor_id,action,detail)
    values(v_run,p_actor,'forced_shipping','Quản lý tắt toàn bộ quy trình và chuyển từ '||v_stage||' sang Đang giao. Lý do: '||btrim(p_reason));
  insert into public.order_events(order_id,kind,message,actor)
    values(p_order_id,'force_shipping','Tắt toàn bộ Procedure Run và chuyển từ '||v_stage||' sang Đang giao. Lý do: '||btrim(p_reason),coalesce(v_actor,p_actor::text));
end $$;

revoke all on function public.force_ship_order(text,text,uuid) from public,anon,authenticated;
grant execute on function public.force_ship_order(text,text,uuid) to service_role;

commit;
