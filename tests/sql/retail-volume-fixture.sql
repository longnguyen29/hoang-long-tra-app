create role anon;
create role authenticated;
create role service_role bypassrls;
grant usage on schema public to anon,authenticated,service_role;
create table public.catalog_products(id text primary key,line text,kind text not null default 'tea',pack_size text,name jsonb,price numeric,
  available boolean default true,sold_count integer default 0,stock_ha_giang integer,stock_soc_son integer);
create table public.catalog_variants(product_id text,weight text,price numeric,stock_ha_giang integer,stock_soc_son integer,primary key(product_id,weight));
create table public.orders(id text primary key,ts timestamptz,type text,customer_name text,contact text,address text,tax_number text,vat numeric,promo jsonb,note text,
  lines jsonb,total_kg numeric,total_items integer,estimated_total numeric,tier jsonb,payment_method text,status text,tracking_code text,unread boolean);
create table public.promos(id text primary key,code text unique,percent numeric,owner_name text,owner_contact text,kind text,active boolean,max_uses integer,uses integer);
create table public.referral_rewards(id text primary key,referrer_contact text,referred_contact text,referral_code text,order_id text,reward_code text);
create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERT: %',label; end if; end$$;
create function public.test_error(sql_value text,expected text) returns void language plpgsql as $$begin
 begin execute sql_value; exception when others then if position(expected in SQLERRM)>0 then return; end if; raise exception 'ASSERT: expected %, got %',expected,SQLERRM; end;
 raise exception 'ASSERT: expected exception %',expected;
end$$;
create function public.test_retail(lines_value jsonb,total_value numeric,items_value integer default null) returns text language plpgsql as $$declare answer text;begin
 select id into answer from public.submit_retail_volume_order('Local fixture','0900000000','Fixture address','','',lines_value,
   coalesce(items_value,(select sum((x->>'qty')::int)::int from jsonb_array_elements(lines_value)x)),total_value,'qr');return answer;end$$;

insert into public.catalog_products(id,line,kind,pack_size,name,price,stock_ha_giang,stock_soc_son) values
 ('loose','everyday','tea','1 kg','{"vi":"Trà kg","en":"Loose tea"}',100000,1000,1000),
 ('reserve','reserve','tea','500 g','{"vi":"Trà gói","en":"Pack tea"}',90000,1000,1000),
 ('unknown','reserve','tea','20 viên','{"vi":"Trà chưa rõ khối lượng"}',50000,null,null),
 ('piece','reserve','tea','1 viên (8g)','{"vi":"Phổ nhĩ viên"}',10000,10000,10000),
 ('goods','everyday','goods','1 kg','{"vi":"Ấm trà"}',200000,null,null),
 ('sample','sample','tea','1 kg','{"vi":"Mẫu thử"}',10000,null,null),
 ('variant','reserve','tea','500g','{"vi":"Trà chọn gói","en":"Variant tea"}',1,null,null),
 ('limited','reserve','tea','500g','{"vi":"Ít tồn"}',100000,0,1),
 ('disabled','everyday','tea','1kg','{"vi":"Đã ngừng"}',100000,null,null);
update public.catalog_products set available=false where id='disabled';
insert into public.catalog_variants(product_id,weight,price,stock_ha_giang,stock_soc_son) values
 ('variant','500g',120000,1000,1000),('variant','20 viên',180000,null,null);
