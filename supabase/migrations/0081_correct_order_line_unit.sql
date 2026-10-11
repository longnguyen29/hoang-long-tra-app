-- Correct the recorded selling unit on an existing order. This migration does
-- not reinterpret historical quantities or automatically change any order.
begin;

-- The BOM depends on product/variant/quantity, not the sale unit label. Avoid
-- refreshing material costs for this correction while retaining the established
-- trigger for all other line changes (including removals and quantity edits).
create or replace function public.trigger_sync_order_bom_costs()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op='UPDATE' and jsonb_typeof(old.lines)='array' and jsonb_typeof(new.lines)='array' then
    if (select coalesce(jsonb_agg(value-'unit' order by ordinality),'[]'::jsonb)
          from jsonb_array_elements(old.lines) with ordinality)
      is not distinct from
       (select coalesce(jsonb_agg(value-'unit' order by ordinality),'[]'::jsonb)
          from jsonb_array_elements(new.lines) with ordinality) then
      return new;
    end if;
  end if;
  perform public.sync_order_bom_costs_internal(new.id);
  return new;
end;
$$;
revoke all on function public.trigger_sync_order_bom_costs() from public,anon,authenticated;

create function public.correct_order_line_unit(
  p_order_id text,
  p_line_index integer,
  p_expected_lines jsonb,
  p_unit text,
  p_reason text,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_saved_order public.orders%rowtype;
  v_before_line jsonb;
  v_after_line jsonb;
  v_lines jsonb;
  v_line jsonb;
  v_qty numeric;
  v_qty_text text;
  v_unit text := btrim(coalesce(p_unit,''));
  v_total_kg numeric := 0;
  v_actor text;
begin
  if not exists(select 1 from public.staff_roles where user_id=p_actor and role in ('admin','manager')) then
    raise exception 'manager_required';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then
    raise exception 'line_unit_reason_required';
  end if;
  if v_unit not in ('kg','g','pcs','pack','viên','bánh','hộp','chai','cái','ton','tons','t') then
    raise exception 'invalid_line_unit';
  end if;

  -- The exact client snapshot and row lock prevent changing the wrong line
  -- after another manager has edited/reordered its contents.
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if jsonb_typeof(v_order.lines) is distinct from 'array' then raise exception 'invalid_order_lines'; end if;
  if p_expected_lines is null or p_expected_lines is distinct from v_order.lines then
    raise exception 'order_lines_changed';
  end if;
  if p_line_index is null or p_line_index<0 or p_line_index>=jsonb_array_length(v_order.lines) then
    raise exception 'invalid_line_index';
  end if;
  v_before_line:=v_order.lines->p_line_index;
  if jsonb_typeof(v_before_line) is distinct from 'object' then raise exception 'invalid_order_lines'; end if;
  if v_before_line->>'unit'=v_unit then raise exception 'line_unit_unchanged'; end if;
  v_qty_text:=coalesce(v_before_line->>'qty',v_before_line->>'quantity');
  if v_qty_text is null or v_qty_text !~ '^[+]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$' then
    raise exception 'invalid_line_quantity';
  end if;
  begin
    v_qty:=v_qty_text::numeric;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'invalid_line_quantity';
  end;
  if v_qty<=0 or v_qty>1000000000000
    or (v_unit not in ('kg','g','ton','tons','t') and v_qty<>trunc(v_qty)) then
    raise exception 'invalid_line_quantity';
  end if;

  -- Set only the unit. Agreed quantity and price, discounts, total, stage,
  -- receivables, stock reservations and operational evidence remain unchanged.
  v_after_line:=jsonb_set(v_before_line,'{unit}',to_jsonb(v_unit),true);
  v_lines:=jsonb_set(v_order.lines,array[p_line_index::text],v_after_line,false);
  if v_order.type='wholesale' then
    for v_line in select value from jsonb_array_elements(v_lines)
    loop
      if jsonb_typeof(v_line) is distinct from 'object' then raise exception 'invalid_order_lines'; end if;
      if lower(btrim(coalesce(v_line->>'unit','')))='kg' then
        v_qty_text:=coalesce(v_line->>'qty',v_line->>'quantity');
        if v_qty_text is null or v_qty_text !~ '^[+]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$' then
          raise exception 'invalid_order_lines';
        end if;
        begin
          v_qty:=v_qty_text::numeric;
        exception when invalid_text_representation or numeric_value_out_of_range then
          raise exception 'invalid_order_lines';
        end;
        if v_qty<=0 or v_qty>1000000000000 then raise exception 'invalid_order_lines'; end if;
        v_total_kg:=v_total_kg+v_qty;
      end if;
    end loop;
  end if;
  update public.orders set lines=v_lines,
    total_kg=case when v_order.type='wholesale' then v_total_kg else v_order.total_kg end
    where id=p_order_id returning * into v_saved_order;

  select coalesce(email,p_actor::text) into v_actor from auth.users where id=p_actor;
  insert into public.order_events(order_id,kind,message,actor)
    values(p_order_id,'line_unit_corrected',jsonb_build_object(
      'reason',btrim(p_reason),'line_index',p_line_index,
      'before_line',v_before_line,'after_line',v_after_line,
      'stage',v_order.stage,'status',v_order.status,'actor_id',p_actor,
      'before',jsonb_build_object('total_kg',v_order.total_kg),
      'after',jsonb_build_object('total_kg',v_saved_order.total_kg)
    )::text,coalesce(v_actor,p_actor::text));
  return jsonb_build_object('order',to_jsonb(v_saved_order),
    'previous_line',v_before_line,'corrected_line',v_after_line);
end;
$$;

revoke all on function public.correct_order_line_unit(text,integer,jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function public.correct_order_line_unit(text,integer,jsonb,text,text,uuid) to service_role;

commit;
