-- Synthetic fixtures only, within a fresh disposable database.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);
insert into public.partner_network_partners(id,user_id,code,status,business_name,contact_name,email,phone,region,partner_type,approved_at) values
 ('00000000-0000-4000-8000-000000009501','00000000-0000-4000-8000-000000000003','TEST-A','approved','Synthetic A','A','a@example.test','0901000001','HN','consultant',now()),
 ('00000000-0000-4000-8000-000000009502','00000000-0000-4000-8000-000000000004','TEST-B','approved','Synthetic B','B','b@example.test','0901000002','HN','sales_rep',now());
insert into public.trade_opportunities(id,contact_key,business_name,contact,stage) values('revenue-opp','0905950001','Synthetic Cafe','0905950001','qualified');
insert into public.partner_network_referrals(id,partner_id,business_name,contact_name,contact,contact_key,location,product_interest,status,opportunity_id,created_at) values
 ('00000000-0000-4000-8000-000000009511','00000000-0000-4000-8000-000000009501','Synthetic Cafe','Buyer','0905950001','0905950001','HN','Tea','accepted','revenue-opp','2024-01-01');
-- Deliberately still in progress: bonuses are on actual cash, not completed order count.
insert into public.orders(id,ts,type,status,customer_name,contact) values
 ('revenue-split','2025-01-01','wholesale','confirmed','Synthetic Cafe','0905950001'),
 ('revenue-unknown','2025-01-01','retail','confirmed','Synthetic Cafe','0905950001');
update public.partner_network_referrals set channel='b2c';
insert into public.partner_network_order_links(order_id,referral_id,source,reason,created_by) values
 ('revenue-split','00000000-0000-4000-8000-000000009511','manual','Synthetic attribution','00000000-0000-4000-8000-000000000001'),
 ('revenue-unknown','00000000-0000-4000-8000-000000009511','manual','Synthetic attribution','00000000-0000-4000-8000-000000000001');
insert into public.receivables values('revenue-r1','revenue-split',1000000,1000000,'paid'),('revenue-r2','revenue-unknown',1000000,1000000,'paid');
insert into public.receivable_payments(id,receivable_id,amount,paid_at) values
 ('revenue-p1','revenue-r1',400000,'2025-01-15T05:00:00Z'),('revenue-p2','revenue-r1',600000,'2025-02-15T05:00:00Z'),
 ('revenue-p3','revenue-r2',1000000,'2025-02-28T17:00:00Z'); -- exactly March1 Vietnam
insert into public.partner_network_order_reviews(order_id,vat_amount,billed_shipping_amount,refunded_amount,review_note,reviewed_by) values
 ('revenue-split',100000,50000,0,'Reviewed exclusions only; no invented costs','00000000-0000-4000-8000-000000000001');
-- Historical rule fixture; public API intentionally refuses backdating into closed periods.
insert into public.partner_network_reward_rules(partner_id,version,effective_month,thresholds,enabled,reason,created_by,period_kind,reward_basis) values
 ('00000000-0000-4000-8000-000000009501',1,'2025-01-01','[{"minimum_revenue":200000,"amount":1000},{"minimum_revenue":500000,"amount":3000}]',true,'Synthetic historical agreement','00000000-0000-4000-8000-000000000001','monthly','net_collected_revenue');
set role authenticated;
select public.test_assert((public.partner_network_reward_preview('00000000-0000-4000-8000-000000009501','monthly','2025-01-01')->>'revenue_amount')::numeric=250000,'first partial payment deducts reviewed VAT and shipping once');
select public.test_assert((public.partner_network_reward_preview('00000000-0000-4000-8000-000000009501','monthly','2025-02-01')->>'revenue_amount')::numeric=600000,'later partial payment does not deduct same exclusions again');
select public.test_assert((public.partner_network_reward_preview('00000000-0000-4000-8000-000000009501','monthly','2025-02-01')->>'estimated_amount')::numeric=3000,'one valuable order reaches highest revenue band; not summed');
select public.test_assert((public.partner_network_reward_preview('00000000-0000-4000-8000-000000009501','monthly','2025-02-01')->>'unreviewed_orders')::integer=0,'unknown reviews outside payment period do not block');
select public.test_assert(public.partner_network_reward_preview('00000000-0000-4000-8000-000000009501','monthly','2025-03-01')->'revenue_amount'='null'::jsonb,'cash on March1 VN requires review in March, not February');
select public.test_assert(not(public.partner_network_reward_preview('00000000-0000-4000-8000-000000009501','monthly','2025-01-01') ?| array['orders','fingerprint','internal_cost_total']),'authenticated preview does not expose source payments or cost rows');
select public.test_error($q$select public.partner_network_reward_preview('00000000-0000-4000-8000-000000009501','yearly','2025-02-01')$q$,'invalid_reward_period');
select public.test_error($q$select public.partner_network_reward_preview('00000000-0000-4000-8000-000000009501',null,'2025-01-01')$q$,'invalid_reward_period');
select set_config('test.reward_id',(public.partner_network_reward_create('00000000-0000-4000-8000-000000009501','{"kind":"monthly","month":"2025-02-01","reason":"Synthetic February revenue review","request_id":"00000000-0000-4000-8000-000000009521"}')->>'id'),false);
select public.test_assert((public.partner_network_reward_create('00000000-0000-4000-8000-000000009501','{"kind":"monthly","month":"2025-02-01","reason":"Synthetic February revenue review","request_id":"00000000-0000-4000-8000-000000009521"}')->>'id')=current_setting('test.reward_id'),'durable identical request recovers existing reward before overlap check');
select public.test_error($q$select public.partner_network_reward_create('00000000-0000-4000-8000-000000009501','{"kind":"monthly","month":"2025-02-01","reason":"Another reward on same cash"}')$q$,'reward_period_overlaps');
select public.partner_network_reward_action(current_setting('test.reward_id')::uuid,'approve','{}');
select public.partner_network_reward_action(current_setting('test.reward_id')::uuid,'pay',jsonb_build_object('amount',3000,'reference','TEST-ONLY-NO-TRANSFER','paid_at',now()));
select public.test_error(format('select public.partner_network_reward_action(%L,''void'',''{"reason":"Do not rewrite actual paid record"}'')',current_setting('test.reward_id')),'paid_reward_immutable');
reset role;
select set_config('test.paid_row',(select to_jsonb(r)::text from public.partner_network_rewards r where id=current_setting('test.reward_id')::uuid),false);
update public.partner_network_order_reviews set refunded_amount=50000 where order_id='revenue-split';
select public.test_assert((select to_jsonb(r)::text=current_setting('test.paid_row') from public.partner_network_rewards r where id=current_setting('test.reward_id')::uuid),'refund does not alter paid ledger row');
select public.test_assert((public.partner_network_reward_view(current_setting('test.reward_id')::uuid)->>'stale')::boolean,'refund flags historical source change even if threshold still same');
update public.orders set status='cancelled' where id='revenue-split';
select public.test_assert((public.partner_network_reward_period('00000000-0000-4000-8000-000000009501','monthly','2025-02-01')->>'revenue_amount')::numeric=0,'live canceled order excluded without waiting for review change');
update public.orders set status='confirmed' where id='revenue-split';
-- Annual partner uses reviewed retail cash. A legacy paid monthly record reserves its period.
update public.partner_network_order_reviews set refunded_amount=0 where order_id='revenue-split';
insert into public.partner_network_order_reviews(order_id,vat_amount,billed_shipping_amount,refunded_amount,review_note,reviewed_by) values
 ('revenue-unknown',0,0,0,'Retail exclusions reviewed','00000000-0000-4000-8000-000000000001');
update public.partner_network_referrals set partner_id='00000000-0000-4000-8000-000000009502' where id='00000000-0000-4000-8000-000000009511';
insert into public.partner_network_reward_rules(partner_id,version,effective_month,thresholds,enabled,reason,created_by,period_kind,reward_basis) values
 ('00000000-0000-4000-8000-000000009502',1,'2025-01-01','[{"minimum_revenue":1000000,"amount":9000}]',true,'Synthetic annual agreement','00000000-0000-4000-8000-000000000001','yearly','net_collected_revenue');
set role authenticated;
select public.test_assert((public.partner_network_reward_preview('00000000-0000-4000-8000-000000009502','yearly','2025-01-01')->>'revenue_amount')::numeric=1850000,'annual revenue combines B2B and B2C payments without company-wide sales');
select public.test_assert(not(public.partner_network_reward_preview('00000000-0000-4000-8000-000000009502','monthly','2025-01-01')->>'rule_enabled')::boolean,'annual choice prevents monthly accrual');
select set_config('test.annual_id',(public.partner_network_reward_create('00000000-0000-4000-8000-000000009502','{"kind":"yearly","month":"2025-01-01","reason":"Synthetic annual cash review"}')->>'id'),false);
select public.partner_network_reward_action(current_setting('test.annual_id')::uuid,'approve','{}');
select public.test_assert(jsonb_array_length(public.partner_network_rewards_snapshot('00000000-0000-4000-8000-000000009502')->'reward_rules')=1,'new snapshot keys compose through existing private data projection');
-- Current-year policy must be configured deliberately and keep optimistic version checks.
select public.partner_network_reward_rule('00000000-0000-4000-8000-000000009501',jsonb_build_object('period_kind','monthly','effective_month',date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date,'thresholds','[{"minimum_revenue":50000000,"amount":100000}]'::jsonb,'enabled',true,'reason','Explicit current revenue policy test','expected_version',1));
select public.test_error(format('select public.partner_network_reward_rule(%L,%L)','00000000-0000-4000-8000-000000009501',jsonb_build_object('period_kind','yearly','effective_month',date_trunc('year',now() at time zone 'Asia/Ho_Chi_Minh')::date,'thresholds','[{"minimum_revenue":1,"amount":1}]'::jsonb,'enabled',true,'reason','Attempt overlapping cadence midyear','expected_version',2)::text),'reward_cadence_switch_next_year');
select public.test_error(format('select public.partner_network_reward_rule(%L,%L)','00000000-0000-4000-8000-000000009501',jsonb_build_object('period_kind','monthly','effective_month',date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date,'thresholds','[{"minimum_orders":1,"amount":1}]'::jsonb,'enabled',true,'reason','Old order count keys are invalid','expected_version',2)::text),'invalid_revenue_reward_rule');
select public.partner_network_reward_rule('00000000-0000-4000-8000-000000009501',jsonb_build_object('period_kind','yearly','effective_month',(date_trunc('year',now() at time zone 'Asia/Ho_Chi_Minh')+interval '1 year')::date,'thresholds','[{"minimum_revenue":50000000,"amount":100000}]'::jsonb,'enabled',true,'reason','Switch only from next January test','expected_version',2));
select public.test_error(format('select public.partner_network_reward_rule(%L,%L)','00000000-0000-4000-8000-000000009501',jsonb_build_object('period_kind','monthly','effective_month',date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date,'thresholds','[]'::jsonb,'enabled',false,'reason','Outdated concurrent editor test','expected_version',2)::text),'reward_rule_changed');
reset role;
-- Legacy count awards are preserved, never silently converted into revenue rewards.
insert into public.partner_network_rewards(partner_id,kind,month,amount,qualifying_orders,reason,eligibility_snapshot,fingerprint,created_by,status) values
 ('00000000-0000-4000-8000-000000009501','monthly','2024-01-01',1000,1,'Legacy unpaid review','{}','legacy','00000000-0000-4000-8000-000000000001','review');
select set_config('test.legacy_id',(select id::text from public.partner_network_rewards where month='2024-01-01'),false);
set role authenticated;
select public.test_error(format('select public.partner_network_reward_action(%L,''approve'',''{}'')',current_setting('test.legacy_id')),'legacy_reward_review_required');
select public.partner_network_reward_action(current_setting('test.legacy_id')::uuid,'void','{"reason":"Superseded count award reviewed and canceled"}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.test_error($q$select public.partner_network_reward_preview('00000000-0000-4000-8000-000000009502','yearly','2025-01-01')$q$,'own_partner_required');
select public.test_error($q$select public.partner_network_reward_period('00000000-0000-4000-8000-000000009501','monthly','2025-01-01')$q$,'permission denied');
select public.test_assert((select bool_and(x->>'partner_id'='00000000-0000-4000-8000-000000009501') from jsonb_array_elements(public.partner_network_rewards_snapshot()->'rewards')x),'own snapshot never includes another partner rewards');
select public.test_assert(not(public.partner_network_rewards_snapshot()::text like '%receivable_id%'),'own reward snapshot excludes internal payment identifiers');
reset role;
select public.test_assert(not has_function_privilege('anon','public.partner_network_reward_preview(uuid,text,date)','execute'),'anonymous preview denied');
select public.test_assert(not has_function_privilege('authenticated','public.partner_network_reward_mode(uuid,integer)','execute'),'internal cadence helper private');

-- Paid historical monthly rewards must block a new yearly claim on the same cash.
insert into public.partner_network_reward_rules(partner_id,version,effective_month,thresholds,enabled,reason,created_by,period_kind,reward_basis) values
 ('00000000-0000-4000-8000-000000009502',2,'2024-01-01','[{"minimum_revenue":1,"amount":10}]',true,'Synthetic past yearly rule','00000000-0000-4000-8000-000000000001','yearly','net_collected_revenue');
insert into public.receivable_payments(id,receivable_id,amount,paid_at) values('revenue-old','revenue-r2',100,'2024-06-01T00:00:00Z');
insert into public.partner_network_rewards(partner_id,kind,month,amount,qualifying_orders,reason,eligibility_snapshot,fingerprint,created_by,status,paid_by,paid_at,paid_reference) values
 ('00000000-0000-4000-8000-000000009502','monthly','2024-06-01',10,1,'Legacy paid monthly award','{}','legacy','00000000-0000-4000-8000-000000000001','paid','00000000-0000-4000-8000-000000000001',now(),'SYNTHETIC-LEGACY');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.test_error($q$select public.partner_network_reward_create('00000000-0000-4000-8000-000000009502','{"kind":"yearly","month":"2024-01-01","reason":"No double count with paid legacy award"}')$q$,'reward_period_overlaps');
reset role;
-- Open-period preview can exist, but cannot be approved before close.
insert into public.partner_network_rewards(partner_id,kind,month,amount,qualifying_orders,reason,eligibility_snapshot,fingerprint,created_by,reward_basis,qualifying_revenue)
 select '00000000-0000-4000-8000-000000009501','monthly',date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date,100,0,'Synthetic open period guard',v,v->>'fingerprint','00000000-0000-4000-8000-000000000001','net_collected_revenue',0
 from (select public.partner_network_reward_period('00000000-0000-4000-8000-000000009501','monthly',date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date) v)s;
select set_config('test.open_id',(select id::text from public.partner_network_rewards where partner_id='00000000-0000-4000-8000-000000009501' and reward_basis='net_collected_revenue' and month=date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date),false);
set role authenticated;
select public.test_error(format('select public.partner_network_reward_action(%L,''approve'',''{}'')',current_setting('test.open_id')),'reward_period_not_closed');
reset role;
select public.test_assert(public.partner_network_reward_mode('00000000-0000-4000-8000-000000009501',extract(year from now() at time zone 'Asia/Ho_Chi_Minh')::integer)='monthly','next-year change does not change current-year cadence');
select public.test_assert(public.partner_network_reward_mode('00000000-0000-4000-8000-000000009501',extract(year from now() at time zone 'Asia/Ho_Chi_Minh')::integer+1)='yearly','next January selects yearly mode');
-- Removing source ownership must flag reconciliation without mutating paid records.
select public.test_assert((public.partner_network_reward_view(current_setting('test.reward_id')::uuid)->>'stale')::boolean,'reassigned source cannot leave a paid projection falsely current');
