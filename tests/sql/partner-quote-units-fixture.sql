create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon;
create function public.is_staff() returns boolean language sql stable as $$select auth.uid()='00000000-0000-4000-8000-000000000001'$$;
create table public.catalog_products(id text primary key,line text,kind text,pack_size text,stock_ha_giang numeric,stock_soc_son numeric);
create table public.catalog_variants(product_id text,weight text,stock_ha_giang numeric,stock_soc_son numeric,primary key(product_id,weight));
create table public.wholesale_accounts(id text primary key,user_id uuid,wholesale_verified boolean);
create table public.trade_opportunities(id text primary key,stage text,next_action text,next_action_at timestamptz,updated_at timestamptz);
create table public.trade_quotes(id text primary key,partner_account_id text,opportunity_id text,status text,converted_order_id text,valid_until date,lines jsonb,total numeric,customer_name text,contact text,address text,note text,payment_method text,accepted_at timestamptz,updated_at timestamptz);
create table public.orders(id text primary key,ts timestamptz,type text,customer_name text,contact text,address text,note text,lines jsonb,total_kg numeric,total_items numeric,estimated_total numeric,payment_method text,status text,unread boolean,partner_account_id text,quote_id text,tracking_code text);
create table public.inventory_reservations(id text primary key,order_id text,product_id text,variant_weight text,quantity numeric);
-- The established availability RPC is stubbed: this suite isolates new unit
-- guards and conversions rather than pretending to exercise the stock engine.
create function public.assert_inventory_available(lines jsonb) returns void language plpgsql as $$begin
 if lines->0->>'productId'='unavailable' then raise exception 'insufficient_available_stock'; end if;
end$$;
create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERT: %',label; end if; end$$;
create function public.test_error(sql_value text,expected text) returns void language plpgsql as $$begin
 begin execute sql_value; exception when others then if position(expected in SQLERRM)>0 then return; end if; raise exception 'ASSERT: expected %, got %',expected,SQLERRM; end;
 raise exception 'ASSERT: expected exception %',expected;
end$$;
