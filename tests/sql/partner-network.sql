-- Run only in a disposable database with partner-network-fixture.sql.
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
select public.test_error($q$select public.partner_network_apply('{"business_name":"A","contact_name":"A","phone":"0901000001","region":"Hà Nội","partner_type":"consultant","consent":true}')$q$,'verified_email_required');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.test_error($q$select public.partner_network_apply('{"business_name":"A","contact_name":"A","phone":"0901000001","region":"Hà Nội","partner_type":"consultant","consent":true,"status":"approved"}')$q$,'invalid_application');
select set_config('test.partner_a',public.partner_network_apply('{"business_name":"Test Partner A","contact_name":"A","phone":"0901000001","region":"Hà Nội","partner_type":"consultant","consent":true}')::text,false);
select public.test_assert(public.partner_network_snapshot()->'partner'->>'status'='pending','approval stays separate from application');
select public.test_assert(public.partner_network_snapshot()->'partner'->>'code' is null,'no partner code before approval');
select public.test_error($q$select public.partner_network_admin_snapshot()$q$,'manager_required');
select public.test_error($q$select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000101","business_name":"Cafe A","contact_name":"Owner","contact":"0902000001","location":"Hà Nội","product_interest":"Hồng trà","contact_authorized":true}')$q$,'partner_not_approved');
select public.test_error($q$update public.partner_network_partners set status='approved'$q$,'permission denied');
select public.test_assert((select count(*) from public.partner_network_partners)=0,'partner cannot directly read membership table');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
select set_config('test.partner_b',public.partner_network_apply('{"business_name":"Test Partner B","contact_name":"B","phone":"0901000002","region":"Hồ Chí Minh","partner_type":"sales_rep","consent":true}')::text,false);
select public.test_assert(public.partner_network_snapshot()->'partner'->>'business_name'='Test Partner B','own snapshot only');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.partner_network_manage_partner(current_setting('test.partner_a')::uuid,'approve','{"default_rate_percent":10,"repeat_rate_percent":4,"repeat_order_limit":1,"terms":"Test terms"}');
select public.partner_network_manage_partner(current_setting('test.partner_b')::uuid,'approve','{}');
select public.test_assert((select default_rate_percent is null and first_order_rate_percent is null and repeat_order_limit=0 from public.partner_network_partners where id=current_setting('test.partner_b')::uuid),'no hard-coded rate or unlimited repeat entitlement');
select set_config('test.partner_code',(public.partner_network_admin_snapshot()->'partners'->1->>'code'),false);
select public.test_assert((select code is not null and default_rate_percent=10 from public.partner_network_partners where id=current_setting('test.partner_a')::uuid),'approval assigns code and agreed rate');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000101","business_name":"Cafe A","contact_name":"Owner","contact":"0902000001","location":"Hà Nội","product_interest":"Hồng trà","expected_volume_kg":20,"contact_authorized":true}');
select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000101","business_name":"Cafe A","contact_name":"Owner","contact":"0902000001","location":"Hà Nội","product_interest":"Hồng trà","expected_volume_kg":20,"contact_authorized":true}');
select public.test_assert(jsonb_array_length(public.partner_network_snapshot()->'referrals')=1,'idempotent request exactly once');
select public.test_error($q$select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000101","business_name":"Changed","contact_name":"Owner","contact":"0902000001","location":"Hà Nội","product_interest":"Hồng trà","contact_authorized":true}')$q$,'referral_retry_conflict');
select public.test_error($q$select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000103","business_name":"Spoof","contact_name":"Owner","contact":"0902000001","location":"Hà Nội","product_interest":"Trà","partner_id":"00000000-0000-4000-8000-000000000004","contact_authorized":true}')$q$,'authorized_contact_required');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
select public.test_assert(jsonb_array_length(public.partner_network_snapshot()->'referrals')=0,'another partner cannot see A referral');
select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000102","business_name":"Cafe A","contact_name":"Owner","contact":"+84902000001","location":"Hà Nội","product_interest":"Trà xanh","contact_authorized":true}');
select public.test_error($q$select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000101","business_name":"Cafe A","contact_name":"Owner","contact":"0902000001","location":"Hà Nội","product_interest":"Hồng trà","expected_volume_kg":20,"contact_authorized":true}')$q$,'referral_retry_conflict');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.test_assert((select jsonb_array_length(r->'duplicates')>0 from jsonb_array_elements(public.partner_network_admin_snapshot()->'referrals') r where r->>'id'='00000000-0000-4000-8000-000000000101'),'normalized phone duplicate flagged');
select public.test_error($q$select public.partner_network_resolve_lead('00000000-0000-4000-8000-000000000101','accept','{}')$q$,'duplicate_resolution_required');
select public.partner_network_resolve_lead('00000000-0000-4000-8000-000000000101','accept','{"reason":"Reviewed two submissions; A originated this referral"}');
select public.test_assert((select count(*) from public.trade_opportunities where contact_key='0902000001')=1,'one existing CRM opportunity');
select public.test_error($q$select public.partner_network_resolve_lead('00000000-0000-4000-8000-000000000102','accept','{"opportunity_id":"opp-referral-00000000-0000-4000-8000-000000000101","reason":"Reviewed duplicate"}')$q$,'opportunity_already_attributed');
select public.partner_network_resolve_lead('00000000-0000-4000-8000-000000000102','reject','{"reason":"Duplicate of already attributed referral"}');
select public.partner_network_manage_partner(current_setting('test.partner_a')::uuid,'disable','{"reason":"Temporary pilot pause"}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.test_assert(jsonb_array_length(public.partner_network_snapshot()->'referrals')=1,'disabled history stays accessible');
select public.test_error($q$select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000104","business_name":"Cafe D","contact_name":"Owner","contact":"0902000004","location":"Hà Nội","product_interest":"Trà","contact_authorized":true}')$q$,'partner_not_approved');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('test.saved_code',(select code from public.partner_network_partners where id=current_setting('test.partner_a')::uuid),false);
select public.partner_network_manage_partner(current_setting('test.partner_a')::uuid,'approve','{}');
select public.test_assert((select code=current_setting('test.saved_code') from public.partner_network_partners where id=current_setting('test.partner_a')::uuid),'reapproval preserves code');
reset role;


-- Fixture orders below represent purchases AFTER referral submission.
update public.partner_network_referrals set created_at='2025-12-01' where id='00000000-0000-4000-8000-000000000101';
insert into public.trade_quotes values('test-q1','opp-referral-00000000-0000-4000-8000-000000000101','test-o1');
insert into public.trade_quotes values('test-q-old','opp-referral-00000000-0000-4000-8000-000000000101','test-old-o0');
insert into public.wholesale_accounts values('test-client','0902000001','Cafe A','Hà Nội','opp-referral-00000000-0000-4000-8000-000000000101');
insert into public.orders(id,ts,type,status,customer_name,contact,address,quote_id,partner_account_id) values
 ('test-o1','2026-01-01','wholesale','confirmed','Cafe A','0902000001','Hà Nội','test-q1',null),
 ('test-o2','2026-02-01','wholesale','shipped','Cafe A','0902000001','Hà Nội',null,'test-client'),
 ('test-o3','2026-03-01','wholesale','pending','Cafe A','0902000001','Hà Nội',null,'test-client');
insert into public.orders(id,ts,type,status,customer_name,contact,address,quote_id,partner_account_id)
  values('test-old-o0','2025-01-01','wholesale','completed','Cafe A','0902000001','Hà Nội','test-q-old','test-client');
insert into public.receivables values('test-r1','test-o1',1000000,500000,'partial'),('test-r2','test-o2',1000000,1000000,'paid'),('test-r3','test-o3',1000000,1000000,'paid');
insert into public.receivable_payments(id,receivable_id,amount) values('test-p1','test-r1',500000),('test-p2','test-r2',1000000),('test-p3','test-r3',1000000);
insert into public.receivables values('test-old-r0','test-old-o0',1000000,1000000,'paid');
insert into public.receivable_payments(id,receivable_id,amount) values('test-old-p0','test-old-r0',1000000);
set role authenticated;
select public.partner_network_admin_snapshot();
select public.test_assert((select count(*) from public.partner_network_order_links)=3,'quote and account order links automatically reused');
select public.test_assert(not exists(select 1 from public.partner_network_order_links where order_id='test-old-o0'),'historical customer purchases never automatically attributed to new referral');
reset role;
insert into public.orders(id,ts,type,status,customer_name,contact,address,partner_account_id)
  values('test-mistaken-order','2026-04-01','wholesale','pending','Cafe A','0902000001','Hà Nội','test-client');
set role authenticated;
select public.partner_network_admin_snapshot();
select public.test_assert(exists(select 1 from public.partner_network_order_links where order_id='test-mistaken-order'),'new order automatically linked before reconciliation');
reset role;
delete from public.orders where id='test-mistaken-order';
select public.test_assert(not exists(select 1 from public.partner_network_order_links where order_id='test-mistaken-order')
  and exists(select 1 from public.partner_network_audit where entity='partner_network_order_links' and entity_id='test-mistaken-order' and action='delete'
    and before_data->>'referral_id'='00000000-0000-4000-8000-000000000101' and after_data is null),'unreconciled mistaken order deletion preserves attribution audit');
set role authenticated;
select public.test_error($q$select public.partner_network_reconcile('test-o1','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0}')$q$,'financial_review_required');
select public.partner_network_reconcile('test-o1','{"vat_amount":100000,"billed_shipping_amount":50000,"refunded_amount":25000,"review_note":"Confirmed VAT, freight and refund from payment documents"}');
select set_config('test.commission',(select id::text from public.partner_network_commissions where order_id='test-o1'),false);
select public.test_assert((select collected_amount=500000 and eligible_base=325000 and calculated_amount=32500 and rate_percent=10 from public.partner_network_commissions where order_id='test-o1'),'partial cash minus full VAT/shipping/refund, agreed first rate');
select public.test_error(format('select public.partner_network_commission_action(%L,''approve'',''{}'')',current_setting('test.commission')),'profit_review_required');
select public.partner_network_reconcile('test-o1','{"vat_amount":100000,"billed_shipping_amount":50000,"refunded_amount":25000,"internal_cost_total":200000,"minimum_retained_profit":100000,"review_note":"Reviewed actual costs and retained profit"}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.test_error(format('select public.partner_network_commission_action(%L,''approve'',''{"exception_reason":"Manager attempts exception"}'')',current_setting('test.commission')),'profit_guardrail_admin_exception_required');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.partner_network_commission_action(current_setting('test.commission')::uuid,'approve','{"exception_reason":"Admin reviewed this one-off pilot cost exception"}');
select public.test_assert((select status='approved' and length(exception_reason)>10 from public.partner_network_commissions where id=current_setting('test.commission')::uuid),'explicit admin-only profit exception retained');
reset role;
insert into public.receivable_payments(id,receivable_id,amount) values('test-p1b','test-r1',200000);
set role authenticated;
select public.test_error(format('select public.partner_network_commission_action(%L,''pay'',''{"amount":32500,"reference":"bank-test","paid_at":"2026-01-10"}'')',current_setting('test.commission')),'commission_stale_reconcile_required');
select public.partner_network_reconcile('test-o1','{"vat_amount":100000,"billed_shipping_amount":50000,"refunded_amount":25000,"internal_cost_total":200000,"minimum_retained_profit":100000,"review_note":"New payment reviewed"}');
select public.test_assert((select exception_reason='' and status='review' from public.partner_network_commissions where order_id='test-o1'),'reconciliation invalidates prior approval and exception');
select public.partner_network_commission_action(current_setting('test.commission')::uuid,'approve','{}');
select public.test_error(format('select public.partner_network_commission_action(%L,''pay'',''{"amount":52500,"reference":"customer-not-fully-paid","paid_at":"2026-01-10"}'')',current_setting('test.commission')),'customer_payment_incomplete');
reset role;
insert into public.receivable_payments(id,receivable_id,amount) values('test-p1c','test-r1',300000);
update public.receivables set paid=1000000,status='paid' where id='test-r1';
set role authenticated;
select public.partner_network_reconcile('test-o1','{"vat_amount":100000,"billed_shipping_amount":50000,"refunded_amount":25000,"internal_cost_total":200000,"minimum_retained_profit":100000,"review_note":"All customer payments collected and reviewed before final commission settlement"}');
select public.test_assert((select (c->>'collection_complete')::boolean and (c->>'current_collected')::numeric=1000000 and (c->>'current_amount')::numeric=82500 from jsonb_array_elements(public.partner_network_admin_snapshot()->'commissions') c where c->>'id'=current_setting('test.commission')),'complete cash ledger required for closing commission settlement');
select public.partner_network_commission_action(current_setting('test.commission')::uuid,'approve','{}');
select public.test_error(format('select public.partner_network_commission_action(%L,''pay'',''{"amount":25000,"reference":"partial-not-supported","paid_at":"2026-01-10"}'')',current_setting('test.commission')),'invalid_commission_payment');
select public.test_error(format('select public.partner_network_commission_action(%L,''pay'',''{"amount":0,"reference":"zero-not-valid","paid_at":"2026-01-10"}'')',current_setting('test.commission')),'invalid_commission_payment');
select public.test_error(format('select public.partner_network_commission_action(%L,''pay'',''{"amount":82501,"reference":"above-approved","paid_at":"2026-01-10"}'')',current_setting('test.commission')),'invalid_commission_payment');
select public.partner_network_commission_action(current_setting('test.commission')::uuid,'pay','{"amount":82500,"reference":"bank-test-payout","paid_at":"2026-01-10"}');
select public.test_error(format('select public.partner_network_commission_action(%L,''pay'',''{"amount":1,"reference":"again","paid_at":"2026-01-10"}'')',current_setting('test.commission')),'paid_commission_immutable');
select public.partner_network_reconcile('test-o2','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0,"internal_cost_total":500000,"minimum_retained_profit":100000,"review_note":"Repeat eligible order"}');
select public.test_assert((select order_index=2 and rate_percent=4 from public.partner_network_commissions where order_id='test-o2'),'limited repeat rate agreed independently');
reset role;
update public.receivables set status='void' where id='test-r2';
set role authenticated;
select public.test_error(format('select public.partner_network_commission_action(%L,''approve'',''{}'')',(select id from public.partner_network_commissions where order_id='test-o2')),'commission_stale_reconcile_required');
reset role;
update public.receivables set status='paid' where id='test-r2';
set role authenticated;
select public.partner_network_reconcile('test-o3','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0,"internal_cost_total":500000,"minimum_retained_profit":100000,"review_note":"Repeat beyond agreed limit"}');
select public.test_assert((select order_index=3 and rate_percent=0 from public.partner_network_commissions where order_id='test-o3'),'no permanent repeat commission');
select public.partner_network_reconcile('test-o1','{"vat_amount":100000,"billed_shipping_amount":50000,"refunded_amount":1000000,"internal_cost_total":200000,"minimum_retained_profit":100000,"review_note":"Later full customer refund confirmed"}');
select public.test_assert((select paid_amount=82500 and status='paid' and refunded_amount=25000 from public.partner_network_commissions where order_id='test-o1'),'paid record kept unchanged after refund review');
select public.test_assert((select (c->>'overpaid_amount')::numeric=82500 from jsonb_array_elements(public.partner_network_admin_snapshot()->'commissions') c where c->>'id'=current_setting('test.commission')),'refund flags overpayment without hiding original payout');
select public.partner_network_reconcile('test-o2','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0,"cancelled":true,"internal_cost_total":0,"minimum_retained_profit":0,"review_note":"Cancelled order, no commission"}');
select public.test_assert((select eligible_base=0 and calculated_amount=0 from public.partner_network_commissions where order_id='test-o2'),'cancelled order yields zero');
select public.test_error(format('select public.partner_network_commission_action(%L,''adjust'',''{"adjustment_amount":100,"reason":"Cannot add fees to cancelled order"}'')',(select id from public.partner_network_commissions where order_id='test-o2')),'no_eligible_revenue');
reset role;
select public.test_assert(public.partner_network_order_index('test-o3','00000000-0000-4000-8000-000000000101')=1,'later refund and cancellation exclude earlier orders from new repeat sequence');
set role authenticated;
select public.test_error($q$select public.partner_network_reconcile('test-o3','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0,"internal_cost_total":500000,"minimum_retained_profit":100000,"rate_percent":0,"review_note":"Attempt to retain obsolete repeat index rate"}')$q$,'rate_adjustment_reason_required');
select public.partner_network_reconcile('test-o3','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0,"internal_cost_total":500000,"minimum_retained_profit":100000,"review_note":"Current first-order policy after earlier cancellations and refunds"}');
select public.test_assert((select order_index=1 and rate_percent=10 from public.partner_network_commissions where order_id='test-o3'),'changed order index rederives current agreed policy without silent old-rate retention');
select public.partner_network_manage_partner(current_setting('test.partner_a')::uuid,'update','{"default_rate_percent":12}');
select public.partner_network_reconcile('test-o3','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0,"internal_cost_total":500000,"minimum_retained_profit":100000,"review_note":"Unchanged order index retains its negotiated rate snapshot"}');
select public.test_assert((select order_index=1 and rate_percent=10 from public.partner_network_commissions where order_id='test-o3'),'unchanged index preserves existing negotiated rate despite later partner terms');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.test_assert(jsonb_array_length(public.partner_network_snapshot()->'commissions')=3,'own commission records available');
select public.test_assert((public.partner_network_snapshot()->'referrals'->0->>'order_count')::integer=3 and (public.partner_network_snapshot()->'referrals'->0->>'paid_order_count')::integer=2,'own linked order and actual paid order counts');
select public.test_assert(not (public.partner_network_snapshot()->'commissions'->0 ? 'internal_cost_total') and not(public.partner_network_snapshot()->'commissions'->0 ? 'minimum_retained_profit'),'no margin/costs in partner view');
select public.test_error(format('select public.partner_network_commission_action(%L,''approve'',''{}'')',current_setting('test.commission')),'manager_required');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
select public.test_assert(jsonb_array_length(public.partner_network_snapshot()->'commissions')=0,'cross-partner commissions isolated');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select public.test_error($q$select public.partner_network_admin_snapshot()$q$,'manager_required');
reset role;
select public.test_assert((select count(*) from public.partner_network_audit)>15,'operational financial history append-only audit');
select public.test_assert(not has_table_privilege('authenticated','public.partner_network_audit','update'),'no direct audit mutation');
select public.test_assert(not has_function_privilege('anon','public.partner_network_snapshot()','execute'),'anon blocked');
select public.test_assert(not has_function_privilege('authenticated','public.partner_network_commission_view(uuid)','execute'),'internal projections not directly callable');
select public.test_error($q$delete from public.orders where id='test-o1'$q$,'foreign key constraint');
select public.test_assert(exists(select 1 from public.orders where id='test-o1')
  and exists(select 1 from public.partner_network_commissions where order_id='test-o1' and paid_amount=82500 and status='paid'),'commission and paid history prevent financial order deletion');
set role authenticated;
select set_config('request.jwt.claim.sub','',false);
select public.test_error($q$select public.partner_network_snapshot()$q$,'authentication_required');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.test_error(format('select public.partner_network_manage_partner(%L,''update'',''{"default_rate_percent":101}'')',current_setting('test.partner_a')),'invalid_commission_rate');
select public.test_error(format('select public.partner_network_manage_partner(%L,''update'',''{"repeat_order_limit":31}'')',current_setting('test.partner_a')),'invalid_commission_terms');
reset role;

-- An irregular VND invoice still settles in whole dong, suitable for a real transfer.
insert into public.orders(id,ts,type,status,customer_name,contact,address,partner_account_id)
values('test-vnd-round','2026-10-12','wholesale','confirmed','Cafe A','0902000001','Hà Nội','test-client');
insert into public.receivables values('test-vnd-recv','test-vnd-round',987654,987654,'paid');
insert into public.receivable_payments(id,receivable_id,amount) values('test-vnd-cash','test-vnd-recv',987654);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.partner_network_reconcile('test-vnd-round','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0,"internal_cost_total":500000,"minimum_retained_profit":100000,"rate_percent":3,"adjustment_reason":"Separately confirmed example order rate","review_note":"Whole VND rounding for an irregular invoice"}');
select public.test_assert((select calculated_amount=29630 from public.partner_network_commissions where order_id='test-vnd-round'),'commission settles whole VND');
select public.test_error(format('select public.partner_network_commission_action(%L,''adjust'',''{"adjustment_amount":0.5,"reason":"Invalid fractional VND adjustment"}'')',(select id from public.partner_network_commissions where order_id='test-vnd-round')),'whole_vnd_adjustment_required');
reset role;

-- A late collection on an older order changes a paid first-order entitlement.
-- Do not silently rewrite the payout or claim a verified zero recovery balance.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.partner_network_submit_lead('{"request_id":"00000000-0000-4000-8000-000000000188","business_name":"Late Collection Cafe","contact_name":"Owner","contact":"0902000088","location":"Hà Nội","product_interest":"Hồng trà","contact_authorized":true}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.partner_network_resolve_lead('00000000-0000-4000-8000-000000000188','accept','{"reason":"Separate test customer for late collection review"}');
reset role;
update public.partner_network_referrals set created_at='2025-12-01' where id='00000000-0000-4000-8000-000000000188';
insert into public.wholesale_accounts values('test-late-client','0902000088','Late Collection Cafe','Hà Nội','opp-referral-00000000-0000-4000-8000-000000000188');
insert into public.orders(id,ts,type,status,customer_name,contact,address,partner_account_id) values
 ('test-late-older','2026-01-01','wholesale','confirmed','Late Collection Cafe','0902000088','Hà Nội','test-late-client'),
 ('test-late-settled','2026-02-01','wholesale','confirmed','Late Collection Cafe','0902000088','Hà Nội','test-late-client');
insert into public.receivables values('test-late-older-recv','test-late-older',1000000,0,'open'),('test-late-settled-recv','test-late-settled',1000000,1000000,'paid');
insert into public.receivable_payments(id,receivable_id,amount) values('test-late-settled-cash','test-late-settled-recv',1000000);
set role authenticated;
select public.partner_network_reconcile('test-late-settled','{"vat_amount":0,"billed_shipping_amount":0,"refunded_amount":0,"internal_cost_total":500000,"minimum_retained_profit":100000,"review_note":"First cash-collected order; older order has not yet collected"}');
select public.partner_network_commission_action((select id from public.partner_network_commissions where order_id='test-late-settled'),'approve','{}');
select public.partner_network_commission_action((select id from public.partner_network_commissions where order_id='test-late-settled'),'pay','{"amount":120000,"reference":"test-late-original-payout","paid_at":"2026-02-10"}');
select set_config('test.paid_before_ordinal_change',(select to_jsonb(c)::text from public.partner_network_commissions c where order_id='test-late-settled'),false);
reset role;
insert into public.receivable_payments(id,receivable_id,amount) values('test-late-older-cash','test-late-older-recv',1000000);
update public.receivables set paid=1000000,status='paid' where id='test-late-older-recv';
set role authenticated;
select public.test_assert((select (c->>'entitlement_review_required')::boolean and (c->>'current_order_index')::integer=2 and c->'overpaid_amount'='null'::jsonb
  and (c->>'stale')::boolean and c->>'status'='paid' and (c->>'paid_amount')::numeric=120000
  and (select to_jsonb(paid) from public.partner_network_commissions paid where paid.order_id='test-late-settled')=current_setting('test.paid_before_ordinal_change')::jsonb
  from jsonb_array_elements(public.partner_network_admin_snapshot()->'commissions') c where c->>'order_id'='test-late-settled'),
  'late payment changes paid first-repeat entitlement to manual review with unknown recovery while preserving immutable payout');
reset role;
