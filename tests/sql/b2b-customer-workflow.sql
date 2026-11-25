\o /dev/null
create function public.b2b_test_assert(ok boolean,label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception '%',label; end if;
end;
$$;
create function public.b2b_test_reject(statement text,expected text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(expected in sqlerrm)>0 then return; end if;
    raise;
  end;
  raise exception 'Expected rejection: %',expected;
end;
$$;

select public.b2b_test_assert((select count(*)=1 and min(order_id)='old-open-wholesale' from public.b2b_order_workflows),'migration initializes open wholesale only');
select public.b2b_test_assert((select count(*)=2 from public.b2b_selling_entities where details='{}'),'sellers seeded without private details');
select public.b2b_test_assert((select not public from storage.buckets where id='b2b-private-documents'),'private bucket');

update public.trade_opportunities set is_b2b=true where id in ('customer-one','customer-two');
select public.b2b_test_assert((select opportunity_id='customer-one' from public.b2b_order_workflows where order_id='old-open-retail'),'classification activates existing order');
insert into public.orders(id,type,status,stage,contact,quote_id,partner_account_id) values
  ('new-retail','retail','pending','confirmed','+84 903 000 001',null,null),
  ('order-one','wholesale','pending','confirmed','+84 903 000 001',null,null),
  ('ambiguous','wholesale','pending','confirmed','0903000002',null,null),
  ('conflict','wholesale','pending','confirmed','0903000001','quote-one','account-two'),
  ('unclassified','retail','pending','confirmed','0903000003',null,null),
  ('cancelled','wholesale','cancelled','confirmed','0903000001',null,null),
  ('rejected','wholesale','rejected','confirmed','0903000001',null,null);
select public.b2b_test_assert(
  (select count(*)=2 from public.b2b_order_workflows where order_id in ('new-retail','order-one') and opportunity_id='customer-one'),
  'new wholesale and classified retail initialize with normalized unique ownership');
select public.b2b_test_assert(
  (select count(*)=2 from public.b2b_order_workflows where order_id in ('ambiguous','conflict') and opportunity_id is null),
  'conflicting ownership stays unlinked');
select public.b2b_test_assert(
  not exists(select 1 from public.b2b_order_workflows where order_id in ('unclassified','cancelled','rejected')),
  'unclassified retail and cancelled orders do not initialize');

set role service_role;
select public.b2b_test_reject(
  $$select public.b2b_update_order_workflow('order-one','00000000-0000-4000-8000-000000000003',null,'green-hill',8)$$,
  'b2b_manager_required');
select public.b2b_test_assert(
  (public.b2b_update_order_workflow('unclassified','00000000-0000-4000-8000-000000000001','customer-one','green-hill',8)).opportunity_id='customer-one',
  'explicit link initializes a classified order');
select public.b2b_test_assert(
  (public.b2b_update_order_workflow('old-complete-wholesale','00000000-0000-4000-8000-000000000001',null,'green-hill',8)).order_id='old-complete-wholesale',
  'historical orders can be enabled explicitly');
select public.b2b_test_assert(
  (public.b2b_update_order_workflow('order-one','00000000-0000-4000-8000-000000000001',null,'green-hill',8)).vat_percent=8,
  'explicit transaction VAT rate persists');
select public.b2b_update_order_workflow('ambiguous','00000000-0000-4000-8000-000000000001',null,'green-hill',8);

insert into public.b2b_documents(opportunity_id,order_id,seller_id,kind,created_by,draft) values
  ('customer-one','unclassified','green-hill','sales_contract','00000000-0000-4000-8000-000000000001','{"reference":"old customer"}');
select public.b2b_test_assert(
  (public.b2b_update_order_workflow('unclassified','00000000-0000-4000-8000-000000000001','customer-two',null,null)).opportunity_id='customer-two',
  'a pending order can change explicit owners before document completion');
insert into public.b2b_documents(opportunity_id,order_id,seller_id,kind,created_by,draft) values
  ('customer-two','unclassified','green-hill','sales_contract','00000000-0000-4000-8000-000000000001','{"reference":"new customer"}');
select public.b2b_test_assert(
  (select count(*)=2 from public.b2b_documents where order_id='unclassified' and kind='sales_contract'),
  'the reassignment preserves the previous draft and allows a clean new draft');
select public.b2b_test_reject(
  $$insert into public.b2b_documents(opportunity_id,order_id,seller_id,kind,created_by) values
    ('customer-two','unclassified','green-hill','sales_contract','00000000-0000-4000-8000-000000000001')$$,
  'b2b_documents_order_draft_idx');

insert into public.b2b_documents(id,opportunity_id,order_id,seller_id,kind,created_by) values
  ('10000000-0000-4000-8000-000000000001','customer-one',null,'green-hill','framework','00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002','customer-one','order-one','green-hill','sales_contract','00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003','customer-one','order-one','green-hill','delivery_record','00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000004','customer-one','order-one','green-hill','vat_invoice','00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000005','customer-one','order-one','hoang-long','sales_contract','00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000006',null,'ambiguous','green-hill','sales_contract','00000000-0000-4000-8000-000000000001');
select public.b2b_test_reject(
  $$update public.b2b_documents set status='complete' where id='10000000-0000-4000-8000-000000000002'$$,
  'b2b_use_document_completion');
select public.b2b_test_reject(
  $$select public.b2b_complete_document('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000000.pdf','signed.pdf')$$,
  'b2b_document_file_missing');
insert into storage.objects(bucket_id,name)
  select 'b2b-private-documents', id||'/00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000000.pdf'
  from public.b2b_documents;
select public.b2b_test_reject(
  $$select public.b2b_complete_document('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005/00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000000.pdf','signed.pdf')$$,
  'b2b_document_order_mismatch');
select public.b2b_test_reject(
  $$select public.b2b_complete_document('10000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000006/00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000000.pdf','signed.pdf')$$,
  'b2b_customer_not_classified');
select public.b2b_test_reject(
  $$select public.b2b_complete_document('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004/00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000000.pdf','signed.pdf')$$,
  'b2b_issued_invoice_required');

do $$
declare doc public.b2b_documents; file_path text; actor uuid := '00000000-0000-4000-8000-000000000001';
begin
  for doc in select * from public.b2b_documents where seller_id='green-hill'
    and (kind='framework' or order_id='order-one') order by id loop
    file_path := doc.id||'/'||actor||'/20000000-0000-4000-8000-000000000000.pdf';
    perform public.b2b_complete_document(
      doc.id, actor, file_path,'signed.pdf',
      p_valid_from => (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1,
      p_valid_until => (now() at time zone 'Asia/Ho_Chi_Minh')::date,
      p_invoice_number => 'TEST-ISSUED', p_invoice_date => (now() at time zone 'Asia/Ho_Chi_Minh')::date,
      p_document_ref => 'TEST-REF'
    );
    perform public.b2b_test_assert(
      (public.b2b_complete_document(doc.id,actor,file_path,'signed.pdf')).status='complete',
      'one object completion is retry-safe');
  end loop;
end;
$$;

select public.b2b_test_assert(
  (select framework_id='10000000-0000-4000-8000-000000000001' from public.b2b_order_workflows where order_id='order-one'),
  'the completed workflow pins the reusable framework');
select public.b2b_test_reject(
  $$update public.b2b_documents set draft='{"overwritten":true}' where id='10000000-0000-4000-8000-000000000002'$$,
  'b2b_completed_document_immutable');
select public.b2b_test_reject(
  $$select public.b2b_update_order_workflow('order-one','00000000-0000-4000-8000-000000000001',null,'hoang-long',null)$$,
  'b2b_order_identity_locked');
select public.b2b_test_reject(
  $$select public.b2b_update_order_workflow('order-one','00000000-0000-4000-8000-000000000001','customer-two',null,null)$$,
  'b2b_order_identity_locked');
select public.b2b_test_reject(
  $$select public.b2b_update_order_workflow('order-one','00000000-0000-4000-8000-000000000001',null,null,10)$$,
  'b2b_issued_invoice_locked');

reset role;
delete from public.orders where id='order-one';
select public.b2b_test_assert(
  (select count(*)=3 from public.b2b_documents where order_id='order-one' and status='complete'),
  'recycling leaves signed documents intact');
insert into public.orders(id,type,status,stage,contact) values ('order-one','wholesale','pending','confirmed','+84 903 000 001');
select public.b2b_test_assert(
  (select opportunity_id='customer-one' and seller_id='green-hill' and vat_percent=8 and framework_id is not null
    from public.b2b_order_workflows where order_id='order-one'),
  'restoring an order reattaches checklist, sellers, VAT and pinned framework');

set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
select public.b2b_test_assert((select count(*)=0 from public.b2b_documents),'non-manager cannot see documents');
select public.b2b_test_assert((select count(*)=0 from public.b2b_selling_entities),'non-manager cannot see selling details');
select public.b2b_test_assert((select count(*)=0 from storage.objects),'authenticated users cannot list private files');
select public.b2b_test_reject(
  $$select public.b2b_update_order_workflow('order-one','00000000-0000-4000-8000-000000000001')$$,
  'permission denied');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
select public.b2b_test_assert((select count(*)=0 from public.b2b_documents),'unconfirmed manager cannot see documents');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000004';
select public.b2b_test_assert((select count(*)=0 from public.b2b_documents),'orders-only manager cannot read the documents API');
select public.b2b_test_assert((select count(*)=0 from public.b2b_selling_entities),'orders-only manager cannot bypass document workspace seller permissions');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select public.b2b_test_assert((select count(*)=8 from public.b2b_documents),'verified manager can see documents');
select public.b2b_test_reject(
  $$update public.b2b_documents set draft='{}' where status='draft'$$,
  'permission denied');
reset role;
set role anon;
select public.b2b_test_reject($$select * from public.b2b_documents$$,'permission denied');
select public.b2b_test_assert((select count(*)=0 from storage.objects),'anonymous users cannot access private files');
reset role;
\o
\echo B2B workflow PostgreSQL checks passed.
