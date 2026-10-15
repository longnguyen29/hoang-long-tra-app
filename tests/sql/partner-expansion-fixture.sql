-- Additional existing production quote columns for disposable combined migration QA.
alter table public.trade_quotes add column partner_account_id text,add column customer_name text,add column contact text,add column address text,
 add column lines jsonb default '[]',add column subtotal numeric,add column discount_percent numeric,add column payment_method text,
 add column valid_until date,add column terms text,add column created_by text,add column accepted_at timestamptz,add column created_at timestamptz default now();

alter table public.wholesale_accounts add column user_id uuid,add column wholesale_verified boolean default false;
create table public.inventory_reservations(id text primary key,order_id text,product_id text,variant_weight text,quantity numeric);
create function public.assert_inventory_available(jsonb) returns void language plpgsql as $$begin return;end$$;
create function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from staff_roles where user_id=auth.uid())$$;
