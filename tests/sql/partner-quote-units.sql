select test_assert((select total_kg=1002.75 and total_items=16 from trade_quote_quantity_totals('[{"qty":2.5,"unit":"kg"},{"qty":250,"unit":"g"},{"qty":1,"unit":"ton"},{"qty":12,"unit":"viên"},{"qty":1,"unit":"bánh"},{"qty":3,"unit":"pack"}]')), 'separate explicit mass from packages');
select test_assert((select total_kg=0 and total_items=7 from trade_quote_quantity_totals('[{"qty":7,"unit":"viên"}]')), 'seven pieces are not seven kilograms');
select test_assert((select total_kg=2 and total_items is null from trade_quote_quantity_totals('[{"qty":2,"unit":"kg"}]')), 'no package count stays unknown/null');
select test_error($q$select * from trade_quote_quantity_totals('[{"qty":2.5,"unit":"pcs"}]')$q$,'invalid_quote_line_quantity');
select test_error($q$select * from trade_quote_quantity_totals('[{"qty":2,"unit":""}]')$q$,'invalid_quote_line_unit');
select test_error($q$select * from trade_quote_quantity_totals('[{"qty":0,"unit":"kg"}]')$q$,'invalid_quote_line_quantity');
select test_assert(trade_catalog_sale_unit('everyday','tea','Viên','1 viên (8g)')='viên','piece metadata matches JS');
select test_assert(trade_catalog_sale_unit('everyday','tea','Viên','20 viên')='pcs','multi-piece package is one package');
select test_assert(trade_catalog_sale_unit('everyday','tea','1kg, 5kg','')='kg','loose mass metadata');
select test_assert(trade_catalog_sale_unit('everyday','tea','1kg, 5kg','500g')='pcs','fixed-weight variant is a package');
select test_assert(trade_catalog_sale_unit('reserve','tea','100g','1 bánh (357g)')='bánh','cake metadata');

insert into catalog_products values ('piece','everyday','tea','Viên',null,null),('loose','everyday','tea','1kg, 5kg',100,null),('package','reserve','tea','500g',null,null),('untracked','everyday','tea','Viên',null,null),('unavailable','everyday','tea','',null,null);
insert into catalog_variants values ('piece','1 viên (8g)',100,null),('package','500g',100,null);
select test_error($q$select trade_quote_assert_stock_units('[{"productId":"piece","weight":"1 viên (8g)","qty":2,"unit":"kg"}]')$q$,'quote_stock_unit_mismatch');
select test_assert((select count(*)=1 from trade_quote_assert_stock_units('[{"productId":"package","weight":"500g","qty":2,"unit":"pack"}]')),'pack alias accepted for recorded package stock');
select test_error($q$select trade_quote_assert_stock_units('[{"productId":"loose","qty":1,"unit":"t"}]')$q$,'quote_stock_unit_mismatch');
select test_assert((select count(*)=1 from trade_quote_assert_stock_units('[{"productId":"untracked","qty":2,"unit":"kg"}]')),'untracked catalogue retains expressly agreed commercial unit');

insert into wholesale_accounts values ('buyer-a','00000000-0000-4000-8000-000000000002',true),('buyer-b','00000000-0000-4000-8000-000000000003',true);
insert into trade_opportunities(id,stage) values ('opp','quoted');
insert into trade_quotes(id,partner_account_id,opportunity_id,status,lines,total,customer_name,contact,address,note,payment_method) values
 ('staff','buyer-a','opp','accepted','[{"productId":"piece","weight":"1 viên (8g)","qty":12,"unit":"viên","price":10000},{"productId":"loose","qty":2.5,"unit":"kg","price":80000}]',320000,'Buyer','0900000000','','','qr'),
 ('buyer','buyer-a','opp','sent','[{"productId":"piece","weight":"1 viên (8g)","qty":3,"unit":"viên","price":10000}]',30000,'Buyer','0900000000','','','qr'),
 ('mismatch','buyer-a','opp','accepted','[{"productId":"piece","weight":"1 viên (8g)","qty":2,"unit":"kg","price":80000}]',160000,'Buyer','0900000000','','','qr'),
 ('unavailable','buyer-a','opp','accepted','[{"productId":"unavailable","qty":1,"unit":"kg","price":80000}]',80000,'Buyer','0900000000','','','qr');
insert into orders(id,lines,total_kg,total_items) values ('historic','[{"qty":2,"unit":"kg"}]',2,null);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select test_error($q$select convert_trade_quote_to_order('staff','spoof-admin')$q$,'not_authorised');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
create temp table created_staff as select convert_trade_quote_to_order('staff','') id;
select test_assert((select o.lines=q.lines and o.total_kg=2.5 and o.total_items=12 and o.estimated_total=q.total from orders o join created_staff c on c.id=o.id join trade_quotes q on q.id='staff'), 'staff conversion preserves agreed lines/prices and separate totals');
select test_assert(convert_trade_quote_to_order('staff','')=(select id from created_staff),'staff conversion stays idempotent');
select test_assert((select count(*)=2 from inventory_reservations where order_id=(select id from created_staff)),'existing reservation flow retained');
select test_error($q$select convert_trade_quote_to_order('mismatch','')$q$,'quote_stock_unit_mismatch');
select test_assert((select converted_order_id is null and status='accepted' from trade_quotes where id='mismatch'),'unit failure creates no order and leaves quote intact');
select test_error($q$select convert_trade_quote_to_order('unavailable','')$q$,'insufficient_available_stock');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select test_error($q$select partner_accept_quote('buyer')$q$,'quote_not_found');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
create temp table created_buyer as select partner_accept_quote('buyer') id;
select test_assert((select o.lines=q.lines and o.total_kg=0 and o.total_items=3 and o.estimated_total=q.total from orders o join created_buyer c on c.id=o.id join trade_quotes q on q.id='buyer'),'buyer conversion preserves piece-based quote');
select test_assert(partner_accept_quote('buyer')=(select id from created_buyer),'buyer conversion stays idempotent');
select test_assert((select total_kg=2 and lines='[{"qty":2,"unit":"kg"}]'::jsonb from orders where id='historic'),'historical order untouched');
set role authenticated;
select test_error($q$select * from trade_quote_quantity_totals('[{"qty":1,"unit":"kg"}]')$q$,'permission denied');
select test_error($q$select trade_quote_assert_stock_units('[]')$q$,'permission denied');
reset role;
