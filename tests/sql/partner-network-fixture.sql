-- Representative existing schemas/auth claims for a disposable PGlite database.
-- Intentionally does not contain production data, keys, URLs or credentials.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
grant usage on schema public,auth to anon,authenticated,service_role;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
create table public.staff_roles(user_id uuid primary key references auth.users(id),role text);
create function public.is_staff_manager() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from staff_roles where user_id=auth.uid() and role in ('admin','manager'))$$;
create table public.discovery_prospects(id uuid primary key,name text,region text);
create table public.discovery_contacts(id uuid primary key,prospect_id uuid,kind text,value text);
create table public.trade_opportunities(id text primary key,contact_key text unique,business_name text,contact text,stage text,source_type text,source_id text,monthly_potential_kg numeric,next_action text,next_action_at timestamptz,notes text,discovery_prospect_id uuid,created_at timestamptz default now(),updated_at timestamptz default now());
alter table public.trade_opportunities enable row level security;
grant select on public.trade_opportunities to authenticated;
create policy fixture_staff_opportunity_read on public.trade_opportunities for select using(public.is_staff_manager());
create table public.wholesale_accounts(id text primary key,contact text,business_name text,delivery_address text,opportunity_id text);
create table public.trade_quotes(id text primary key,opportunity_id text,converted_order_id text);
create table public.orders(id text primary key,ts timestamptz default now(),type text,status text,customer_name text,contact text,address text,quote_id text,partner_account_id text);
create table public.receivables(id text primary key,order_id text unique,total numeric,paid numeric default 0,status text);
create table public.receivable_payments(id text primary key,receivable_id text,amount numeric,paid_at timestamptz default now());
create function public.discovery_trade_contact_key(value text) returns text language sql immutable as $$select case when position('@' in value)>0 then lower(trim(value)) when regexp_replace(value,'[^0-9]','','g') like '84%' then '0'||substr(regexp_replace(value,'[^0-9]','','g'),3) else coalesce(nullif(regexp_replace(value,'[^0-9]','','g'),''),lower(trim(value))) end$$;
insert into auth.users values
 ('00000000-0000-4000-8000-000000000001','admin@example.test',now()),
 ('00000000-0000-4000-8000-000000000002','manager@example.test',now()),
 ('00000000-0000-4000-8000-000000000003','a@example.test',now()),
 ('00000000-0000-4000-8000-000000000004','b@example.test',now()),
 ('00000000-0000-4000-8000-000000000005','unconfirmed@example.test',null),
 ('00000000-0000-4000-8000-000000000006','employee@example.test',now());
insert into public.staff_roles values ('00000000-0000-4000-8000-000000000001','admin'),('00000000-0000-4000-8000-000000000002','manager'),('00000000-0000-4000-8000-000000000006','employee');
create function public.test_assert(p_ok boolean,p_label text) returns void language plpgsql as $$begin if p_ok is distinct from true then raise exception 'ASSERT: %',p_label; end if; end$$;
create function public.test_error(p_sql text,p_expected text) returns void language plpgsql as $$begin
 begin execute p_sql; exception when others then if position(p_expected in SQLERRM)>0 then return; end if; raise exception 'ASSERT: expected %, got %',p_expected,SQLERRM; end;
 raise exception 'ASSERT: expected exception %',p_expected;
end$$;
