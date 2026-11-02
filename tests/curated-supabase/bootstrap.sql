-- Local fixture: real Supabase auth.users/auth.uid with minimal representative
-- business tables and role policies. No production records or cloud calls.
create table public.staff_roles(user_id uuid primary key references auth.users(id), role text not null);
alter table public.staff_roles enable row level security;
create policy staff_self_read on public.staff_roles for select to authenticated using(user_id=auth.uid());
grant select on public.staff_roles to authenticated;
create function public.is_staff_manager() returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from staff_roles where user_id=auth.uid() and role in ('admin','manager'))
$$;
revoke all on function public.is_staff_manager() from public;
grant execute on function public.is_staff_manager() to authenticated;
create table public.vendors(id text primary key,name text not null,active boolean not null default true,supplier_only boolean not null default false,phone text not null default '',note text not null default '');
create table public.catalog_products(id text primary key,kind text not null default 'tea',vendor_id text references public.vendors(id),batch text not null default '',available boolean not null default false,name jsonb not null default '{}',price numeric);
create table public.tea_batches(id text primary key,code text not null unique,product_id text references public.catalog_products(id),status text not null default 'draft',producer text not null default '',origin text not null default '',process text not null default '',cultivar text not null default 'Shan Tuyết',harvest_date date,season text not null default '',grade text not null default '');
alter table public.catalog_products enable row level security;
alter table public.vendors enable row level security;
alter table public.tea_batches enable row level security;
grant select,insert,update,delete on public.catalog_products,public.vendors,public.tea_batches to authenticated;
create policy catalog_manager_all on public.catalog_products for all to authenticated using(public.is_staff_manager()) with check(public.is_staff_manager());
create policy vendor_manager_all on public.vendors for all to authenticated using(public.is_staff_manager()) with check(public.is_staff_manager());
create policy batch_manager_all on public.tea_batches for all to authenticated using(public.is_staff_manager()) with check(public.is_staff_manager());
