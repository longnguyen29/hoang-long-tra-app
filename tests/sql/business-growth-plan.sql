-- Synthetic scorecard fixture. Run on an isolated migrated PostgreSQL database.
begin;
insert into public.orders(id,type,customer_name,contact,estimated_total,ts,status,stage,total_kg) values
 ('growth-1','wholesale','Synthetic','0900000001',900,'2025-09-01T17:00:00Z','completed','completed',2),
 ('growth-2','wholesale','Synthetic','+84900000001',500,'2025-10-01T17:00:00Z','completed','completed',3),
 ('growth-3','wholesale','Synthetic','0900000002',600,'2025-10-01T18:00:00Z','pending','new_order',4);
insert into public.receivables(id,order_id,total,paid,status) values
 ('growth-r1','growth-1',900,900,'paid'),('growth-r2','growth-2',500,500,'paid'),('growth-r3','growth-3',600,600,'paid');
insert into public.receivable_payments(id,receivable_id,amount,paid_at) values
 ('growth-p1','growth-r1',900,'2025-09-03T01:00:00Z'),
 ('growth-p2','growth-r2',500,'2025-10-03T01:00:00Z'),
 ('growth-p3','growth-r3',300,'2025-10-15T01:00:00Z'),
 ('growth-p4','growth-r3',300,'2025-11-03T01:00:00Z');
set local role service_role;
do $$
declare v jsonb := public.business_growth_snapshot('2025-10-01');
begin
  if v->0->>'cashCollected' is distinct from '800.00' or v->0->>'repeatPaidBuyers' is distinct from '1'
    or v->0->>'firstPaidBuyers' is distinct from '0' or v->1->>'firstPaidBuyers' is distinct from '1'
    or v->0->>'wholesaleOrders' is distinct from '2' or v->0->>'wholesaleKg' is distinct from '7'
    or v->0->>'financialInputs' is not null then
    raise exception 'Unexpected scorecard: %',v;
  end if;
  if has_function_privilege('authenticated','public.business_growth_snapshot(date)','execute')
     or has_table_privilege('authenticated','public.business_growth_plans','select')
     or not has_table_privilege('service_role','public.business_growth_plans','insert')
  then raise exception 'Unsafe growth plan privileges'; end if;
end $$;
rollback;
