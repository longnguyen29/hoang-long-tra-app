-- Migration 0081 required. Synthetic local records only; no messaging/network.
-- A selling-unit correction labels the existing agreement, never converts it.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.role','service_role',true);

create function pg_temp.unit_operating_state(p_id text)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'receivables',(select jsonb_agg(to_jsonb(r) order by r.id) from public.receivables r where r.order_id=p_id),
    'payments',(select jsonb_agg(to_jsonb(p) order by p.id) from public.receivable_payments p
      join public.receivables r on r.id=p.receivable_id where r.order_id=p_id),
    'reservations',(select jsonb_agg(to_jsonb(r) order by r.id) from public.inventory_reservations r where r.order_id=p_id),
    'allocations',(select jsonb_agg(to_jsonb(a) order by a.id) from public.order_batch_allocations a where a.order_id=p_id),
    'costs',(select jsonb_agg(to_jsonb(c) order by c.id) from public.order_costs c where c.order_id=p_id),
    'runs',(select jsonb_agg(to_jsonb(r) order by r.id) from public.procedure_runs r where r.order_id=p_id),
    'items',(select jsonb_agg(to_jsonb(i) order by i.id) from public.procedure_items i
      join public.procedure_runs r on r.id=i.run_id where r.order_id=p_id),
    'blockers',(select jsonb_agg(to_jsonb(b) order by b.id) from public.procedure_blockers b
      join public.procedure_runs r on r.id=b.run_id where r.order_id=p_id),
    'evidence',(select jsonb_agg(to_jsonb(e) order by e.id) from public.procedure_evidence e
      join public.procedure_runs r on r.id=e.run_id where r.order_id=p_id),
    'procedure_events',(select jsonb_agg(to_jsonb(e) order by e.id) from public.procedure_events e
      join public.procedure_runs r on r.id=e.run_id where r.order_id=p_id)
  )
$$;

create function pg_temp.expect_unit_error(
  p_id text,p_index integer,p_lines jsonb,p_unit text,p_reason text,p_actor uuid,p_error text
) returns void language plpgsql as $$
declare before_order jsonb; before_operations jsonb; before_events bigint;
begin
  select to_jsonb(o) into before_order from public.orders o where id=p_id;
  before_operations:=pg_temp.unit_operating_state(p_id);
  select count(*) into before_events from public.order_events where order_id=p_id;
  begin
    perform public.correct_order_line_unit(p_id,p_index,p_lines,p_unit,p_reason,p_actor);
    raise exception 'Expected %, but unit correction succeeded',p_error;
  exception when others then
    if sqlerrm<>p_error then raise; end if;
  end;
  if before_order is distinct from (select to_jsonb(o) from public.orders o where id=p_id)
    or before_operations is distinct from pg_temp.unit_operating_state(p_id)
    or before_events<>(select count(*) from public.order_events where order_id=p_id)
  then raise exception 'Rejected unit correction mutated persisted data: %',p_error; end if;
end $$;

do $$
#variable_conflict use_variable
declare
  suffix text:=replace(gen_random_uuid()::text,'-','');
  manager_id uuid:=gen_random_uuid(); employee_id uuid:=gen_random_uuid();
  product_id text:='test-unit-product-'||suffix;
  order_id text:='test-unit-order-'||suffix;
  receipt_id text:='test-unit-receipt-'||suffix;
  batch_id text:='test-unit-batch-'||suffix;
  material_id uuid:=gen_random_uuid();
  run_id uuid:=gen_random_uuid(); item_id uuid:=gen_random_uuid();
  lines jsonb; saved_lines jsonb; before_order jsonb; before_operations jsonb;
  before_stock jsonb; after_order jsonb; result jsonb; audit jsonb;
  stage_value text; status_value text; type_value text; unit_value text; case_id text;
begin
  if to_regprocedure('public.correct_order_line_unit(text,integer,jsonb,text,text,uuid)') is null
  then raise exception 'Migration 0081 required'; end if;
  if has_function_privilege('anon','public.correct_order_line_unit(text,integer,jsonb,text,text,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.correct_order_line_unit(text,integer,jsonb,text,text,uuid)','EXECUTE')
    or not has_function_privilege('service_role','public.correct_order_line_unit(text,integer,jsonb,text,text,uuid)','EXECUTE')
  then raise exception 'Unit correction must be service-role-only'; end if;
  insert into auth.users(id,email) values
    (manager_id,'test-unit-manager-'||suffix||'@fixture.invalid'),
    (employee_id,'test-unit-employee-'||suffix||'@fixture.invalid');
  insert into public.staff_roles(user_id,role) values(manager_id,'manager'),(employee_id,'employee');
  perform set_config('request.jwt.claim.sub',manager_id::text,true);
  insert into public.catalog_products(id,line,name,price,stock_ha_giang,stock_soc_son)
    values(product_id,'reserve','{"vi":"TEST Phổ Nhĩ Viên"}',999999,100,20);
  insert into public.supply_items(id,code,name,unit,unit_cost)
    values(material_id,'UT-'||suffix,'TEST unit-only BOM','unit',20);
  insert into public.product_bom_components(product_id,variant_weight,supply_item_id,quantity_per_sale)
    values(product_id,'',material_id,1);
  lines:=jsonb_build_array(
    jsonb_build_object('productId',product_id,'name',jsonb_build_object('vi','TEST Phổ Nhĩ Viên'),
      'qty',12,'unit','kg','price',50000,'customEvidence','preserve this snapshot'),
    jsonb_build_object('name','TEST retained tea','qty',2.5,'unit','kg','price',100000)
  );
  insert into public.orders(id,type,customer_name,contact,lines,total_kg,total_items,estimated_total,vat,promo,tier,stage,status)
    values(order_id,'wholesale','TEST ONLY',order_id||'@fixture.invalid',lines,14.5,null,850000,
      10,'{"code":"TEST","percent":20}','{"pct":10}','shipping','shipped');
  insert into public.receivables(id,order_id,total,paid,status,invoice_number)
    values(receipt_id,order_id,850000,850000,'paid','TEST paid agreement');
  insert into public.receivable_payments(id,receivable_id,amount,created_by,reference)
    values('test-unit-payment-'||suffix,receipt_id,850000,manager_id::text,'TEST immutable payment');
  insert into public.inventory_reservations(id,order_id,product_id,quantity,status) values
    ('test-unit-active-'||suffix,order_id,product_id,12,'active'),
    ('test-unit-fulfilled-'||suffix,order_id,product_id,1,'fulfilled');
  insert into public.tea_batches(id,code,product_id,available_kg,reserved_kg,status)
    values(batch_id,'UT-'||suffix,product_id,100,1,'released');
  insert into public.order_batch_allocations(id,order_id,batch_id,product_id,quantity_kg,created_by)
    values('test-unit-allocation-'||suffix,order_id,batch_id,product_id,1,manager_id::text);
  insert into public.order_costs(order_id,category,description,quantity,unit_cost,payment_status,created_by)
    values(order_id,'shipping','TEST actual freight',1,50000,'paid',manager_id);
  -- The actual BOM trigger has created a planned estimate. Make its recorded
  -- unit cost distinct from today's source so even a redundant resync is caught.
  update public.order_costs set unit_cost=777,note='TEST preserve existing planned estimate'
    where order_costs.order_id=order_id and source_type='bom';
  if not exists(select 1 from public.order_costs c where c.order_id=order_id and c.source_type='bom')
  then raise exception 'Real BOM trigger did not create the test estimate'; end if;
  insert into public.procedure_runs(id,order_id,template_key,created_by)
    values(run_id,order_id,'domestic_b2b',manager_id);
  insert into public.procedure_items(id,run_id,stage_key,item_key,position,title,critical,status)
    values(item_id,run_id,'vehicle_inspection','TEST-unit-proof',1,'TEST preflight',true,'blocked');
  insert into public.procedure_blockers(run_id,item_id,stop_work,problem,created_by)
    values(run_id,item_id,true,'TEST STOP remains open',manager_id);
  insert into public.procedure_evidence(run_id,item_id,storage_path,archive_path,file_name,content_type,expected_size,status,uploaded_by)
    values(run_id,item_id,'test-unit/'||suffix,'test-unit/archive/'||suffix,'TEST.jpg','image/jpeg',1,'ready',manager_id);
  insert into public.procedure_events(run_id,item_id,actor_id,action,detail)
    values(run_id,item_id,manager_id,'test_preserved','TEST historical STOP evidence');
  select jsonb_build_object('product',(select to_jsonb(p) from public.catalog_products p where id=product_id),
    'batch',(select to_jsonb(b) from public.tea_batches b where id=batch_id)) into before_stock;

  perform pg_temp.expect_unit_error(order_id,0,lines,'viên','TEST correct sale unit',employee_id,'manager_required');
  perform pg_temp.expect_unit_error(order_id,0,lines,'viên','bad',manager_id,'line_unit_reason_required');
  perform pg_temp.expect_unit_error(order_id,0,lines,'viên',repeat('x',1001),manager_id,'line_unit_reason_required');
  perform pg_temp.expect_unit_error(order_id,-1,lines,'viên','TEST correct sale unit',manager_id,'invalid_line_index');
  perform pg_temp.expect_unit_error(order_id,2,lines,'viên','TEST correct sale unit',manager_id,'invalid_line_index');
  perform pg_temp.expect_unit_error(order_id,null,lines,'viên','TEST correct sale unit',manager_id,'invalid_line_index');
  perform pg_temp.expect_unit_error(order_id,0,null,'viên','TEST correct sale unit',manager_id,'order_lines_changed');
  perform pg_temp.expect_unit_error(order_id,0,jsonb_set(lines,'{0,price}','1'),'viên','TEST correct sale unit',manager_id,'order_lines_changed');
  perform pg_temp.expect_unit_error(order_id,0,lines,'litre','TEST correct sale unit',manager_id,'invalid_line_unit');
  perform pg_temp.expect_unit_error(order_id,0,lines,null,'TEST correct sale unit',manager_id,'invalid_line_unit');
  perform pg_temp.expect_unit_error(order_id,0,lines,' kg ','TEST correct sale unit',manager_id,'line_unit_unchanged');
  perform pg_temp.expect_unit_error(order_id,1,lines,'viên','TEST fractional pieces',manager_id,'invalid_line_quantity');
  perform pg_temp.expect_unit_error('test-unit-absent-'||suffix,0,lines,'viên','TEST correct sale unit',manager_id,'order_not_found');

  select to_jsonb(o) into before_order from public.orders o where id=order_id;
  before_operations:=pg_temp.unit_operating_state(order_id);
  result:=public.correct_order_line_unit(order_id,0,lines,' viên ','TEST correct sale unit',manager_id);
  after_order:=result->'order';
  if after_order is distinct from jsonb_set(jsonb_set(before_order,'{lines,0,unit}','"viên"'),'{total_kg}','2.5')
    or after_order is distinct from (select to_jsonb(o) from public.orders o where id=order_id)
    or result->'previous_line' is distinct from lines->0
    or result->'corrected_line' is distinct from jsonb_set(lines->0,'{unit}','"viên"')
    or before_operations is distinct from pg_temp.unit_operating_state(order_id)
    or before_stock is distinct from jsonb_build_object('product',(select to_jsonb(p) from public.catalog_products p where id=product_id),
      'batch',(select to_jsonb(b) from public.tea_batches b where id=batch_id))
  then raise exception 'Unit-only correction changed price, quantity, agreement, payment, stage, stock, costs or procedure'; end if;
  select message::jsonb into audit from public.order_events where order_events.order_id=order_id and kind='line_unit_corrected';
  if audit is null or (select count(*) from public.order_events e where e.order_id=order_id and kind='line_unit_corrected')<>1
    or audit->>'reason'<>'TEST correct sale unit' or (audit->>'line_index')::integer<>0
    or audit->'before_line' is distinct from lines->0 or audit->'after_line' is distinct from after_order->'lines'->0
    or audit->>'actor_id'<>manager_id::text or audit->>'stage'<>'shipping' or audit->>'status'<>'shipped'
    or (audit->'before'->>'total_kg')::numeric<>14.5 or (audit->'after'->>'total_kg')::numeric<>2.5
  then raise exception 'Audited unit correction missing actor, reason or complete before/after snapshots'; end if;
  perform pg_temp.expect_unit_error(order_id,0,lines,'bánh','TEST stale correction',manager_id,'order_lines_changed');

  -- Single-line orders are valid, and historical/completed stages are retained.
  foreach type_value in array array['retail','wholesale'] loop
    foreach stage_value in array array['new_order','confirm_details','prepare_materials','production','packing','shipping','completed'] loop
      status_value:=case stage_value when 'shipping' then 'shipped' when 'completed' then 'completed' when 'new_order' then 'pending' else 'confirmed' end;
      case_id:='test-unit-'||type_value||'-'||stage_value||'-'||suffix;
      saved_lines:=jsonb_build_array(jsonb_build_object('name','TEST one line','qty',12,'unit','kg','price',50000));
      insert into public.orders(id,type,customer_name,contact,lines,total_kg,total_items,estimated_total,stage,status)
        values(case_id,type_value,'TEST ONLY',case_id||'@fixture.invalid',saved_lines,12,
          case when type_value='retail' then 12 else null end,600000,stage_value,status_value);
      select to_jsonb(o) into before_order from public.orders o where id=case_id;
      result:=public.correct_order_line_unit(case_id,0,saved_lines,'viên','TEST stage correction',manager_id);
      after_order:=jsonb_set(before_order,'{lines,0,unit}','"viên"');
      if type_value='wholesale' then after_order:=jsonb_set(after_order,'{total_kg}','0'); end if;
      if result->'order' is distinct from after_order then raise exception 'Single-line stage/type correction changed agreement: % %',type_value,stage_value; end if;
    end loop;
  end loop;
  -- Every supported unit can label an integral quantity; no automatic mass conversion.
  foreach unit_value in array array['kg','g','pcs','pack','viên','bánh','hộp','chai','cái','ton','tons','t'] loop
    select o.lines into saved_lines from public.orders o where id=case_id;
    result:=public.correct_order_line_unit(case_id,0,saved_lines,unit_value,'TEST supported unit',manager_id);
    if result->'order'->'lines'->0 is distinct from jsonb_set(saved_lines->0,'{unit}',to_jsonb(unit_value))
      or (result->'order'->>'estimated_total')::numeric<>600000
    then raise exception 'Supported unit converted amount or quantity: %',unit_value; end if;
  end loop;
  saved_lines:='[{"name":"TEST mass","qty":1.5,"unit":"g","price":100}]';
  case_id:='test-unit-fraction-'||suffix;
  insert into public.orders(id,type,customer_name,contact,lines,total_kg,estimated_total)
    values(case_id,'wholesale','TEST ONLY',case_id||'@fixture.invalid',saved_lines,0,150);
  result:=public.correct_order_line_unit(case_id,0,saved_lines,'kg','TEST mass label',manager_id);
  if (result->'order'->>'total_kg')::numeric<>1.5 or (result->'order'->'lines'->0->>'qty')::numeric<>1.5
    or (result->'order'->>'estimated_total')::numeric<>150
  then raise exception 'Mass correction converted stored quantity or price'; end if;
  perform pg_temp.expect_unit_error(case_id,0,result->'order'->'lines','pcs','TEST fractional pack',manager_id,'invalid_line_quantity');
  -- Older lines can use quantity/unitPrice and omit their sale unit entirely.
  saved_lines:='[{"name":"TEST legacy","quantity":12,"unitPrice":50000}]';
  case_id:='test-unit-legacy-'||suffix;
  insert into public.orders(id,type,customer_name,contact,lines,total_kg,estimated_total)
    values(case_id,'retail','TEST ONLY',case_id||'@fixture.invalid',saved_lines,null,600000);
  select to_jsonb(o) into before_order from public.orders o where id=case_id;
  result:=public.correct_order_line_unit(case_id,0,saved_lines,'viên','TEST legacy label',manager_id);
  if result->'order' is distinct from jsonb_set(before_order,'{lines}',jsonb_build_array(jsonb_set(saved_lines->0,'{unit}','"viên"')))
  then raise exception 'Legacy quantity/unitPrice or unknown mass changed'; end if;
end $$;

rollback;
select 'correct-order-line-unit SQL checks passed; all synthetic fixtures rolled back' as result;
