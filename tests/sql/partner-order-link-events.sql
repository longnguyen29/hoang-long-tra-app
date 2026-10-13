-- Disposable fixture only. Apply 0084 and existing partner-network.sql first,
-- then 0086. These names, contacts and orders are synthetic.
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);

insert into public.orders(id,ts,type,status,quote_id) values('event-quote',now(),'wholesale','confirmed','test-q1');
select public.test_assert((select referral_id='00000000-0000-4000-8000-000000000101' and source='quote' from public.partner_network_order_links where order_id='event-quote'),'new quote order immediately attributed');

insert into public.orders(id,ts,type,status,partner_account_id) values('event-account',now(),'wholesale','confirmed','test-client');
select public.test_assert((select referral_id='00000000-0000-4000-8000-000000000101' and source='account' from public.partner_network_order_links where order_id='event-account'),'new account order immediately attributed');

insert into public.trade_quotes(id,opportunity_id) values('event-delayed-conversion','opp-referral-00000000-0000-4000-8000-000000000101');
insert into public.orders(id,ts,type,status) values('event-converted-order',now(),'wholesale','confirmed');
select public.test_assert(not exists(select 1 from public.partner_network_order_links where order_id='event-converted-order'),'no attribution before structural association');
update public.trade_quotes set converted_order_id='event-converted-order' where id='event-delayed-conversion';
select public.test_assert((select referral_id='00000000-0000-4000-8000-000000000101' and source='quote' from public.partner_network_order_links where order_id='event-converted-order'),'delayed quote conversion immediately attributed');

insert into public.orders(id,ts,type,status,quote_id) values('event-quote-insert-later',now(),'wholesale','confirmed','event-new-quote');
insert into public.trade_quotes(id,opportunity_id) values('event-new-quote','opp-referral-00000000-0000-4000-8000-000000000101');
select public.test_assert((select source='quote' from public.partner_network_order_links where order_id='event-quote-insert-later'),'new quote event catches an already referenced order');

insert into public.orders(id,ts,type,status) values('event-order-quote-update',now(),'wholesale','confirmed');
update public.orders set quote_id='test-q1' where id='event-order-quote-update';
select public.test_assert((select source='quote' from public.partner_network_order_links where order_id='event-order-quote-update'),'order quote update immediately attributed');

insert into public.orders(id,ts,type,status) values('event-order-account-update',now(),'wholesale','confirmed');
update public.orders set partner_account_id='test-client' where id='event-order-account-update';
select public.test_assert((select source='account' from public.partner_network_order_links where order_id='event-order-account-update'),'order account update immediately attributed');

insert into public.wholesale_accounts(id,contact,business_name) values('event-account-late','0903500001','Delayed test customer');
insert into public.orders(id,ts,type,status,partner_account_id) values('event-account-association',now(),'wholesale','confirmed','event-account-late');
select public.test_assert(not exists(select 1 from public.partner_network_order_links where order_id='event-account-association'),'unqualified account cannot attribute order');
update public.wholesale_accounts set opportunity_id='opp-referral-00000000-0000-4000-8000-000000000188' where id='event-account-late';
select public.test_assert((select referral_id='00000000-0000-4000-8000-000000000188' and source='account' from public.partner_network_order_links where order_id='event-account-association'),'delayed account opportunity immediately attributed');

insert into public.trade_quotes(id) values('event-quote-opportunity-late');
insert into public.orders(id,ts,type,status,quote_id) values('event-quote-association',now(),'wholesale','confirmed','event-quote-opportunity-late');
update public.trade_quotes set opportunity_id='opp-referral-00000000-0000-4000-8000-000000000188' where id='event-quote-opportunity-late';
select public.test_assert((select referral_id='00000000-0000-4000-8000-000000000188' and source='quote' from public.partner_network_order_links where order_id='event-quote-association'),'delayed quote opportunity immediately attributed');

insert into public.orders(id,ts,type,status,quote_id,partner_account_id) values('event-before-referral','2020-01-01','wholesale','completed','test-q1','test-client');
select public.test_assert(not exists(select 1 from public.partner_network_order_links where order_id='event-before-referral'),'event does not claim a historical order');
insert into public.orders(id,ts,type,status,quote_id,partner_account_id) values('event-retail',now(),'retail','confirmed','test-q1','test-client');
select public.test_assert(not exists(select 1 from public.partner_network_order_links where order_id='event-retail'),'event does not claim retail order');
insert into public.orders(id,ts,type,status,contact,customer_name) values('event-phone-only',now(),'wholesale','confirmed','0902000001','Cafe A');
select public.test_assert(not exists(select 1 from public.partner_network_order_links where order_id='event-phone-only'),'phone and name alone never establish automatic attribution');

insert into public.trade_opportunities(id,contact_key,business_name,contact,stage) values('event-pending-opportunity','0903500287','Pending test café','0903500287','lead');
insert into public.partner_network_referrals(id,partner_id,business_name,contact_name,contact,contact_key,location,product_interest,opportunity_id)
  values('00000000-0000-4000-8000-000000000287',current_setting('test.partner_a')::uuid,'Pending test café','Test owner','0903500287','0903500287','Test location','Hồng trà','event-pending-opportunity');
insert into public.trade_quotes(id,opportunity_id) values('event-pending-quote','event-pending-opportunity');
insert into public.orders(id,ts,type,status,quote_id) values('event-pending-order',now(),'wholesale','confirmed','event-pending-quote');
select public.test_assert(not exists(select 1 from public.partner_network_order_links where order_id='event-pending-order'),'pending referral does not claim an order');

insert into public.orders(id,ts,type,status) values('event-manual-origin',now(),'wholesale','confirmed');
set role authenticated;
select public.partner_network_link_order('00000000-0000-4000-8000-000000000188','event-manual-origin','Manually verified originating referral');
reset role;
update public.orders set quote_id='test-q1',partner_account_id='test-client' where id='event-manual-origin';
select public.test_assert((select referral_id='00000000-0000-4000-8000-000000000188' and source='manual' from public.partner_network_order_links where order_id='event-manual-origin'),'events preserve explicit manual origin even if quote/account differs');
update public.trade_quotes set opportunity_id='opp-referral-00000000-0000-4000-8000-000000000188' where id='event-new-quote';
select public.test_assert((select referral_id='00000000-0000-4000-8000-000000000101' from public.partner_network_order_links where order_id='event-quote-insert-later'),'later quote ownership change never rewrites existing order origin');

update public.orders set quote_id=quote_id where id='event-quote';
select public.test_assert((select count(*)=1 from public.partner_network_order_links where order_id='event-quote')
  and (select count(*)=1 from public.partner_network_audit where entity='partner_network_order_links' and entity_id='event-quote' and action='insert'),'repeated structural update does not duplicate link or audit insertion');
select public.test_assert((select created_by='00000000-0000-4000-8000-000000000001' from public.partner_network_order_links where order_id='event-quote'),'trusted structural event records authenticated actor');

select public.test_assert(not has_function_privilege('anon','public.partner_network_try_link_order(text)','execute'),'anon cannot invoke attribution helper');
select public.test_assert(not has_function_privilege('authenticated','public.partner_network_try_link_order(text)','execute'),'authenticated cannot invoke attribution helper');
select public.test_assert(not has_function_privilege('anon','public.partner_network_link_order_batch(text[])','execute'),'anon cannot invoke batch attribution helper');
select public.test_assert(not has_function_privilege('authenticated','public.partner_network_link_order_batch(text[])','execute'),'authenticated cannot invoke batch attribution helper');
select public.test_assert(not has_function_privilege('anon','public.partner_network_order_link_event()','execute') and not has_function_privilege('authenticated','public.partner_network_order_link_event()','execute'),'order trigger function unavailable to public callers');
select public.test_assert(not has_function_privilege('anon','public.partner_network_quote_link_event()','execute') and not has_function_privilege('authenticated','public.partner_network_quote_link_event()','execute'),'quote trigger function unavailable to public callers');
select public.test_assert(not has_function_privilege('anon','public.partner_network_account_link_event()','execute') and not has_function_privilege('authenticated','public.partner_network_account_link_event()','execute'),'account trigger function unavailable to public callers');

set role authenticated;
select public.partner_network_resolve_lead('00000000-0000-4000-8000-000000000287','accept','{"opportunity_id":"event-pending-opportunity","reason":"Pending referral accepted after verified ownership review"}');
select public.partner_network_admin_snapshot();
reset role;
select public.test_assert((select referral_id='00000000-0000-4000-8000-000000000287' from public.partner_network_order_links where order_id='event-pending-order'),'manager refresh links existing order after referral acceptance');
