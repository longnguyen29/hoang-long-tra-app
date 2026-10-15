-- New shop checkout only. Existing staff/manual retail pricing and referral-code
-- checkouts keep their established RPC. No historic order is repriced.
begin;

alter table public.orders add column retail_pricing jsonb;

create function public.retail_package_grams(p_spec text) returns numeric
language plpgsql immutable set search_path=pg_catalog,public as $$
declare spec text:=lower(normalize(btrim(coalesce(p_spec,'')),NFC)); parts text[]; amount numeric; multiplier numeric:=1; unit_value text;
begin
  parts:=regexp_match(spec,'^([0-9]+(?:[.,][0-9]{1,3})?)\s*(kg|g)$');
  if parts is null then
    parts:=regexp_match(spec,'^([0-9]+)\s*[x×]\s*([0-9]+(?:[.,][0-9]{1,3})?)\s*(kg|g)$');
    if parts is not null then
      multiplier:=parts[1]::numeric; amount:=replace(parts[2],',','.')::numeric; unit_value:=parts[3];
    else
      parts:=regexp_match(spec,'^(?:1\s*)?(?:viên|vien|bánh|banh|gói|goi|hộp|hop|piece|cake|pack)s?\s*\(\s*([0-9]+(?:[.,][0-9]{1,3})?)\s*(kg|g)\s*\)$');
      if parts is null then return null; end if;
      amount:=replace(parts[1],',','.')::numeric; unit_value:=parts[2];
    end if;
  else
    amount:=replace(parts[1],',','.')::numeric; unit_value:=parts[2];
  end if;
  amount:=amount*multiplier*case when unit_value='kg' then 1000 else 1 end;
  if amount<=0 or amount>1000000000 then return null; end if;
  return amount;
end $$;
revoke all on function public.retail_package_grams(text) from public,anon,authenticated;

-- The API supplies expected gross catalogue prices and a net payable total. All
-- financial/weight facts are rebuilt under locks; no supplied benefit is trusted.
create function public.submit_retail_volume_order(
  p_customer_name text,p_contact text,p_address text,p_tax_number text,p_note text,
  p_lines jsonb,p_total_items integer,p_estimated_total numeric,p_payment_method text
) returns table(id text,ts timestamptz,status text)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare line_value jsonb; item public.catalog_products; variant public.catalog_variants; product_id_value text; weight_value text; key_value text;
  qty_value numeric; price_value numeric; unit_value text; name_value jsonb; grams_value numeric; tea_value boolean;
  seen_value jsonb:='{}'::jsonb; canonical_lines jsonb:='[]'::jsonb; output_lines jsonb:='[]'::jsonb;
  count_value integer:=0; gross_value numeric:=0; tea_subtotal numeric:=0; tea_grams numeric:=0; eligible_value boolean;
  rate_value integer; discount_value numeric; line_discount numeric; gross_line numeric; extra_discount numeric;
  total_value numeric; stored_total numeric:=0; stored_price numeric; result_id text; result_ts timestamptz; result_status text; snapshot_value jsonb;
begin
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 50
    or p_customer_name is null or length(btrim(p_customer_name)) not between 1 and 180
    or p_contact is null or length(btrim(p_contact)) not between 1 and 240
    or p_address is null or length(btrim(p_address)) not between 1 and 1000
    or length(coalesce(p_tax_number,''))>80 or length(coalesce(p_note,''))>3000
    or p_payment_method not in ('qr','cash') or p_payment_method is null then raise exception 'invalid_checkout'; end if;

  -- The legacy stock writer locks products before variants. Acquire the complete
  -- new cart's rows in a stable order before canonicalization and its stock work.
  perform 1 from public.catalog_products p where p.id in (select x->>'productId' from jsonb_array_elements(p_lines)x) order by p.id for update;
  perform 1 from public.catalog_variants v where (v.product_id,v.weight) in
    (select x->>'productId',x->>'weight' from jsonb_array_elements(p_lines)x where nullif(x->>'weight','') is not null)
    order by v.product_id,v.weight for update;

  for line_value in select x from jsonb_array_elements(p_lines)x
  loop
    if jsonb_typeof(line_value) is distinct from 'object' then raise exception 'invalid_checkout'; end if;
    product_id_value:=line_value->>'productId'; weight_value:=nullif(line_value->>'weight','');
    if nullif(product_id_value,'') is null or jsonb_typeof(line_value->'qty') is distinct from 'number'
      or (line_value->>'qty') !~ '^[0-9]+$' then raise exception 'invalid_checkout'; end if;
    qty_value:=(line_value->>'qty')::numeric;
    if qty_value not between 1 and 1000 then raise exception 'invalid_checkout'; end if;
    key_value:=jsonb_build_array(product_id_value,weight_value)::text;
    if seen_value ? key_value then raise exception 'invalid_checkout'; end if;
    seen_value:=seen_value||jsonb_build_object(key_value,true);
    select * into item from public.catalog_products where catalog_products.id=product_id_value;
    if not found or item.available is not true or item.line='sample' then raise exception 'cart_changed'; end if;
    if weight_value is not null then
      select * into variant from public.catalog_variants where product_id=product_id_value and weight=weight_value;
      if not found then raise exception 'cart_changed'; end if;
      price_value:=variant.price;
    else
      if exists(select 1 from public.catalog_variants where product_id=product_id_value) then raise exception 'cart_changed'; end if;
      price_value:=item.price;
    end if;
    unit_value:=public.trade_catalog_sale_unit(item.line,item.kind,item.pack_size,weight_value);
    if price_value is null or price_value<=0 or price_value>999999999999 or price_value::text in ('NaN','Infinity','-Infinity')
      or jsonb_typeof(line_value->'price') is distinct from 'number'
      or (line_value->>'price')::numeric is distinct from price_value then raise exception 'price_changed'; end if;
    if line_value->>'unit' is distinct from unit_value then raise exception 'cart_changed'; end if;
    name_value:=case when weight_value is null then item.name else jsonb_build_object(
      'vi',coalesce(nullif(item.name->>'vi',''),item.name->>'en','Trà')||' ('||weight_value||')',
      'en',coalesce(nullif(item.name->>'en',''),item.name->>'vi','Tea')||' ('||weight_value||')') end;
    tea_value:=coalesce(item.kind,'tea')='tea';
    grams_value:=case when not tea_value then 0 when unit_value='kg' then 1000 when unit_value='g' then 1
      else public.retail_package_grams(case when weight_value is not null then weight_value else item.pack_size end) end;
    eligible_value:=tea_value and coalesce(grams_value,0)>0;
    gross_line:=price_value*qty_value;
    gross_value:=gross_value+gross_line; count_value:=count_value+qty_value::integer;
    if eligible_value then tea_grams:=tea_grams+grams_value*qty_value; tea_subtotal:=tea_subtotal+gross_line; end if;
    canonical_lines:=canonical_lines||jsonb_build_array(jsonb_build_object('productId',product_id_value,'weight',weight_value,'qty',qty_value,
      'unit',unit_value,'name',name_value,'listPrice',price_value,'grossTotal',gross_line,'teaGrams',grams_value,'volumeEligible',eligible_value));
  end loop;
  if p_total_items is distinct from count_value then raise exception 'cart_changed'; end if;
  tea_grams:=round(tea_grams,3);
  rate_value:=case when tea_grams>=100000 then 7 when tea_grams>=50000 then 5 when tea_grams>=20000 then 3 else 0 end;
  discount_value:=round(tea_subtotal*rate_value/100,0);
  total_value:=round(gross_value-discount_value,2);
  if p_estimated_total is null or p_estimated_total::text in ('NaN','Infinity','-Infinity')
    or p_estimated_total is distinct from total_value then raise exception 'price_changed'; end if;
  -- Floor first, then distribute the rounding residual in cart order, capped by
  -- each line's remaining amount. Even an unusual fractional-VND catalogue
  -- price cannot yield a negative unit price on a tiny final line.
  select discount_value-coalesce(sum(case when (x->>'volumeEligible')::boolean then floor((x->>'grossTotal')::numeric*rate_value/100) else 0 end),0)
    into extra_discount from jsonb_array_elements(canonical_lines)x;
  for line_value in select x from jsonb_array_elements(canonical_lines)x
  loop
    gross_line:=(line_value->>'grossTotal')::numeric; qty_value:=(line_value->>'qty')::numeric;
    line_discount:=case when (line_value->>'volumeEligible')::boolean then floor(gross_line*rate_value/100) else 0 end;
    if (line_value->>'volumeEligible')::boolean then
      price_value:=least(extra_discount,gross_line-line_discount);
      line_discount:=line_discount+price_value; extra_discount:=extra_discount-price_value;
    end if;
    stored_price:=round((gross_line-line_discount)/qty_value,12);
    stored_total:=stored_total+stored_price*qty_value;
    output_lines:=output_lines||jsonb_build_array(line_value||jsonb_build_object('discountAmount',line_discount,'total',gross_line-line_discount,
      'price',stored_price));
  end loop;
  snapshot_value:=jsonb_build_object('version',1,'policy','retail-tea-volume-2026-10-14-v1','tea_grams',tea_grams,'gross_subtotal',gross_value,
    'eligible_tea_subtotal',tea_subtotal,'discount_percent',rate_value,'discount_amount',discount_value,'total',total_value,
    'free_shipping',tea_grams>=5000,'free_shipping_threshold_grams',5000,'discount_stacking',false);
  select result.id,result.ts,result.status into result_id,result_ts,result_status from public.submit_retail_order(
    p_customer_name,p_contact,p_address,p_tax_number,p_note,output_lines,count_value,stored_total,null,p_payment_method) result;
  update public.orders set retail_pricing=snapshot_value,total_kg=tea_grams/1000 where orders.id=result_id;
  return query select result_id,result_ts,result_status;
end $$;
revoke all on function public.submit_retail_volume_order(text,text,text,text,text,jsonb,integer,numeric,text) from public,anon,authenticated;
grant execute on function public.submit_retail_volume_order(text,text,text,text,text,jsonb,integer,numeric,text) to service_role;

commit;
