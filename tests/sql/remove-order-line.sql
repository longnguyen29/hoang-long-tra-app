-- Run after migration 0080 as database owner in an isolated test database.
-- Every record is synthetic and every change is rolled back. This fixture
-- never invokes a gateway, messaging function, scheduler or customer API.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.role','service_role',true);

create function pg_temp.expect_line_removal_error(
  p_id text,p_index integer,p_lines jsonb,p_reason text,p_actor uuid,p_error text
) returns void language plpgsql as $$
declare before_order jsonb; before_receivable jsonb; before_payments jsonb;
  before_reservations jsonb; before_costs jsonb; before_events bigint;
begin
  select to_jsonb(o) into before_order from public.orders o where id=p_id;
  select jsonb_agg(to_jsonb(r) order by r.id) into before_receivable from public.receivables r where order_id=p_id;
  select jsonb_agg(to_jsonb(p) order by p.id) into before_payments
    from public.receivable_payments p join public.receivables r on r.id=p.receivable_id where r.order_id=p_id;
  select jsonb_agg(to_jsonb(r) order by r.id) into before_reservations from public.inventory_reservations r where order_id=p_id;
  select jsonb_agg(to_jsonb(c) order by c.id) into before_costs from public.order_costs c where order_id=p_id;
  select count(*) into before_events from public.order_events where order_id=p_id;
  begin
    perform public.remove_order_line(p_id,p_index,p_lines,p_reason,p_actor);
    raise exception 'Expected rejection %, but removal succeeded',p_error;
  exception when others then
    if sqlerrm<>p_error then raise; end if;
  end;
  if before_order is distinct from (select to_jsonb(o) from public.orders o where id=p_id)
    or before_receivable is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.receivables r where order_id=p_id)
    or before_payments is distinct from (select jsonb_agg(to_jsonb(p) order by p.id) from public.receivable_payments p join public.receivables r on r.id=p.receivable_id where r.order_id=p_id)
    or before_reservations is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.inventory_reservations r where order_id=p_id)
    or before_costs is distinct from (select jsonb_agg(to_jsonb(c) order by c.id) from public.order_costs c where order_id=p_id)
    or before_events<>(select count(*) from public.order_events where order_id=p_id)
  then raise exception 'Rejected removal changed order, billing, reservations, costs or audit: %',p_error; end if;
end $$;

do $$
#variable_conflict use_variable
declare
  suffix text:=replace(gen_random_uuid()::text,'-','');
  manager_id uuid:=gen_random_uuid();
  employee_id uuid:=gen_random_uuid();
  product_kg text:='test-remove-kg-'||suffix;
  product_pcs text:='test-remove-pcs-'||suffix;
  product_pack text:='test-remove-pack-'||suffix;
  retail_id text:='test-remove-retail-'||suffix;
  duplicate_id text:='test-remove-duplicate-'||suffix;
  hold_id text:='test-remove-hold-'||suffix;
  unknown_id text:='test-remove-unknown-'||suffix;
  tier_id text:='test-remove-tier-'||suffix;
  quote_order_id text:='test-remove-quote-order-'||suffix;
  quote_id text:='test-remove-quote-'||suffix;
  batch_id text:='test-remove-batch-'||suffix;
  run_id uuid:=gen_random_uuid();
  item_id uuid:=gen_random_uuid();
  blocker_id uuid:=gen_random_uuid();
  evidence_id uuid:=gen_random_uuid();
  material_id uuid:=gen_random_uuid();
  actual_material_id uuid:=gen_random_uuid();
  paid_material_id uuid:=gen_random_uuid();
  committed_material_id uuid:=gen_random_uuid();
  manual_cost_id uuid:=gen_random_uuid();
  original_catalog jsonb;
  original_batch jsonb;
  original_procedure jsonb;
  original_payments jsonb;
  original_confirmed_bom jsonb;
  saved_lines jsonb;
  retail_lines jsonb;
  duplicate_lines jsonb;
  payment_lines jsonb;
  unknown_lines jsonb;
  result jsonb;
  event_detail jsonb;
  test_case text;
  case_id text;
  receipt_id text;
  paid_value numeric;
  receipt_total numeric;
  stage_value text;
  status_value text;
begin
  if to_regprocedure('public.remove_order_line(text,integer,jsonb,text,uuid)') is null then raise exception 'Migration 0080 required'; end if;
  if has_function_privilege('anon','public.remove_order_line(text,integer,jsonb,text,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.remove_order_line(text,integer,jsonb,text,uuid)','EXECUTE')
    or not has_function_privilege('service_role','public.remove_order_line(text,integer,jsonb,text,uuid)','EXECUTE')
  then raise exception 'Line removal must be service-role-only'; end if;

  insert into auth.users(id,email) values
    (manager_id,'test-remove-manager-'||suffix||'@fixture.invalid'),
    (employee_id,'test-remove-employee-'||suffix||'@fixture.invalid');
  insert into public.staff_roles(user_id,role) values(manager_id,'manager'),(employee_id,'employee');
  insert into public.catalog_products(id,line,name,price,stock_ha_giang,stock_soc_son) values
    (product_kg,'everyday','{"vi":"TEST kilogram"}',999999,100,0),
    (product_pcs,'reserve','{"vi":"TEST pieces"}',999999,100,0),
    (product_pack,'reserve','{"vi":"TEST packs"}',999999,100,0);
  select jsonb_agg(to_jsonb(p) order by p.id) into original_catalog from public.catalog_products p
    where id in (product_kg,product_pcs,product_pack);
  insert into public.supply_items(id,code,name,unit,unit_cost)
    values(material_id,'TEST-'||suffix,'TEST removed-line material','unit',20);
  insert into public.supply_items(id,code,name,unit,unit_cost) values
    (actual_material_id,'ACT-'||suffix,'TEST actual retained material','unit',5),
    (paid_material_id,'PAID-'||suffix,'TEST paid obsolete material','unit',3),
    (committed_material_id,'COM-'||suffix,'TEST committed retained material','unit',2);
  insert into public.product_bom_components(product_id,variant_weight,supply_item_id,quantity_per_sale)
    values(product_kg,'',material_id,1),(product_pcs,'500g',material_id,2),(product_pack,'',material_id,1),
      (product_kg,'',actual_material_id,2),(product_pcs,'500g',paid_material_id,1),(product_kg,'',committed_material_id,3);

  retail_lines:=jsonb_build_array(
    jsonb_build_object('productId',product_kg,'name',jsonb_build_object('vi','TEST kilogram'),'qty',2,'unit','kg','price',100,'customerNote','retain exactly'),
    jsonb_build_object('productId',product_pcs,'weight','500g','name',jsonb_build_object('vi','TEST mistaken pieces'),'qty',3,'unit','pcs','price',50,'customEvidence',jsonb_build_object('keep','full removed payload')),
    jsonb_build_object('productId',product_pack,'name',jsonb_build_object('vi','TEST pack'),'qty',1,'unit','pack','price',25)
  );
  insert into public.orders(id,type,customer_name,contact,lines,total_kg,total_items,estimated_total,vat,promo,stage,status)
    values(retail_id,'retail','TEST ONLY',retail_id||'@fixture.invalid',retail_lines,2,6,375,10,'{"code":"TEST","percent":20}','packing','confirmed');
  if not exists(select 1 from public.order_costs where order_id=retail_id and source_type='bom' and quantity=9)
  then raise exception 'Initial BOM fixture did not include all three lines'; end if;
  update public.order_costs set estimated=false,quantity=40,unit_cost=42,
    description='TEST confirmed actual material',note='TEST actual ledger snapshot'
    where order_id=retail_id and source_key='bom:'||actual_material_id;
  update public.order_costs set payment_status='paid',description='TEST paid material from removed line'
    where order_id=retail_id and source_key='bom:'||paid_material_id;
  update public.order_costs set payment_status='committed',quantity=99,description='TEST committed material'
    where order_id=retail_id and source_key='bom:'||committed_material_id;
  select jsonb_agg(to_jsonb(c) order by c.id) into original_confirmed_bom from public.order_costs c
    where c.order_id=retail_id and c.source_key in ('bom:'||actual_material_id,'bom:'||paid_material_id,'bom:'||committed_material_id);
  insert into public.order_costs(id,order_id,category,description,quantity,unit_cost,payment_status,created_by)
    values(manual_cost_id,retail_id,'shipping','TEST paid freight evidence',1,30,'paid',manager_id);
  insert into public.inventory_reservations(id,order_id,product_id,variant_weight,quantity,status) values
    ('test-remove-active-'||suffix,retail_id,product_pcs,'500g',3,'active'),
    ('test-remove-fulfilled-'||suffix,retail_id,product_pcs,'500g',2,'fulfilled'),
    ('test-remove-other-variant-'||suffix,retail_id,product_pcs,'250g',7,'active');
  insert into public.tea_batches(id,code,product_id,available_kg,reserved_kg,status)
    values(batch_id,'TEST-'||suffix,product_pcs,100,1,'released');
  insert into public.order_batch_allocations(id,order_id,batch_id,product_id,quantity_kg,created_by)
    values('test-remove-allocation-'||suffix,retail_id,batch_id,product_pcs,1,manager_id::text);
  select to_jsonb(b) into original_batch from public.tea_batches b where id=batch_id;

  perform pg_temp.expect_line_removal_error(retail_id,1,retail_lines,'TEST mistaken line',employee_id,'manager_required');
  perform pg_temp.expect_line_removal_error(retail_id,1,retail_lines,'bad',manager_id,'line_removal_reason_required');
  perform pg_temp.expect_line_removal_error(retail_id,-1,retail_lines,'TEST mistaken line',manager_id,'invalid_line_index');
  perform pg_temp.expect_line_removal_error(retail_id,3,retail_lines,'TEST mistaken line',manager_id,'invalid_line_index');
  perform pg_temp.expect_line_removal_error(retail_id,null,retail_lines,'TEST mistaken line',manager_id,'invalid_line_index');
  perform pg_temp.expect_line_removal_error(retail_id,1,null,'TEST mistaken line',manager_id,'order_lines_changed');
  perform pg_temp.expect_line_removal_error(retail_id,1,jsonb_set(retail_lines,'{0,price}','101'),'TEST mistaken line',manager_id,'order_lines_changed');
  perform pg_temp.expect_line_removal_error('test-no-order-'||suffix,1,retail_lines,'TEST mistaken line',manager_id,'order_not_found');

  result:=public.remove_order_line(retail_id,1,retail_lines,'TEST mistaken line',manager_id);
  if result->'order'->'lines' is distinct from retail_lines-1
    or result->'removed' is distinct from retail_lines->1
    or (result->'order'->>'estimated_total')::numeric<>225
    or (result->'order'->>'total_kg')::numeric<>2
    or (result->'order'->>'total_items')::integer<>3
    or result->'order'->>'stage'<>'packing' or result->'order'->>'status'<>'confirmed'
    or (result->'order'->>'vat')::numeric<>10 or result->'order'->'promo' is distinct from '{"code":"TEST","percent":20}'::jsonb
    or result->'receivable' is distinct from 'null'::jsonb
  then raise exception 'Retail mixed units, retained pricing, metadata or return payload failed'; end if;
  if not exists(select 1 from public.inventory_reservations where id='test-remove-active-'||suffix and status='released' and quantity=3)
    or not exists(select 1 from public.inventory_reservations where id='test-remove-fulfilled-'||suffix and status='fulfilled' and quantity=2)
    or not exists(select 1 from public.inventory_reservations where id='test-remove-other-variant-'||suffix and status='active' and quantity=7)
    or not exists(select 1 from public.order_batch_allocations where id='test-remove-allocation-'||suffix and quantity_kg=1)
    or original_batch is distinct from (select to_jsonb(b) from public.tea_batches b where id=batch_id)
  then raise exception 'Reservation scope or fulfilled/batch evidence changed'; end if;
  if not exists(select 1 from public.order_costs where id=manual_cost_id and quantity=1 and unit_cost=30 and payment_status='paid')
    or not exists(select 1 from public.order_costs where order_id=retail_id and source_type='bom' and quantity=3 and unit_cost=20)
    or original_confirmed_bom is distinct from (select jsonb_agg(to_jsonb(c) order by c.id) from public.order_costs c
      where c.order_id=retail_id and c.source_key in ('bom:'||actual_material_id,'bom:'||paid_material_id,'bom:'||committed_material_id))
  then raise exception 'Existing BOM trigger or manual costs were not preserved'; end if;
  select message::jsonb into event_detail from public.order_events where order_id=retail_id and kind='line_removed';
  if event_detail->'removed_line' is distinct from retail_lines->1
    or event_detail->>'reason'<>'TEST mistaken line' or event_detail->>'actor_id'<>manager_id::text
    or event_detail->>'stage'<>'packing' or (event_detail->'before'->>'estimated_total')::numeric<>375
    or (event_detail->'after'->>'estimated_total')::numeric<>225
    or (event_detail->>'released_reservation_quantity')::numeric<>3
    or jsonb_array_length(event_detail->'reservation_changes')<>1
  then raise exception 'Full line-removal audit missing'; end if;
  -- The stale original snapshot must never target the shifted line index.
  perform pg_temp.expect_line_removal_error(retail_id,1,retail_lines,'TEST stale browser',manager_id,'order_lines_changed');
  saved_lines:=result->'order'->'lines';
  result:=public.remove_order_line(retail_id,1,saved_lines,'TEST remove second mistake',manager_id);
  perform pg_temp.expect_line_removal_error(retail_id,0,result->'order'->'lines','TEST remove last line',manager_id,'last_order_line');

  -- Same product/variant can occur on multiple lines. Never release a retained
  -- line's reservation or touch existing dispatch/STOP/evidence history.
  duplicate_lines:=jsonb_build_array(
    jsonb_build_object('productId',product_kg,'qty',2,'unit','kg','price',100),
    jsonb_build_object('productId',product_kg,'qty',3,'unit','kg','price',100),
    jsonb_build_object('productId',product_pcs,'qty',2,'unit','pcs','price',50)
  );
  insert into public.orders(id,type,customer_name,contact,lines,total_kg,estimated_total,stage,status)
    values(duplicate_id,'wholesale','TEST ONLY',duplicate_id||'@fixture.invalid',duplicate_lines,5,600,'shipping','shipped');
  insert into public.inventory_reservations(id,order_id,product_id,quantity,status)
    values('test-remove-duplicate-reservation-'||suffix,duplicate_id,product_kg,5,'active');
  insert into public.procedure_runs(id,order_id,template_key,created_by) values(run_id,duplicate_id,'domestic_b2b',manager_id);
  insert into public.procedure_items(id,run_id,stage_key,item_key,position,title,critical,status)
    values(item_id,run_id,'stock_production','TEST-proof',1,'TEST preflight',true,'blocked');
  insert into public.procedure_blockers(id,run_id,item_id,stop_work,problem,created_by)
    values(blocker_id,run_id,item_id,true,'TEST historical STOP',manager_id);
  insert into public.procedure_evidence(id,run_id,item_id,storage_path,archive_path,file_name,content_type,expected_size,status,uploaded_by)
    values(evidence_id,run_id,item_id,'test-remove/'||suffix,'test-remove/archive/'||suffix,'TEST.txt','text/plain',1,'ready',manager_id);
  insert into public.procedure_events(run_id,item_id,actor_id,action,detail) values(run_id,item_id,manager_id,'test_preserved','TEST original history');
  select jsonb_build_object('run',(select to_jsonb(r) from public.procedure_runs r where id=run_id),
    'item',(select to_jsonb(i) from public.procedure_items i where id=item_id),
    'blocker',(select to_jsonb(b) from public.procedure_blockers b where id=blocker_id),
    'evidence',(select to_jsonb(e) from public.procedure_evidence e where id=evidence_id),
    'events',(select jsonb_agg(to_jsonb(e) order by e.id) from public.procedure_events e where e.run_id=run_id)) into original_procedure;
  result:=public.remove_order_line(duplicate_id,0,duplicate_lines,'TEST duplicate mistake',manager_id);
  if result->'order'->>'stage'<>'shipping' or result->'order'->>'status'<>'shipped'
    or (result->'order'->>'estimated_total')::numeric<>400 or (result->'order'->>'total_kg')::numeric<>3
    or result->'order'->'total_items' is distinct from 'null'::jsonb
    or not exists(select 1 from public.inventory_reservations where id='test-remove-duplicate-reservation-'||suffix and quantity=3 and status='active')
  then raise exception 'Duplicate product reservation or wholesale quantities failed'; end if;
  if original_procedure is distinct from jsonb_build_object('run',(select to_jsonb(r) from public.procedure_runs r where id=run_id),
    'item',(select to_jsonb(i) from public.procedure_items i where id=item_id),
    'blocker',(select to_jsonb(b) from public.procedure_blockers b where id=blocker_id),
    'evidence',(select to_jsonb(e) from public.procedure_evidence e where id=evidence_id),
    'events',(select jsonb_agg(to_jsonb(e) order by e.id) from public.procedure_events e where e.run_id=run_id))
  then raise exception 'Procedure Run, STOP, evidence or history changed'; end if;
  insert into public.orders(id,type,customer_name,contact,lines,estimated_total,stage,status)
    values(hold_id,'wholesale','TEST ONLY',hold_id||'@fixture.invalid',duplicate_lines,600,'completed','completed');
  insert into public.inventory_reservations(id,order_id,product_id,quantity)
    values('test-remove-partial-hold-'||suffix,hold_id,product_kg,2);
  result:=public.remove_order_line(hold_id,0,duplicate_lines,'TEST partial reservation',manager_id);
  if result->'order'->>'stage'<>'completed' or result->'order'->>'status'<>'completed'
    or not exists(select 1 from public.inventory_reservations where id='test-remove-partial-hold-'||suffix and quantity=2 and status='active')
  then raise exception 'Completed order or retained partial hold changed'; end if;

  payment_lines:=jsonb_build_array(
    jsonb_build_object('productId',product_kg,'qty',1,'unit','kg','price',100),
    jsonb_build_object('productId',product_pcs,'qty',1,'unit','pcs','price',200)
  );
  foreach test_case in array array['unpaid','partial','exact_paid','overpaid','fully_paid','wrong_total','wrong_paid','unpriced','unexplained_discount'] loop
    case_id:='test-remove-'||test_case||'-'||suffix;
    receipt_id:='test-remove-receipt-'||test_case||'-'||suffix;
    paid_value:=case test_case when 'partial' then 50 when 'exact_paid' then 100 when 'overpaid' then 101 when 'fully_paid' then 300 when 'wrong_paid' then 40 else 0 end;
    receipt_total:=case test_case when 'wrong_total' then 299 when 'unexplained_discount' then 250 else 300 end;
    saved_lines:=case when test_case='unpriced' then jsonb_set(payment_lines,'{0,price}','null') else payment_lines end;
    insert into public.orders(id,type,customer_name,contact,lines,total_kg,estimated_total,stage,status)
      values(case_id,'wholesale','TEST ONLY',case_id||'@fixture.invalid',saved_lines,1,case when test_case='unexplained_discount' then 250 else 300 end,'completed','completed');
    insert into public.receivables(id,order_id,total,paid,status)
      values(receipt_id,case_id,receipt_total,paid_value,case when paid_value=receipt_total then 'paid' when paid_value>0 then 'partial' else 'open' end);
    if paid_value>0 then
      insert into public.receivable_payments(id,receivable_id,amount,method,reference,created_by)
        values('test-remove-payment-'||test_case||'-'||suffix,receipt_id,case when test_case='wrong_paid' then 41 else paid_value end,'cash','TEST immutable payment',manager_id::text);
    end if;
    if test_case in ('unpaid','partial','exact_paid') then
      select jsonb_agg(to_jsonb(p) order by p.id) into original_payments from public.receivable_payments p where receivable_id=receipt_id;
      result:=public.remove_order_line(case_id,1,saved_lines,'TEST payment correction',manager_id);
      if (result->'order'->>'estimated_total')::numeric<>100 or (result->'receivable'->>'total')::numeric<>100
        or (result->'receivable'->>'paid')::numeric<>paid_value
        or result->'receivable'->>'status'<>(case test_case when 'exact_paid' then 'paid' when 'partial' then 'partial' else 'open' end)
        or original_payments is distinct from (select jsonb_agg(to_jsonb(p) order by p.id) from public.receivable_payments p where receivable_id=receipt_id)
      then raise exception 'Receivable/payment correction failed: %',test_case; end if;
    else
      perform pg_temp.expect_line_removal_error(case_id,1,saved_lines,'TEST blocked billing',manager_id,'line_removal_payment_conflict');
    end if;
  end loop;

  -- A paid order may lose a zero-value mistake without changing the money
  -- received. A void request remains untouched as historical billing evidence.
  foreach test_case in array array['paid_free_line','void_request'] loop
    case_id:='test-remove-'||test_case||'-'||suffix;
    receipt_id:='test-remove-receipt-'||test_case||'-'||suffix;
    saved_lines:=case when test_case='paid_free_line' then jsonb_set(payment_lines,'{1,price}','0') else payment_lines end;
    insert into public.orders(id,type,customer_name,contact,lines,estimated_total)
      values(case_id,'wholesale','TEST ONLY',case_id||'@fixture.invalid',saved_lines,case when test_case='paid_free_line' then 100 else 300 end);
    insert into public.receivables(id,order_id,total,paid,status)
      values(receipt_id,case_id,case when test_case='paid_free_line' then 100 else 300 end,
        case when test_case='paid_free_line' then 100 else 0 end,case when test_case='paid_free_line' then 'paid' else 'void' end);
    if test_case='paid_free_line' then
      insert into public.receivable_payments(id,receivable_id,amount)
        values('test-remove-payment-free-'||suffix,receipt_id,100);
    end if;
    result:=public.remove_order_line(case_id,1,saved_lines,'TEST billing evidence',manager_id);
    if (result->'order'->>'estimated_total')::numeric<>100
      or (test_case='paid_free_line' and (result->'receivable'->>'status'<>'paid' or (result->'receivable'->>'paid')::numeric<>100))
      or (test_case='void_request' and (result->'receivable' is distinct from 'null'::jsonb
        or not exists(select 1 from public.receivables r where r.id=receipt_id and r.status='void' and r.total=300 and r.paid=0)))
    then raise exception 'Paid zero-value correction or void history failed'; end if;
  end loop;

  -- Wholesale fractional kg/price sums retain their exact decimal value.
  case_id:='test-remove-decimal-'||suffix;
  saved_lines:=jsonb_build_array(
    jsonb_build_object('productId',product_kg,'qty',1.25,'unit','kg','price',100.125),
    jsonb_build_object('productId',product_pack,'qty',2,'unit','pack','price',12.375));
  insert into public.orders(id,type,customer_name,contact,lines,estimated_total)
    values(case_id,'wholesale','TEST ONLY',case_id||'@fixture.invalid',saved_lines,149.90625);
  result:=public.remove_order_line(case_id,1,saved_lines,'TEST exact decimal correction',manager_id);
  if (result->'order'->>'estimated_total')::numeric<>125.15625 or (result->'order'->>'total_kg')::numeric<>1.25
  then raise exception 'Retained fractional price or kg quantity was rounded'; end if;

  -- Known tier and quotation discounts are retained without re-tiering. VAT,
  -- promo and quote source rows are unchanged; direct prices use exact sums.
  insert into public.orders(id,type,customer_name,contact,lines,estimated_total,tier,vat,promo)
    values(tier_id,'wholesale','TEST ONLY',tier_id||'@fixture.invalid',payment_lines,270,'{"pct":10,"label":"TEST recorded tier"}',10,'{"code":"TEST","percent":25}');
  result:=public.remove_order_line(tier_id,1,payment_lines,'TEST retain tier agreement',manager_id);
  if (result->'order'->>'estimated_total')::numeric<>90
    or result->'order'->'tier' is distinct from '{"pct":10,"label":"TEST recorded tier"}'::jsonb
  then raise exception 'Recorded tier discount was recalculated or discarded'; end if;
  insert into public.trade_quotes(id,customer_name,contact,lines,subtotal,discount_percent,total,status)
    values(quote_id,'TEST ONLY',quote_order_id||'@fixture.invalid',payment_lines,300,20,240,'converted');
  insert into public.orders(id,type,customer_name,contact,lines,estimated_total,quote_id)
    values(quote_order_id,'wholesale','TEST ONLY',quote_order_id||'@fixture.invalid',payment_lines,240,quote_id);
  result:=public.remove_order_line(quote_order_id,1,payment_lines,'TEST retain quote agreement',manager_id);
  if (result->'order'->>'estimated_total')::numeric<>80
    or not exists(select 1 from public.trade_quotes q where q.id=quote_id and q.total=240 and q.lines=payment_lines and q.discount_percent=20)
  then raise exception 'Recorded quote discount or quotation source changed'; end if;

  unknown_lines:=jsonb_set(payment_lines,'{0,price}','null');
  insert into public.orders(id,type,customer_name,contact,lines,estimated_total)
    values(unknown_id,'wholesale','TEST ONLY',unknown_id||'@fixture.invalid',unknown_lines,null);
  result:=public.remove_order_line(unknown_id,1,unknown_lines,'TEST unpriced order',manager_id);
  if result->'order'->'estimated_total' is distinct from 'null'::jsonb then raise exception 'Unknown prices were invented'; end if;
  update public.orders set lines=payment_lines,estimated_total=250 where id=unknown_id;
  perform pg_temp.expect_line_removal_error(unknown_id,1,payment_lines,'TEST unknown adjustment',manager_id,'invalid_order_lines');
  update public.orders set lines=jsonb_set(payment_lines,'{0,qty}','0'),estimated_total=null where id=unknown_id;
  select lines into saved_lines from public.orders where id=unknown_id;
  perform pg_temp.expect_line_removal_error(unknown_id,1,saved_lines,'TEST malformed line',manager_id,'invalid_order_lines');

  -- Every ordinary stage supports this correction without advancing a shipment.
  foreach stage_value in array array['new_order','confirm_details','prepare_materials','production','packing','shipping','completed'] loop
    status_value:=case stage_value when 'shipping' then 'shipped' when 'completed' then 'completed' when 'new_order' then 'pending' else 'confirmed' end;
    case_id:='test-remove-stage-'||stage_value||'-'||suffix;
    insert into public.orders(id,type,customer_name,contact,lines,estimated_total,stage,status)
      values(case_id,'retail','TEST ONLY',case_id||'@fixture.invalid',payment_lines,300,stage_value,status_value);
    result:=public.remove_order_line(case_id,1,payment_lines,'TEST stage correction',manager_id);
    if result->'order'->>'stage'<>stage_value or result->'order'->>'status'<>status_value then raise exception 'Stage changed: %',stage_value; end if;
  end loop;
  if original_catalog is distinct from (select jsonb_agg(to_jsonb(p) order by p.id) from public.catalog_products p where id in (product_kg,product_pcs,product_pack))
  then raise exception 'Catalogue stock, price or source product changed'; end if;
end $$;

rollback;
select 'remove-order-line SQL checks passed; all synthetic fixtures rolled back' as result;
