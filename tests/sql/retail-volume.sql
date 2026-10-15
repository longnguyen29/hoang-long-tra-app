select public.test_assert(public.retail_package_grams('0,5 kg')=500,'decimal kg');
select public.test_assert(public.retail_package_grams('500 g')=500,'plain grams');
select public.test_assert(public.retail_package_grams('1 viên (8g)')=8,'single pellet');
select public.test_assert(public.retail_package_grams('bánh (0.357 kg)')=357,'single cake');
select public.test_assert(public.retail_package_grams('20 x 8g')=160,'explicit multipack');
select public.test_assert(public.retail_package_grams('2 × 0,5kg')=1000,'multipack kg');
select public.test_assert(public.retail_package_grams('20 viên') is null,'never infer pellet mass');
select public.test_assert(public.retail_package_grams('20 viên (8g)') is null,'ambiguous per-piece multipack');
select public.test_assert(public.retail_package_grams('100g / 500g') is null,'ambiguous multiple weights');
select public.test_assert(public.retail_package_grams('0.0001kg') is null,'maximum three decimal digits');
select public.test_assert(public.retail_package_grams('0g') is null,'zero weight unknown');
select public.test_assert(not has_function_privilege('anon','public.submit_retail_volume_order(text,text,text,text,text,jsonb,integer,numeric,text)','execute'),'anonymous cannot call checkout engine');
select public.test_assert(not has_function_privilege('authenticated','public.submit_retail_volume_order(text,text,text,text,text,jsonb,integer,numeric,text)','execute'),'ordinary login cannot call checkout engine');
select public.test_assert(has_function_privilege('service_role','public.submit_retail_volume_order(text,text,text,text,text,jsonb,integer,numeric,text)','execute'),'API service role can call engine');
select public.test_assert(has_function_privilege('anon','public.submit_retail_order(text,text,text,text,text,jsonb,integer,numeric,jsonb,text)','execute'),'legacy checkout permissions preserved');

create temp table results(label text,id text);
insert into results values('below',public.test_retail('[{"productId":"loose","qty":4,"price":100000,"unit":"kg"}]',400000));
insert into results values('free',public.test_retail('[{"productId":"loose","qty":5,"price":100000,"unit":"kg"}]',500000));
insert into results values('twenty',public.test_retail('[{"productId":"loose","qty":20,"price":100000,"unit":"kg","name":{"vi":"Forged"}}]',1940000));
insert into results values('fifty',public.test_retail('[{"productId":"loose","qty":50,"price":100000,"unit":"kg"}]',4750000));
insert into results values('hundred',public.test_retail('[{"productId":"loose","qty":100,"price":100000,"unit":"kg"}]',9300000));
insert into results values('mixed',public.test_retail('[{"productId":"loose","qty":20,"price":100000,"unit":"kg"},{"productId":"goods","qty":100,"price":200000,"unit":"cái"},{"productId":"unknown","qty":100,"price":50000,"unit":"pcs"}]',26940000));
insert into results values('pack',public.test_retail('[{"productId":"reserve","qty":40,"price":90000,"unit":"pcs"}]',3492000));
insert into results values('variant',public.test_retail('[{"productId":"variant","weight":"500g","qty":10,"price":120000,"unit":"pcs"}]',1200000));
insert into results values('unknown-variant',public.test_retail('[{"productId":"variant","weight":"20 viên","qty":10,"price":180000,"unit":"pcs"}]',1800000));

select public.test_assert((select not(o.retail_pricing->>'free_shipping')::boolean from public.orders o join results r on r.id=o.id where r.label='below'),'4kg no free shipping');
select public.test_assert((select (o.retail_pricing->>'free_shipping')::boolean and (o.retail_pricing->>'discount_percent')::int=0 from public.orders o join results r on r.id=o.id where r.label='free'),'5kg free shipping, no percentage tier');
select public.test_assert((select (o.retail_pricing->>'discount_percent')::int=3 and (o.retail_pricing->>'discount_amount')::numeric=60000 from public.orders o join results r on r.id=o.id where r.label='twenty'),'20kg3%');
select public.test_assert((select (o.retail_pricing->>'discount_percent')::int=5 from public.orders o join results r on r.id=o.id where r.label='fifty'),'50kg5%');
select public.test_assert((select (o.retail_pricing->>'discount_percent')::int=7 and (o.retail_pricing->>'discount_amount')::numeric=700000 from public.orders o join results r on r.id=o.id where r.label='hundred'),'100kg7%, no tier stacking');
select public.test_assert((select (o.retail_pricing->>'tea_grams')::numeric=20000 and (o.retail_pricing->>'eligible_tea_subtotal')::numeric=2000000 and (o.retail_pricing->>'discount_percent')::int=3 from public.orders o join results r on r.id=o.id where r.label='mixed'),'goods and unknown tea excluded from mass and discount money');
select public.test_assert((select (o.lines->1->>'price')::numeric=200000 and (o.lines->2->>'price')::numeric=50000 from public.orders o join results r on r.id=o.id where r.label='mixed'),'ineligible line prices unchanged');
select public.test_assert((select o.lines->0->'name'->>'vi'='Trà kg' and (o.lines->0->>'listPrice')::numeric=100000 and (o.lines->0->>'price')::numeric=97000 and (o.lines->0->>'total')::numeric=1940000 from public.orders o join results r on r.id=o.id where r.label='twenty'),'canonical name and net unit price with gross evidence');
select public.test_assert((select o.total_kg=20 and o.total_items=40 and (o.retail_pricing->>'discount_percent')::int=3 from public.orders o join results r on r.id=o.id where r.label='pack'),'40 half-kilo packs qualify20kg');
select public.test_assert((select o.total_kg=5 and (o.retail_pricing->>'free_shipping')::boolean from public.orders o join results r on r.id=o.id where r.label='variant'),'selected variant mass');
select public.test_assert((select o.total_kg=0 and not(o.retail_pricing->>'free_shipping')::boolean from public.orders o join results r on r.id=o.id where r.label='unknown-variant'),'unknown selected variant does not fallback to parent mass');
select public.test_assert((select sold_count=199 from public.catalog_products where id='loose'),'legacy sold counts preserved');
select public.test_assert((select stock_soc_son=801 and stock_ha_giang=1000 from public.catalog_products where id='loose'),'legacy stock deductions preserved');
select public.test_assert((select stock_soc_son=990 from public.catalog_variants where product_id='variant' and weight='500g'),'variant stock deductions preserved');
select public.test_assert((select bool_and(o.promo is null and o.tier is null) from public.orders o join results r on r.id=o.id),'no invented promo code or globally discounted goods tier');

select public.test_error($q$select public.test_retail('[{"productId":"loose","qty":20,"price":1,"unit":"kg"}]',20)$q$,'price_changed');
select public.test_error($q$select public.test_retail('[{"productId":"loose","qty":20,"price":100000,"unit":"kg"}]',2000000)$q$,'price_changed');
select public.test_error($q$select public.test_retail('[{"productId":"loose","qty":20,"price":100000,"unit":"pcs"}]',1940000)$q$,'cart_changed');
select public.test_error($q$select public.test_retail('[{"productId":"loose","qty":1,"price":100000,"unit":"kg"},{"productId":"loose","qty":1,"price":100000,"unit":"kg"}]',200000)$q$,'invalid_checkout');
select public.test_error($q$select public.test_retail('[{"productId":"loose","qty":1.5,"price":100000,"unit":"kg"}]',150000,1)$q$,'invalid_checkout');
select public.test_error($q$select public.test_retail('[{"productId":"loose","qty":1001,"price":100000,"unit":"kg"}]',93093000)$q$,'invalid_checkout');
select public.test_error($q$select public.test_retail('[{"productId":"sample","qty":1,"price":10000,"unit":"kg"}]',10000)$q$,'cart_changed');
select public.test_error($q$select public.test_retail('[{"productId":"disabled","qty":1,"price":100000,"unit":"kg"}]',100000)$q$,'cart_changed');
select public.test_error($q$select public.test_retail('[{"productId":"variant","qty":1,"price":1,"unit":"pcs"}]',1)$q$,'cart_changed');
select public.test_error($q$select public.test_retail('[{"productId":"missing","qty":1,"price":100000,"unit":"kg"}]',100000)$q$,'cart_changed');
select public.test_error($q$select public.test_retail('[{"productId":"limited","qty":2,"price":100000,"unit":"pcs"}]',200000)$q$,'out_of_stock');
select public.test_assert((select sold_count=0 and stock_soc_son=1 from public.catalog_products where id='limited'),'failed transaction leaves stock/sold unchanged');
select public.test_assert((select count(*)=9 from public.orders),'failed submissions leave no orders');

update public.catalog_products set price=90001 where id='reserve';
insert into results values('rounding',public.test_retail('[{"productId":"reserve","qty":41,"price":90001,"unit":"pcs"}]',3579340));
select public.test_assert((select o.estimated_total=(select sum((x->>'price')::numeric*(x->>'qty')::numeric) from jsonb_array_elements(o.lines)x)
 from public.orders o join results r on r.id=o.id where r.label='rounding'),'stored unit prices sum exactly to stored total for existing line-removal checks');
select public.test_assert((select round(o.estimated_total,2)=3579340 and (o.retail_pricing->>'total')::numeric=3579340
 from public.orders o join results r on r.id=o.id where r.label='rounding'),'sub-VND division does not change customer payable or receivable');
select public.test_assert((select sum((x->>'discountAmount')::numeric)=110701 from public.orders o join results r on r.id=o.id
 cross join lateral jsonb_array_elements(o.lines)x where r.label='rounding'),'whole-VND tea-subtotal rounding allocated exactly');
select public.test_assert((select retail_pricing is not null from public.orders where id=(select id from results where label='rounding')),'pricing snapshot retained');

update public.catalog_products set price=1.25 where id='goods';
insert into results values('fractional-gross',public.test_retail('[{"productId":"goods","qty":1,"price":1.25,"unit":"cái"}]',1.25));
select public.test_assert((select o.estimated_total=1.25 and round(o.estimated_total,2)=(o.retail_pricing->>'total')::numeric
 and (o.lines->0->>'price')::numeric=1.25 and (o.retail_pricing->>'discount_amount')::numeric=0
 from public.orders o join results r on r.id=o.id where r.label='fractional-gross'),'fractional catalogue gross keeps two-decimal payable consistent');
select public.test_assert((select o.retail_pricing->>'policy'='retail-tea-volume-2026-10-14-v1'
 from public.orders o join results r on r.id=o.id where r.label='fractional-gross'),'snapshot policy version matches storefront');
