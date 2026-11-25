create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema storage;
grant usage on schema auth to anon,authenticated,service_role;

create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
create table public.staff_roles(user_id uuid primary key, role text not null, workspace_modules text[]);
create table public.trade_opportunities(id text primary key, contact text not null);
create table public.trade_quotes(id text primary key, opportunity_id text references public.trade_opportunities(id));
create table public.wholesale_accounts(id text primary key, opportunity_id text references public.trade_opportunities(id));
create table public.orders(
  id text primary key, ts timestamptz not null default now(),
  type text not null, status text not null, stage text, contact text not null,
  quote_id text references public.trade_quotes(id), partner_account_id text references public.wholesale_accounts(id)
);
create table public.customer_directory_order_links(
  order_id text primary key references public.orders(id) on delete cascade,
  opportunity_id text not null references public.trade_opportunities(id) on delete cascade,
  linked_at timestamptz not null default now()
);
create function public.discovery_trade_contact_key(value text) returns text
language sql immutable set search_path=public as $$
  select case when position('@' in value)>0 then lower(trim(value))
    when regexp_replace(value,'[^0-9]','','g') like '84%' then '0'||substr(regexp_replace(value,'[^0-9]','','g'),3)
    else coalesce(nullif(regexp_replace(value,'[^0-9]','','g'),''),lower(trim(value))) end
$$;
create table storage.buckets(
  id text primary key,name text not null,public boolean not null,
  file_size_limit bigint,allowed_mime_types text[]
);
create table storage.objects(bucket_id text references storage.buckets(id),name text,primary key(bucket_id,name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated,service_role;
grant select on storage.objects to anon,authenticated;
grant select,insert on storage.objects to service_role;

insert into auth.users values
  ('00000000-0000-4000-8000-000000000001','manager@example.test',now(),false),
  ('00000000-0000-4000-8000-000000000002','regular@example.test',now(),false),
  ('00000000-0000-4000-8000-000000000003','unconfirmed@example.test',null,false),
  ('00000000-0000-4000-8000-000000000004','orders-only@example.test',now(),false);
insert into public.staff_roles values
  ('00000000-0000-4000-8000-000000000001','manager',null),
  ('00000000-0000-4000-8000-000000000003','manager',null),
  ('00000000-0000-4000-8000-000000000004','manager',array['work','orders']);
insert into public.trade_opportunities values
  ('customer-one','0903000001'),('customer-two','0903000002'),
  ('customer-duplicate','+84903000002');
insert into public.trade_quotes values ('quote-one','customer-one');
insert into public.wholesale_accounts values ('account-two','customer-two');
insert into public.orders(id,type,status,stage,contact) values
  ('old-open-wholesale','wholesale','pending','confirmed','+84903000001'),
  ('old-complete-wholesale','wholesale','completed','completed','0903000001'),
  ('old-open-retail','retail','pending','confirmed','0903000001');
