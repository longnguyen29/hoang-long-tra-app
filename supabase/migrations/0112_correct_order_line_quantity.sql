-- Correct one order line, with an auditable reason and a snapshot check.
-- Sale prices and the original web-checkout terms remain historical facts.
begin;

create function public.correct_order_line_quantity(
  p_order_id text,
  p_line_index integer,
  p_expected_lines jsonb,
  p_quantity numeric,
  p_reason text,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  saved_order public.orders%rowtype;
  current_order public.orders%rowtype;
  hold public.inventory_reservations%rowtype;
  line_before jsonb;
  line_after jsonb;
  updated_lines jsonb;
  entry record;
  line jsonb;
  line_quantity numeric;
  line_price numeric;
  line_unit text;
  quantity_key text;
  target_unit text;
  old_quantity numeric;
  unit_price numeric;
  quantities_text text;
  prices_text text;
  original_subtotal numeric := 0;
  corrected_subtotal numeric := 0;
  all_prices_known boolean := true;
  corrected_total numeric;
  recorded_discount numeric;
  pricing_basis text := 'recorded_line_prices';
  item_count numeric := 0;
  count_items integer;
  total_mass numeric := 0;
  mass_per_unit numeric;
  units_compatible boolean := true;
  product_key text;
  variant_key text;
  matched_units numeric := 0;
  active_holds numeric := 0;
  release_quantity numeric := 0;
  remaining_release numeric := 0;
  held_after jsonb := '[]'::jsonb;
  actor_name text;
begin
  if not exists (
    select 1 from public.staff_roles where user_id = p_actor and role in ('admin', 'manager')
  ) then
    raise exception 'manager_required';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then
    raise exception 'line_quantity_reason_required';
  end if;
  if p_quantity is null or p_quantity::text in ('NaN','Infinity','-Infinity')
    or p_quantity <= 0 or p_quantity > 1000000000 or p_quantity <> round(p_quantity, 3) then
    raise exception 'invalid_line_quantity';
  end if;

  -- Pair with the order lock used when issuing or voiding a payment request.
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if current_order.status not in ('pending','confirmed')
    or current_order.stage not in ('new_order','confirm_details','prepare_materials','production','packing')
    or current_order.delivered_at is not null then raise exception 'line_quantity_stage_locked'; end if;
  if jsonb_typeof(current_order.lines) is distinct from 'array' then raise exception 'invalid_order_lines'; end if;
  if p_expected_lines is distinct from current_order.lines then raise exception 'order_lines_changed'; end if;
  if p_line_index is null or p_line_index < 0 or p_line_index >= jsonb_array_length(current_order.lines) then
    raise exception 'invalid_line_index';
  end if;

  perform 1 from public.receivables where order_id = p_order_id order by id for update;
  if exists (
    select 1 from public.receivables
     where order_id = p_order_id and (status <> 'void' or coalesce(paid, 0) <> 0)
  ) or exists (
    select 1 from public.receivable_payments p
      join public.receivables r on r.id = p.receivable_id
      where r.order_id = p_order_id
  ) or exists (
    select 1 from public.partner_network_commissions where order_id = p_order_id and status = 'paid'
  ) then raise exception 'line_quantity_payment_locked'; end if;

  -- The workflow row is the same lock used when a signed document completes.
  perform 1 from public.b2b_order_workflows where order_id = p_order_id for update;
  if exists (
    select 1 from public.b2b_documents where order_id = p_order_id and status = 'complete'
      and kind in ('sales_contract','delivery_record','vat_invoice')
  ) then raise exception 'line_quantity_documents_locked'; end if;

  perform 1 from public.procedure_items i join public.procedure_runs r on r.id = i.run_id
    where r.order_id = p_order_id
      and (i.stage_key in ('loading_dispatch','delivery_pod') or i.item_key = 'qc_ready')
    order by i.id for update of i;
  if exists (
    select 1 from public.procedure_runs where order_id = p_order_id and status = 'completed'
  ) or exists (
    select 1 from public.procedure_items i join public.procedure_runs r on r.id = i.run_id
      where r.order_id = p_order_id and i.status in ('done','verified')
        and (i.stage_key in ('loading_dispatch','delivery_pod') or i.item_key = 'qc_ready')
  ) then raise exception 'line_quantity_procedure_locked'; end if;

  line_before := current_order.lines -> p_line_index;
  if jsonb_typeof(line_before) is distinct from 'object' then raise exception 'invalid_order_lines'; end if;
  target_unit := lower(btrim(coalesce(line_before->>'unit','')));
  if target_unit not in ('kg','g','pcs','pack','viên','bánh','hộp','chai','cái','ton','tons','t','gói') then
    raise exception 'invalid_line_unit';
  end if;
  if (current_order.type <> 'wholesale' or target_unit not in ('kg','g','t','ton','tons'))
    and p_quantity <> trunc(p_quantity) then raise exception 'invalid_line_quantity'; end if;

  product_key := nullif(coalesce(line_before->>'productId',line_before->>'product_id'),'');
  variant_key := coalesce(line_before->>'weight',line_before->>'variant_weight','');

  -- use the sale price already recorded on the order. Old imports may have
  -- used quantity/unitPrice aliases, and unknown prices stay unknown.
  for entry in select value, ordinality from jsonb_array_elements(current_order.lines) with ordinality
  loop
    line := entry.value;
    if jsonb_typeof(line) is distinct from 'object' then raise exception 'invalid_order_lines'; end if;
    quantities_text := coalesce(line->>'qty',line->>'quantity');
    if quantities_text is null or length(quantities_text) > 100
      or quantities_text !~ '^[+]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$' then
      raise exception 'invalid_order_lines';
    end if;
    begin
      line_quantity := quantities_text::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'invalid_order_lines';
    end;
    if line_quantity <= 0 or line_quantity > 1000000000000 then raise exception 'invalid_order_lines'; end if;

    prices_text := coalesce(line->>'price',line->>'unitPrice',line->>'unit_price');
    line_price := null;
    if prices_text is not null and length(prices_text) <= 100
      and prices_text ~ '^[+]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$' then
      begin
        line_price := prices_text::numeric;
      exception when invalid_text_representation or numeric_value_out_of_range then
        line_price := null;
      end;
      if line_price > 1000000000000000 then line_price := null; end if;
    end if;
    if line_price is null then all_prices_known := false;
    else original_subtotal := original_subtotal + line_price * line_quantity; end if;

    if entry.ordinality = p_line_index + 1 then
      old_quantity := line_quantity;
      if old_quantity = p_quantity then raise exception 'line_quantity_unchanged'; end if;
      unit_price := line_price;
      line_quantity := p_quantity;
    end if;

    if line_price is not null then corrected_subtotal := corrected_subtotal + line_price * line_quantity; end if;
    line_unit := lower(btrim(coalesce(line->>'unit','')));
    if current_order.type = 'retail' or current_order.retail_pricing is not null then item_count := item_count + line_quantity;
    elsif line_unit not in ('kg','g','t','ton','tons') then item_count := item_count + line_quantity; end if;

    -- Count documented net mass, without inferring kg from packs. An online
    -- retail line carries measured teaGrams per sale unit at checkout.
    if current_order.retail_pricing is not null then
      mass_per_unit := case when jsonb_typeof(line->'teaGrams') = 'number'
        and (line->>'teaGrams')::numeric between 0 and 1000000000
        then (line->>'teaGrams')::numeric / 1000 else 0 end;
    else
      mass_per_unit := case line_unit when 'kg' then 1 when 'g' then 0.001
        when 't' then 1000 when 'ton' then 1000 when 'tons' then 1000 else 0 end;
    end if;
    total_mass := total_mass + line_quantity * mass_per_unit;

    if product_key is not null and coalesce(line->>'productId',line->>'product_id') = product_key
      and coalesce(line->>'weight',line->>'variant_weight','') = variant_key then
      matched_units := matched_units + line_quantity;
      units_compatible := units_compatible and coalesce(nullif(line_unit,'') = target_unit, false);
    end if;
  end loop;

  if current_order.estimated_total is null then
    corrected_total := null;
    pricing_basis := 'unpriced_order';
  elsif not all_prices_known or current_order.estimated_total::text in ('NaN','Infinity','-Infinity') then
    raise exception 'invalid_order_lines';
  elsif round(current_order.estimated_total,2) = round(original_subtotal,2) then
    corrected_total := round(corrected_subtotal,2);
  else
    -- Some wholesale paths saved a discount on the order or accepted quote;
    -- apply it only when it explains the amount already agreed.
    if length(current_order.tier->>'pct') <= 100
      and (current_order.tier->>'pct') ~ '^([0-9]+\.?[0-9]*|\.[0-9]+)$' then
      recorded_discount := (current_order.tier->>'pct')::numeric;
    end if;
    if recorded_discount between 0 and 100
      and current_order.estimated_total = round(original_subtotal * (1 - recorded_discount / 100)) then
      pricing_basis := 'recorded_tier_percent';
    else
      select q.discount_percent into recorded_discount from public.trade_quotes q where q.id = current_order.quote_id;
      if recorded_discount is null or recorded_discount not between 0 and 100
        or current_order.estimated_total <> round(original_subtotal * (1 - recorded_discount / 100)) then
        raise exception 'invalid_order_lines';
      end if;
      pricing_basis := 'recorded_quote_discount';
    end if;
    corrected_total := round(corrected_subtotal * (1 - recorded_discount / 100));
  end if;
  if corrected_total > 1000000000000000 or total_mass > 1000000000000000000
    or ((current_order.type = 'retail' or current_order.total_items is not null)
        and (item_count <> trunc(item_count) or item_count > 2147483647)) then
    raise exception 'invalid_order_lines';
  end if;
  count_items := case when current_order.type = 'retail' or current_order.total_items is not null then item_count::integer else null end;

  if exists (
    select 1 from public.order_batch_allocations where order_id = p_order_id
      and (product_key is null or product_id is null or product_id = product_key)
  ) then raise exception 'line_quantity_inventory_locked'; end if;

  -- Retail creation deducts from two warehouses without retaining the split.
  -- A line with tracked stock needs reconciliation rather than a guessed
  -- release or further deduction against the current warehouse counts.
  if (current_order.type = 'retail' or current_order.retail_pricing is not null
    or (current_order.total_items is not null and current_order.quote_id is null
      and current_order.partner_account_id is null))
    and product_key is not null and (
    (variant_key <> '' and exists (
      select 1 from public.catalog_variants where product_id = product_key and weight = variant_key
        and (stock_ha_giang is not null or stock_soc_son is not null)
    )) or (variant_key = '' and exists (
      select 1 from public.catalog_products where id = product_key
        and (stock_ha_giang is not null or stock_soc_son is not null)
    ))
  ) then raise exception 'line_quantity_inventory_locked'; end if;

  if product_key is not null then
    perform 1 from public.inventory_reservations
      where order_id = p_order_id and product_id = product_key and variant_weight = variant_key
        and status in ('active','fulfilled') order by id for update;
    if exists (
      select 1 from public.inventory_reservations where order_id = p_order_id and product_id = product_key
        and variant_weight = variant_key and status = 'fulfilled'
    ) then raise exception 'line_quantity_inventory_locked'; end if;

    select coalesce(sum(quantity),0) into active_holds from public.inventory_reservations
      where order_id = p_order_id and product_id = product_key and variant_weight = variant_key and status = 'active';
    if active_holds > 0 and (
      not units_compatible or target_unit in ('g','t','ton','tons')
      or (p_quantity > old_quantity and matched_units > active_holds)
    ) then raise exception 'line_quantity_inventory_locked'; end if;

    if p_quantity < old_quantity then
      release_quantity := least(old_quantity - p_quantity, greatest(active_holds - matched_units, 0));
      -- Reservation rows store two decimals. Never round into reserved demand.
      if release_quantity <> trunc(release_quantity,2) then raise exception 'line_quantity_inventory_locked'; end if;
    end if;
    remaining_release := release_quantity;
    for hold in select * from public.inventory_reservations
      where order_id = p_order_id and product_id = product_key and variant_weight = variant_key and status = 'active'
      order by id
    loop
      exit when remaining_release <= 0;
      if hold.quantity <= remaining_release then
        update public.inventory_reservations set status = 'released',updated_at = now() where id = hold.id;
        held_after := held_after || jsonb_build_array(jsonb_build_object('id',hold.id,'released_quantity',hold.quantity));
        remaining_release := remaining_release - hold.quantity;
      else
        update public.inventory_reservations set quantity = hold.quantity - remaining_release,updated_at = now() where id = hold.id;
        held_after := held_after || jsonb_build_array(jsonb_build_object('id',hold.id,'released_quantity',remaining_release));
        remaining_release := 0;
      end if;
    end loop;
  end if;

  quantity_key := case when line_before ? 'qty' or not line_before ? 'quantity' then 'qty' else 'quantity' end;
  line_after := jsonb_set(line_before, array[quantity_key], to_jsonb(p_quantity));
  if quantity_key = 'qty' and line_before ? 'quantity' then
    line_after := jsonb_set(line_after,'{quantity}',to_jsonb(p_quantity),false);
  end if;
  if line_before ? 'total' then
    line_after := line_after || jsonb_build_object('total', round(unit_price * p_quantity,2));
  end if;
  -- grossTotal and discountAmount describe the original checkout line. The
  -- event retains them verbatim and retail_pricing keeps the original terms.
  line_after := line_after - 'grossTotal' - 'discountAmount';
  updated_lines := jsonb_set(current_order.lines,array[p_line_index::text],line_after,false);
  update public.orders
    set lines = updated_lines, total_kg = total_mass, total_items = count_items, estimated_total = corrected_total
    where id = p_order_id returning * into saved_order;
  -- Existing BOM triggers recalculate only planned estimates from the new lines.
  select email into actor_name from auth.users where id = p_actor;
  insert into public.order_events(order_id,kind,message,actor)
    values (p_order_id,'line_quantity_corrected',jsonb_build_object(
      'reason',btrim(p_reason),'line_index',p_line_index,'before_line',line_before,'after_line',line_after,
      'stage',current_order.stage,'status',current_order.status,'actor_id',p_actor,
      'before',jsonb_build_object('total_kg',current_order.total_kg,'total_items',current_order.total_items,'estimated_total',current_order.estimated_total),
      'after',jsonb_build_object('total_kg',saved_order.total_kg,'total_items',saved_order.total_items,'estimated_total',saved_order.estimated_total),
      'pricing_basis',pricing_basis,'released_reservation_quantity',release_quantity,'reservation_changes',held_after
    )::text,coalesce(actor_name,p_actor::text));
  return jsonb_build_object('order',to_jsonb(saved_order));
end;
$$;

revoke all on function public.correct_order_line_quantity(text,integer,jsonb,numeric,text,uuid) from public,anon,authenticated;
grant execute on function public.correct_order_line_quantity(text,integer,jsonb,numeric,text,uuid) to service_role;
notify pgrst, 'reload schema';
commit;
