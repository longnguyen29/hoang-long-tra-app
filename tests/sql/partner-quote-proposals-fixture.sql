-- Disposable fixture adds only columns used by existing quote conversion.
create function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from staff_roles where user_id=auth.uid())$$;
create table public.catalog_products(id text primary key,line text,name jsonb,kind text,pack_size text,available boolean,stock_ha_giang numeric,stock_soc_son numeric);
create table public.catalog_variants(product_id text,weight text,stock_ha_giang numeric,stock_soc_son numeric,primary key(product_id,weight));
alter table public.orders add column lines jsonb default '[]',add column note text,add column total_kg numeric,add column total_items numeric,add column estimated_total numeric,add column payment_method text,add column unread boolean,add column tracking_code text;
alter table public.trade_quotes add column partner_account_id text,add column customer_name text,add column contact text,add column address text,add column status text default 'draft',add column lines jsonb default '[]',add column subtotal numeric,add column discount_percent numeric,add column total numeric,add column payment_method text,add column valid_until date,add column terms text,add column note text,add column created_by text,add column sent_at timestamptz,add column accepted_at timestamptz,add column created_at timestamptz default now(),add column updated_at timestamptz default now();
alter table public.wholesale_accounts add column user_id uuid,add column wholesale_verified boolean default false;
create table public.inventory_reservations(id text primary key,order_id text,product_id text,variant_weight text,quantity numeric);
create function public.assert_inventory_available(jsonb) returns void language plpgsql as $$begin return;end$$;
insert into public.catalog_products values('test-tea','everyday','{"vi":"Trà thử"}','tea','kg',true,null,null),('test-cake','reserve','{"vi":"Bánh thử"}','tea','bánh',true,null,null);
insert into public.partner_network_partners(id,user_id,code,status,business_name,contact_name,email,phone,region,partner_type) values
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000003','TEST-A','approved','Test A','A','a@example.test','0907000001','Test','sales_rep'),
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000004','TEST-B','approved','Test B','B','b@example.test','0907000002','Test','sales_rep');
insert into public.trade_opportunities(id,contact_key,business_name,contact,stage) values('opp-test-a','0907000011','Test shop','0907000011','lead');
insert into public.partner_network_referrals(id,partner_id,business_name,contact_name,contact,contact_key,location,product_interest,status,opportunity_id) values('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','Test shop','Buyer','0907000011','0907000011','Test address','Tea','accepted','opp-test-a');
insert into public.wholesale_accounts(id,opportunity_id,user_id,wholesale_verified)values('buyer-a','opp-test-a','00000000-0000-4000-8000-000000000005',true);
