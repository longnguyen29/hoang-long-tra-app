-- Keep each quotation's agreed sale unit and quantity. New conversions count
-- explicit mass separately from pieces/packages; no historic order is rewritten.
begin;

create function public.trade_quote_quantity_totals(p_lines jsonb)
returns table(total_kg numeric,total_items numeric)
language plpgsql immutable security definer set search_path=pg_catalog,public as $$
declare line jsonb; qty numeric; unit_value text; mass_total numeric:=0; item_total numeric:=0;
begin
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'order_lines_required'; end if;
  for line in select * from jsonb_array_elements(p_lines)
  loop
    unit_value:=btrim(coalesce(line->>'unit',''));
    qty:=(line->>'qty')::numeric;
    if unit_value not in ('kg','g','pcs','pack','viên','bánh','hộp','chai','cái','ton','tons','t') then raise exception 'invalid_quote_line_unit'; end if;
    if qty is null or qty<=0 or qty::text in ('NaN','Infinity','-Infinity') then raise exception 'invalid_quote_line_quantity'; end if;
    if unit_value='kg' then mass_total:=mass_total+qty;
    elsif unit_value='g' then mass_total:=mass_total+qty/1000;
    elsif unit_value in ('t','ton','tons') then mass_total:=mass_total+qty*1000;
    else
      if qty<>trunc(qty) then raise exception 'invalid_quote_line_quantity'; end if;
      item_total:=item_total+qty;
    end if;
  end loop;
  return query select mass_total,nullif(item_total,0);
end $$;

revoke all on function public.trade_quote_quantity_totals(jsonb) from public,anon,authenticated;

-- Existing catalogue stock counts use the catalogue sale unit. Validate the
-- commercial basis against that unit only when stock is actually recorded.
-- Metadata labels identify a sale unit; this never converts a weight to packages.
create function public.trade_catalog_sale_unit(p_line text,p_kind text,p_pack_size text,p_weight text)
returns text language plpgsql immutable set search_path=pg_catalog,public as $$
declare spec text; match_parts text[];
begin
  spec:=lower(btrim(case when nullif(p_weight,'') is not null then p_weight else coalesce(p_pack_size,'') end));
  match_parts:=regexp_match(spec,'^(?:([0-9]+(?:[.,][0-9]+)?)\s*)?(viên|vien|bánh|banh|hộp|hop|chai|cái|cai|gói|goi|piece|cake|box|bottle|pack)s?($|[[:space:](])');
  if match_parts is not null then
    if match_parts[1] is not null and replace(match_parts[1],',','.')::numeric<>1 then return 'pcs'; end if;
    return case match_parts[2] when 'viên' then 'viên' when 'vien' then 'viên' when 'piece' then 'viên'
      when 'bánh' then 'bánh' when 'banh' then 'bánh' when 'cake' then 'bánh'
      when 'hộp' then 'hộp' when 'hop' then 'hộp' when 'box' then 'hộp'
      when 'chai' then 'chai' when 'bottle' then 'chai'
      when 'cái' then 'cái' when 'cai' then 'cái' else 'pcs' end;
  end if;
  if nullif(p_weight,'') is not null then return case when spec='kg' then 'kg' else 'pcs' end; end if;
  if p_kind='goods' then return 'cái'; end if;
  return case when p_line='everyday' then 'kg' else 'pcs' end;
end $$;

create function public.trade_quote_assert_stock_units(p_lines jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare line_value jsonb; product_row public.catalog_products; variant_row public.catalog_variants;
  weight_value text; sale_unit text; declared_unit text; stock_recorded boolean;
begin
  if jsonb_typeof(p_lines)<>'array' then raise exception 'order_lines_required'; end if;
  for line_value in select * from jsonb_array_elements(p_lines)
  loop
    select * into product_row from public.catalog_products where id=line_value->>'productId' for update;
    if not found then continue; end if; -- Established availability check reports unknown products.
    weight_value:=coalesce(line_value->>'weight','');
    if weight_value<>'' then
      select * into variant_row from public.catalog_variants where product_id=product_row.id and weight=weight_value for update;
      if not found then continue; end if;
      stock_recorded:=variant_row.stock_ha_giang is not null or variant_row.stock_soc_son is not null;
    else stock_recorded:=product_row.stock_ha_giang is not null or product_row.stock_soc_son is not null; end if;
    if stock_recorded then
      sale_unit:=public.trade_catalog_sale_unit(product_row.line,product_row.kind,product_row.pack_size,weight_value);
      declared_unit:=coalesce(line_value->>'unit','');
      if declared_unit is distinct from sale_unit and not(declared_unit in ('pcs','pack') and sale_unit in ('pcs','pack')) then
        raise exception 'quote_stock_unit_mismatch:%:%',product_row.id,sale_unit;
      end if;
    end if;
  end loop;
end $$;

revoke all on function public.trade_catalog_sale_unit(text,text,text,text),public.trade_quote_assert_stock_units(jsonb) from public,anon,authenticated;


create or replace function partner_accept_quote(p_quote_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  a wholesale_accounts%rowtype;
  q trade_quotes%rowtype;
  v_order_id text;
  v_total_kg numeric;
  v_total_items numeric;
begin
  select * into a from wholesale_accounts where user_id=auth.uid() and wholesale_verified=true limit 1;
  if not found then raise exception 'partner_not_approved'; end if;
  select * into q from trade_quotes where id=p_quote_id and partner_account_id=a.id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if q.converted_order_id is not null then return q.converted_order_id; end if;
  if q.status<>'sent' then raise exception 'quote_not_open'; end if;
  if q.valid_until is not null and q.valid_until<current_date then raise exception 'quote_expired'; end if;
  perform public.trade_quote_assert_stock_units(q.lines);
  perform assert_inventory_available(q.lines);
  select total_kg,total_items into v_total_kg,v_total_items from public.trade_quote_quantity_totals(q.lines);
  v_order_id:='order-'||to_char(now(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,4);
  insert into orders(id,ts,type,customer_name,contact,address,note,lines,total_kg,total_items,estimated_total,payment_method,status,unread,partner_account_id,quote_id)
  values(v_order_id,now(),'wholesale',q.customer_name,q.contact,q.address,'Đối tác chấp nhận báo giá '||q.id,q.lines,v_total_kg,v_total_items,q.total,q.payment_method,'pending',true,a.id,q.id);
  insert into inventory_reservations(id,order_id,product_id,variant_weight,quantity)
  select 'reserve-'||substr(md5(v_order_id||':'||(line->>'productId')||':'||coalesce(line->>'weight','')),1,20),v_order_id,
    line->>'productId',coalesce(line->>'weight',''),(line->>'qty')::numeric
  from jsonb_array_elements(q.lines) line where nullif(line->>'productId','') is not null;
  update trade_quotes set status='converted',accepted_at=now(),converted_order_id=v_order_id,updated_at=now() where id=q.id;
  update trade_opportunities set stage='won',next_action='Xác nhận và chuẩn bị đơn',next_action_at=now(),updated_at=now() where id=q.opportunity_id;
  return v_order_id;
end;
$$;

create or replace function convert_trade_quote_to_order(p_quote_id text,p_actor text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare q trade_quotes%rowtype; v_order_id text; v_total_kg numeric; v_total_items numeric;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  select * into q from trade_quotes where id=p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if q.converted_order_id is not null then return q.converted_order_id; end if;
  if q.status<>'accepted' then raise exception 'quote_not_accepted'; end if;
  perform public.trade_quote_assert_stock_units(q.lines);
  perform assert_inventory_available(q.lines);
  select total_kg,total_items into v_total_kg,v_total_items from public.trade_quote_quantity_totals(q.lines);
  v_order_id:='order-'||to_char(now(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,4);
  insert into orders(id,ts,type,customer_name,contact,address,note,lines,total_kg,total_items,estimated_total,payment_method,status,tracking_code,unread,partner_account_id,quote_id)
  values(v_order_id,now(),'wholesale',q.customer_name,q.contact,q.address,concat('Từ báo giá ',q.id,case when q.note<>'' then E'\n'||q.note else '' end),q.lines,v_total_kg,v_total_items,q.total,q.payment_method,'pending','',true,q.partner_account_id,q.id);
  insert into inventory_reservations(id,order_id,product_id,variant_weight,quantity)
  select 'reserve-'||substr(md5(v_order_id||':'||(line->>'productId')||':'||coalesce(line->>'weight','')),1,20),v_order_id,
    line->>'productId',coalesce(line->>'weight',''),(line->>'qty')::numeric
  from jsonb_array_elements(q.lines) line where nullif(line->>'productId','') is not null;
  update trade_quotes set status='converted',converted_order_id=v_order_id,updated_at=now() where id=q.id;
  update trade_opportunities set stage='won',next_action='Xác nhận và chuẩn bị đơn đầu tiên',next_action_at=now(),updated_at=now() where id=q.opportunity_id;
  return v_order_id;
end;
$$;

-- Preserve the established entry-point permissions; helper access stays private.
revoke all on function public.partner_accept_quote(text) from public,anon;
grant execute on function public.partner_accept_quote(text) to authenticated;
revoke all on function public.convert_trade_quote_to_order(text,text) from public,anon;
grant execute on function public.convert_trade_quote_to_order(text,text) to authenticated;
commit;
