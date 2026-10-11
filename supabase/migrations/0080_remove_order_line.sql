-- Correct one accidentally added order line without undoing fulfilment or
-- erasing commercial/operating evidence. Only a trusted server may call this.
begin;

-- Reuse the existing BOM trigger for demand planning while preserving costs
-- already confirmed, committed or paid. Only unconfirmed planned estimates
-- can be rescaled or removed when order lines or material definitions change.
create or replace function sync_order_bom_costs_internal(p_order_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  component record;
begin
  if not exists(select 1 from orders where id=p_order_id) then raise exception 'order_not_found'; end if;

  for component in
    with order_lines as (
      select
        coalesce(line->>'productId',line->>'product_id') product_id,
        coalesce(line->>'weight',line->>'variant_weight','') variant_weight,
        greatest(0,coalesce(nullif(line->>'qty','')::numeric,nullif(line->>'quantity','')::numeric,0)) sale_quantity
      from orders o cross join lateral jsonb_array_elements(o.lines) line
      where o.id=p_order_id
    )
    select
      s.id supply_item_id,s.name,s.category,s.unit,s.unit_cost,
      sum(l.sale_quantity*b.quantity_per_sale*(1+b.waste_percent/100)) quantity
    from order_lines l
    join product_bom_components b on b.product_id=l.product_id and b.variant_weight=l.variant_weight
    join supply_items s on s.id=b.supply_item_id and s.active=true
    where l.sale_quantity>0
    group by s.id,s.name,s.category,s.unit,s.unit_cost
  loop
    insert into order_costs(
      order_id,category,description,quantity,unit_cost,payment_status,incurred_on,note,
      created_by,source_type,source_key,estimated
    ) values(
      p_order_id,
      case when component.category='tea' then 'tea'
           when component.category in ('packaging','label') then 'packaging'
           when component.category in ('production','labor') then component.category
           else 'other' end,
      'Định mức · '||component.name,
      component.quantity,component.unit_cost,'planned',current_date,
      'Tự động tính từ định mức sản phẩm · đơn vị '||component.unit,
      auth.uid(),'bom','bom:'||component.supply_item_id::text,true
    )
    on conflict(order_id,source_key) where source_key is not null do update set
      category=excluded.category,
      description=excluded.description,
      quantity=excluded.quantity,
      unit_cost=case when order_costs.estimated then excluded.unit_cost else order_costs.unit_cost end,
      note=excluded.note,
      updated_at=now()
    where order_costs.source_type='bom' and order_costs.estimated=true
      and order_costs.payment_status='planned';
    v_count:=v_count+1;
  end loop;

  delete from order_costs c
  where c.order_id=p_order_id and c.source_type='bom' and c.estimated=true
    and c.payment_status='planned'
    and not exists (
      select 1
      from orders o cross join lateral jsonb_array_elements(o.lines) line
      join product_bom_components b
        on b.product_id=coalesce(line->>'productId',line->>'product_id')
       and b.variant_weight=coalesce(line->>'weight',line->>'variant_weight','')
      where o.id=p_order_id and c.source_key='bom:'||b.supply_item_id::text
    );
  return v_count;
end;
$$;


create function public.remove_order_line(
  p_order_id text,
  p_line_index integer,
  p_expected_lines jsonb,
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
  v_receivable public.receivables%rowtype;
  v_saved_receivable public.receivables%rowtype;
  v_quote public.trade_quotes%rowtype;
  v_has_receivable boolean;
  v_removed jsonb;
  v_lines jsonb;
  v_line jsonb;
  v_qty numeric;
  v_price numeric;
  v_qty_text text;
  v_price_text text;
  v_before_subtotal numeric := 0;
  v_after_subtotal numeric := 0;
  v_before_priced boolean := true;
  v_after_priced boolean := true;
  v_total_kg numeric := 0;
  v_item_quantity numeric := 0;
  v_total_items integer;
  v_estimated_total numeric;
  v_pricing_basis text := 'recorded_line_prices';
  v_original_total_known boolean := false;
  v_discount numeric;
  v_payment_total numeric;
  v_product_id text;
  v_variant_weight text;
  v_removed_quantity numeric;
  v_retained_quantity numeric := 0;
  v_active_quantity numeric := 0;
  v_release_quantity numeric := 0;
  v_release_remaining numeric;
  v_reservation public.inventory_reservations%rowtype;
  v_reservation_after public.inventory_reservations%rowtype;
  v_reservation_changes jsonb := '[]'::jsonb;
  v_actor text;
  v_position integer := 0;
begin
  if not exists(select 1 from public.staff_roles where user_id=p_actor and role in ('admin','manager')) then
    raise exception 'manager_required';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then
    raise exception 'line_removal_reason_required';
  end if;

  -- Match issue_receivable/void_unpaid_receivable's lock order. Payment recording
  -- locks the same receivable, so a concurrent payment cannot escape this check.
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if jsonb_typeof(v_order.lines) is distinct from 'array' then raise exception 'invalid_order_lines'; end if;
  if p_expected_lines is null or p_expected_lines is distinct from v_order.lines then
    raise exception 'order_lines_changed';
  end if;
  if p_line_index is null or p_line_index<0 or p_line_index>=jsonb_array_length(v_order.lines) then
    raise exception 'invalid_line_index';
  end if;
  if jsonb_array_length(v_order.lines)<=1 then raise exception 'last_order_line'; end if;
  v_removed:=v_order.lines->p_line_index;
  v_lines:=v_order.lines-p_line_index;

  select * into v_receivable from public.receivables
    where order_id=p_order_id and status<>'void' for update;
  v_has_receivable:=found;

  -- Retain each remaining line byte-for-byte as JSONB; use its agreed price,
  -- never today's catalogue price or a newly calculated quantity tier.
  for v_line in select value from jsonb_array_elements(v_order.lines)
  loop
    if jsonb_typeof(v_line) is distinct from 'object' then raise exception 'invalid_order_lines'; end if;
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
    v_price_text:=coalesce(v_line->>'price',v_line->>'unitPrice',v_line->>'unit_price');
    v_price:=null;
    if v_price_text ~ '^[+]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$' then
      begin
        v_price:=v_price_text::numeric;
      exception when invalid_text_representation or numeric_value_out_of_range then
        v_price:=null;
      end;
      if v_price>1000000000000000 then v_price:=null; end if;
    end if;
    if v_price is null then v_before_priced:=false;
    else v_before_subtotal:=v_before_subtotal+v_qty*v_price; end if;

    if v_position=p_line_index then
      v_removed_quantity:=v_qty;
    else
      if v_price is null then v_after_priced:=false;
      else v_after_subtotal:=v_after_subtotal+v_qty*v_price; end if;
      if lower(btrim(coalesce(v_line->>'unit','')))='kg' then v_total_kg:=v_total_kg+v_qty; end if;
      -- Existing retail creation counts all sale quantities, including kg.
      -- Wholesale orders intentionally leave this field null.
      v_item_quantity:=v_item_quantity+v_qty;
    end if;
    v_position:=v_position+1;
  end loop;

  if v_order.type='retail' then
    if v_item_quantity<>trunc(v_item_quantity) or v_item_quantity>2147483647 then
      raise exception 'invalid_order_lines';
    end if;
    v_total_items:=v_item_quantity::integer;
  else
    v_total_items:=null;
  end if;
  v_estimated_total:=case when v_after_priced then v_after_subtotal else null end;

  -- VAT and promo are descriptive order snapshots in current retail/staff
  -- creation: their amounts are not added/subtracted from estimated_total.
  -- Two legacy wholesale paths apply a recorded discount. Keep that exact
  -- percentage only when the existing total proves that it was actually used.
  if v_before_priced and v_order.estimated_total=v_before_subtotal then
    v_original_total_known:=true;
  elsif v_before_priced and length(v_order.tier->>'pct')<=100 and (v_order.tier->>'pct') ~ '^(\d+\.?\d*|\.\d+)$' then
    v_discount:=(v_order.tier->>'pct')::numeric;
    if v_discount between 0 and 100
      and v_order.estimated_total=round(v_before_subtotal*(1-v_discount/100)) then
      v_original_total_known:=true;
      v_pricing_basis:='recorded_tier_percent';
      v_estimated_total:=case when v_after_priced then round(v_after_subtotal*(1-v_discount/100)) else null end;
    end if;
  end if;
  if not v_original_total_known and v_before_priced and v_order.quote_id is not null then
    select * into v_quote from public.trade_quotes where id=v_order.quote_id;
    if found and v_order.estimated_total=round(v_before_subtotal*(1-v_quote.discount_percent/100)) then
      v_original_total_known:=true;
      v_pricing_basis:='recorded_quote_discount';
      v_estimated_total:=case when v_after_priced then round(v_after_subtotal*(1-v_quote.discount_percent/100)) else null end;
    end if;
  end if;
  if v_estimated_total>1000000000000000 then raise exception 'invalid_order_lines'; end if;

  -- A recorded monetary adjustment that matches no supported formula needs a
  -- manager/accounting correction first; never silently replace it with a raw
  -- subtotal. A wholly unpriced order may still remain unpriced without a bill.
  if not v_has_receivable and not v_original_total_known then
    if v_order.estimated_total is not null then raise exception 'invalid_order_lines'; end if;
    v_estimated_total:=null;
    v_pricing_basis:='unpriced_order';
  end if;

  if v_has_receivable then
    select coalesce(sum(amount),0) into v_payment_total from public.receivable_payments where receivable_id=v_receivable.id;
    if not v_original_total_known or v_estimated_total is null
      or v_receivable.total is distinct from round(v_order.estimated_total,2)
      or v_receivable.paid is distinct from v_payment_total
      or v_receivable.paid>round(v_estimated_total,2)
      or round(v_estimated_total,2)>999999999999.99
      or (v_receivable.paid=0 and v_receivable.status not in ('draft','open','paid'))
      or (v_receivable.paid=0 and v_receivable.status='paid' and v_receivable.total<>0)
      or (v_receivable.paid>0 and v_receivable.paid<v_receivable.total and v_receivable.status<>'partial')
      or (v_receivable.paid=v_receivable.total and v_receivable.paid>0 and v_receivable.status<>'paid') then
      raise exception 'line_removal_payment_conflict';
    end if;
  end if;

  v_product_id:=coalesce(v_removed->>'productId',v_removed->>'product_id');
  v_variant_weight:=coalesce(v_removed->>'weight',v_removed->>'variant_weight','');
  if nullif(v_product_id,'') is not null then
    for v_line in select value from jsonb_array_elements(v_lines)
    loop
      if coalesce(v_line->>'productId',v_line->>'product_id')=v_product_id
        and coalesce(v_line->>'weight',v_line->>'variant_weight','')=v_variant_weight then
        v_retained_quantity:=v_retained_quantity+coalesce(v_line->>'qty',v_line->>'quantity')::numeric;
      end if;
    end loop;
    -- A reservation identifies product+variant, not a line index. Release only
    -- excess ACTIVE holds beyond retained demand, bounded by the removed qty.
    -- Fulfilled holds and all batch allocations remain historical evidence.
    perform 1 from public.inventory_reservations
      where order_id=p_order_id and product_id=v_product_id
        and variant_weight=v_variant_weight and status='active' order by id for update;
    select coalesce(sum(quantity),0) into v_active_quantity from public.inventory_reservations
      where order_id=p_order_id and product_id=v_product_id and variant_weight=v_variant_weight and status='active';
    v_release_quantity:=least(v_removed_quantity,greatest(v_active_quantity-v_retained_quantity,0));
    v_release_remaining:=v_release_quantity;
    for v_reservation in select * from public.inventory_reservations
      where order_id=p_order_id and product_id=v_product_id and variant_weight=v_variant_weight and status='active' order by id
    loop
      exit when v_release_remaining<=0;
      if v_reservation.quantity<=v_release_remaining then
        update public.inventory_reservations set status='released',updated_at=now()
          where id=v_reservation.id returning * into v_reservation_after;
        v_release_remaining:=v_release_remaining-v_reservation.quantity;
      else
        update public.inventory_reservations set quantity=quantity-v_release_remaining,updated_at=now()
          where id=v_reservation.id returning * into v_reservation_after;
        v_release_remaining:=0;
      end if;
      v_reservation_changes:=v_reservation_changes||jsonb_build_array(jsonb_build_object(
        'before',to_jsonb(v_reservation),'after',to_jsonb(v_reservation_after)));
    end loop;
  end if;

  update public.orders set lines=v_lines,total_kg=v_total_kg,total_items=v_total_items,
    estimated_total=v_estimated_total where id=p_order_id returning * into v_saved_order;
  -- Updating lines uses the existing 0052 BOM trigger; manual cost records,
  -- shipment stage, Procedure Run, STOPs and verification evidence stay intact.
  if v_has_receivable then
    update public.receivables set total=round(v_estimated_total,2),
      status=case when paid=round(v_estimated_total,2) then 'paid' when paid>0 then 'partial' else 'open' end,
      updated_at=now() where id=v_receivable.id returning * into v_saved_receivable;
  end if;
  select coalesce(email,p_actor::text) into v_actor from auth.users where id=p_actor;
  insert into public.order_events(order_id,kind,message,actor)
    values(p_order_id,'line_removed',jsonb_build_object(
      'reason',btrim(p_reason),'line_index',p_line_index,'removed_line',v_removed,
      'stage',v_order.stage,'status',v_order.status,'actor_id',p_actor,
      'before',jsonb_build_object('total_kg',v_order.total_kg,'total_items',v_order.total_items,'estimated_total',v_order.estimated_total),
      'after',jsonb_build_object('total_kg',v_saved_order.total_kg,'total_items',v_saved_order.total_items,'estimated_total',v_saved_order.estimated_total),
      'pricing_basis',v_pricing_basis,'released_reservation_quantity',v_release_quantity,
      'reservation_changes',v_reservation_changes,
      'receivable_before',case when v_has_receivable then to_jsonb(v_receivable) else null end,
      'receivable_after',case when v_has_receivable then to_jsonb(v_saved_receivable) else null end
    )::text,coalesce(v_actor,p_actor::text));
  return jsonb_build_object('order',to_jsonb(v_saved_order),
    'receivable',case when v_has_receivable then to_jsonb(v_saved_receivable) else null end,
    'removed',v_removed);
end;
$$;

revoke all on function public.remove_order_line(text,integer,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.remove_order_line(text,integer,jsonb,text,uuid) to service_role;

commit;
