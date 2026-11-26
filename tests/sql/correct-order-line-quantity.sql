-- Synthetic data only. Run on an isolated migrated PostgreSQL instance.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);

create function pg_temp.expect_quantity_error(
  order_key text, line_index integer, lines jsonb, quantity numeric,
  reason text, actor uuid, expected text
) returns void language plpgsql as $$
declare order_before jsonb; event_count bigint;
begin
  select to_jsonb(o) into order_before from public.orders o where id=order_key;
  select count(*) into event_count from public.order_events where order_id=order_key;
  begin
    perform public.correct_order_line_quantity(order_key,line_index,lines,quantity,reason,actor);
    raise exception 'Expected rejection %, but edit succeeded', expected;
  exception when others then
    if sqlerrm <> expected then raise; end if;
  end;
  if order_before is distinct from (select to_jsonb(o) from public.orders o where id=order_key)
    or event_count <> (select count(*) from public.order_events where order_id=order_key)
  then raise exception 'Rejected edit changed order or audit: %', expected; end if;
end
$$;

do $$
declare
  editor uuid := gen_random_uuid();
  helper uuid := gen_random_uuid();
  material_id uuid := gen_random_uuid();
  before_lines jsonb;
  current_lines jsonb;
  result jsonb;
  detail jsonb;
  original_checkout jsonb := '{"version":1,"tea_grams":20000,"total":1940000,"discount_percent":3,"free_shipping":true}';
  run_id uuid;
begin
  if has_function_privilege('anon','public.correct_order_line_quantity(text,integer,jsonb,numeric,text,uuid)','execute')
    or has_function_privilege('authenticated','public.correct_order_line_quantity(text,integer,jsonb,numeric,text,uuid)','execute')
    or not has_function_privilege('service_role','public.correct_order_line_quantity(text,integer,jsonb,numeric,text,uuid)','execute')
  then raise exception 'Quantity correction must be service-role-only'; end if;

  insert into auth.users(id,email) values (editor,'qty-editor@example.test'),(helper,'qty-helper@example.test');
  insert into public.staff_roles(user_id,role) values (editor,'manager'),(helper,'employee');
  insert into public.catalog_products(id,line,name,price,stock_ha_giang,stock_soc_son) values
    ('qty-test-tea','everyday','{"vi":"Fixture tea"}',777,90,10),
    ('qty-test-web','everyday','{"vi":"Fixture web tea"}',777,null,null);
  insert into public.supply_items(id,code,name,unit,unit_cost) values(material_id,'QTY-TEST','Quantity fixture','kg',11);
  insert into public.product_bom_components(product_id,variant_weight,supply_item_id,quantity_per_sale)
    values ('qty-test-tea','',material_id,2);

  before_lines := '[{"productId":"qty-test-tea","qty":5,"unit":"kg","price":100,"priceBeforeEdit":120},{"name":{"vi":"other line"},"qty":4,"unit":"pcs","price":50,"custom":"keep"}]';
  insert into public.orders(id,type,customer_name,contact,lines,estimated_total,total_kg,status,stage)
    values('qty-test-order','wholesale','Fixture','quantity@example.test',before_lines,700,5,'confirmed','packing');
  insert into public.inventory_reservations(id,order_id,product_id,variant_weight,quantity,status) values
    ('qty-test-hold','qty-test-order','qty-test-tea','',5,'active');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,3,'Fixture correction',helper,'manager_required');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,3,'bad',editor,'line_quantity_reason_required');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,0,'Fixture correction',editor,'invalid_line_quantity');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,'NaN','Fixture correction',editor,'invalid_line_quantity');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,1000000001,'Fixture correction',editor,'invalid_line_quantity');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,3.1234,'Fixture correction',editor,'invalid_line_quantity');
  perform pg_temp.expect_quantity_error('qty-test-order',1,before_lines,1.5,'Fixture correction',editor,'invalid_line_quantity');
  perform pg_temp.expect_quantity_error('qty-test-order',3,before_lines,3,'Fixture correction',editor,'invalid_line_index');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,5,'Fixture correction',editor,'line_quantity_unchanged');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,6,'Fixture correction',editor,'line_quantity_inventory_locked');
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,4.999,'Fixture correction',editor,'line_quantity_inventory_locked');

  result := public.correct_order_line_quantity('qty-test-order',0,before_lines,3.25,'Fixture correction',editor);
  current_lines := result->'order'->'lines';
  if current_lines is distinct from jsonb_set(before_lines,'{0,qty}','3.25')
    or (result->'order'->>'total_kg')::numeric<>3.25
    or (result->'order'->>'estimated_total')::numeric<>525
    or result->'order'->>'stage'<>'packing'
    or not exists(select 1 from public.inventory_reservations where id='qty-test-hold' and quantity=3.25 and status='active')
    or not exists(select 1 from public.catalog_products where id='qty-test-tea' and stock_ha_giang=90 and stock_soc_son=10)
    or not exists(select 1 from public.order_costs where order_id='qty-test-order' and source_type='bom' and quantity=6.5)
  then raise exception 'Order correction, reservation delta and BOM rescaling did not commit together'; end if;
  select message::jsonb into detail from public.order_events where order_id='qty-test-order' and kind='line_quantity_corrected';
  if detail->'before_line' is distinct from before_lines->0
    or detail->'after_line' is distinct from current_lines->0
    or (detail->>'released_reservation_quantity')::numeric<>1.75
    or detail->>'reason'<>'Fixture correction'
    or detail->>'actor_id'<>editor::text
  then raise exception 'Quantity audit did not retain its exact before and after snapshots'; end if;
  perform pg_temp.expect_quantity_error('qty-test-order',0,before_lines,3,'Fixture correction',editor,'order_lines_changed');

  insert into public.receivables(id,order_id,invoice_number,total,paid,status)
    values('qty-test-receivable','qty-test-order','QTY-FIXTURE',525,0,'open');
  perform pg_temp.expect_quantity_error('qty-test-order',1,current_lines,3,'Fixture correction',editor,'line_quantity_payment_locked');
  update public.receivables set status='void' where id='qty-test-receivable';
  result := public.correct_order_line_quantity('qty-test-order',1,current_lines,3,'Cancelled payment before correction',editor);
  if (result->'order'->>'estimated_total')::numeric <> 475
    or not exists (select 1 from public.receivables where id='qty-test-receivable' and status='void' and total=525)
  then raise exception 'Voided request should stay unchanged when a new total is saved'; end if;
  current_lines := result->'order'->'lines';

  insert into public.b2b_documents(order_id,seller_id,kind,status,file_path,file_name,invoice_number,invoice_date,created_by,completed_by,completed_at)
    values('qty-test-order','hoang-long','vat_invoice','complete','qty-test-invoice','test.pdf','TEST-123',current_date,editor,editor,now());
  perform pg_temp.expect_quantity_error('qty-test-order',1,current_lines,2,'Fixture correction',editor,'line_quantity_documents_locked');

  before_lines := '[{"productId":"qty-test-web","qty":20,"unit":"kg","price":97000,"listPrice":100000,"total":1940000,"grossTotal":2000000,"discountAmount":60000,"teaGrams":1000,"volumeEligible":true}]';
  insert into public.orders(id,type,customer_name,contact,lines,estimated_total,retail_pricing,total_kg,total_items,status,stage)
    values('qty-test-retail','retail','Fixture','online@example.test',before_lines,1940000,original_checkout,20,20,'confirmed','packing');
  perform pg_temp.expect_quantity_error('qty-test-retail',0,before_lines,19.5,'Fixture correction',editor,'invalid_line_quantity');
  result := public.correct_order_line_quantity('qty-test-retail',0,before_lines,19,'Keep the agreed unit price',editor);
  if (result->'order'->>'estimated_total')::numeric<>1843000 or (result->'order'->>'total_kg')::numeric<>19
    or (result->'order'->>'total_items')::numeric<>19 or result->'order'->'retail_pricing' is distinct from original_checkout
    or result->'order'->'lines'->0->>'price' <> '97000'
    or (result->'order'->'lines'->0->>'total')::numeric<>1843000
  then raise exception 'Original online terms were not preserved beside the updated price and quantities'; end if;
  update public.catalog_products set stock_ha_giang=25 where id='qty-test-web';
  perform pg_temp.expect_quantity_error('qty-test-retail',0,result->'order'->'lines',18,'Fixture correction',editor,'line_quantity_inventory_locked');

  before_lines := '[{"quantity":2,"unit":"kg","unitPrice":100},{"qty":1,"unit":"g","price":25}]';
  insert into public.orders(id,type,customer_name,contact,lines,estimated_total,tier,status,stage) values
    ('qty-test-legacy','wholesale','Fixture','legacy@example.test',before_lines,203,'{"pct":10}','pending','new_order'),
    ('qty-test-unknown','wholesale','Fixture','unknown@example.test',before_lines,200,null,'pending','new_order'),
    ('qty-test-shipped','wholesale','Fixture','shipped@example.test',before_lines,225,null,'shipped','packing'),
    ('qty-test-procedure','wholesale','Fixture','procedure@example.test',before_lines,225,null,'confirmed','packing');
  result := public.correct_order_line_quantity('qty-test-legacy',0,before_lines,3,'Fixture correction',editor);
  if (result->'order'->>'estimated_total')::numeric<>293
    or (result->'order'->'lines'->0->>'quantity')::numeric<>3
  then raise exception 'Legacy spelling and recorded order discount were not retained'; end if;
  perform pg_temp.expect_quantity_error('qty-test-unknown',0,before_lines,3,'Fixture correction',editor,'invalid_order_lines');
  perform pg_temp.expect_quantity_error('qty-test-shipped',0,before_lines,3,'Fixture correction',editor,'line_quantity_stage_locked');

  insert into public.procedure_runs(order_id,template_key) values('qty-test-procedure','domestic_b2b') returning id into run_id;
  insert into public.procedure_items(run_id,stage_key,item_key,position,title,status)
    values(run_id,'loading_dispatch','loaded_quantity',1,'Fixture checked quantity','verified');
  perform pg_temp.expect_quantity_error('qty-test-procedure',0,before_lines,3,'Fixture correction',editor,'line_quantity_procedure_locked');
end $$;
rollback;
