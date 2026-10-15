alter table public.orders add column vat numeric,add column promo jsonb,add column total_kg numeric,add column total_items integer,add column estimated_total numeric,add column tier jsonb,add column payment_method text,add column unread boolean;
create table public.catalog_products(id text primary key,line text,kind text not null default 'tea',pack_size text,name jsonb,price numeric,available boolean default true,sold_count integer default 0,stock_ha_giang integer,stock_soc_son integer);
create table public.catalog_variants(product_id text,weight text,price numeric,stock_ha_giang integer,stock_soc_son integer,primary key(product_id,weight));
create table public.promos(id text primary key,code text unique,percent numeric,owner_name text,owner_contact text,kind text,active boolean,max_uses integer,uses integer);
create table public.referral_rewards(id text primary key,referrer_contact text,referred_contact text,referral_code text,order_id text,reward_code text);
insert into public.catalog_products(id,line,kind,pack_size,name,price,stock_ha_giang,stock_soc_son)values('retail-test','everyday','tea','1kg','{"vi":"Trà thử"}',100000,1000,1000);
create function public.retail_test_input(contact_value text default '0905550001',qty integer default 1) returns jsonb language sql as $$
 select jsonb_build_object('name','Synthetic retail buyer','contact',contact_value,'address','PRIVATE_ADDRESS_NOT_FOR_PARTNER','tax','PRIVATE_TAX','note','PRIVATE_BUYER_NOTE',
 'lines',jsonb_build_array(jsonb_build_object('productId','retail-test','weight',null,'qty',qty,'unit','kg','price',100000,'name','Trà thử')),
 'total_items',qty,'total',100000*qty,'payment','qr')
$$;
