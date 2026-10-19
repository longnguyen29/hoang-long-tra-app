-- Synthetic existing modules for a new, disposable PostgreSQL cluster only.
-- No production connection, customer data, credentials, or inferred inventory.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
grant usage on schema public, auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select current_setting('request.jwt.claim.role', true)
$$;
create table public.staff_roles (user_id uuid primary key references auth.users(id), role text);
create table public.staff_profiles (user_id uuid primary key references auth.users(id), display_name text);
create function public.is_staff_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from staff_roles where user_id = auth.uid() and role in ('admin', 'manager'))
$$;
create function public.is_staff() returns boolean language sql stable as $$
  select public.is_staff_manager()
$$;

insert into auth.users values
  ('00000000-0000-4000-8000-000000000001', 'manager@example.test', now()),
  ('00000000-0000-4000-8000-000000000002', 'worker@example.test', now()),
  ('00000000-0000-4000-8000-000000000003', 'customer@example.test', now());
insert into public.staff_roles values
  ('00000000-0000-4000-8000-000000000001', 'manager'),
  ('00000000-0000-4000-8000-000000000002', 'employee');
insert into public.staff_profiles values
  ('00000000-0000-4000-8000-000000000001', 'Synthetic manager'),
  ('00000000-0000-4000-8000-000000000002', 'Synthetic worker');

-- Match the existing grower-profile contract and its deliberately narrow public RPC.
create table public.vendors (
  id text primary key,
  name text not null,
  region text not null default '',
  photo text not null default '',
  crops text not null default '',
  story_vi text not null default '',
  story_en text not null default '',
  phone text not null default '',
  note text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.vendors enable row level security;
grant select, insert, update, delete on public.vendors to authenticated;
create policy fixture_vendor_staff on public.vendors for all to authenticated
  using(public.is_staff()) with check(public.is_staff());
create function public.list_public_vendors()
returns table (id text, name text, region text, photo text, crops text, story_vi text, story_en text, sort_order integer)
language sql stable security definer set search_path = public as $$
  select v.id, v.name, v.region, v.photo, v.crops, v.story_vi, v.story_en, v.sort_order
  from vendors v where v.active order by v.sort_order, v.name
$$;
revoke all on function public.list_public_vendors() from public;
grant execute on function public.list_public_vendors() to anon, authenticated;
insert into public.vendors(id, name, region, crops, phone, note)
values ('existing-grower', 'Synthetic existing grower', 'Hà Giang', 'Trà', '0900000000', 'Private existing grower note');

create table public.catalog_products (
  id text primary key,
  name jsonb not null,
  kind text not null default 'tea',
  line text not null default 'everyday',
  available boolean not null default true,
  pack_size text not null default '',
  price numeric,
  batch text not null default '',
  stock_ha_giang integer,
  stock_soc_son integer
);
create table public.catalog_variants (
  product_id text not null references public.catalog_products(id),
  weight text not null,
  price numeric,
  stock_ha_giang integer,
  stock_soc_son integer,
  primary key(product_id, weight)
);
alter table public.catalog_products enable row level security;
alter table public.catalog_variants enable row level security;
grant select on public.catalog_products, public.catalog_variants to anon, authenticated;
create policy fixture_catalog_public on public.catalog_products for select using(true);
create policy fixture_variants_public on public.catalog_variants for select using(true);

insert into public.catalog_products(id, name, price, pack_size, batch, stock_ha_giang, stock_soc_son) values
  ('hong-tra-shan-mat', '{"vi":"Hồng Trà Shan Mật","en":"Honey Black Tea"}', 245000, '1kg', 'Synthetic existing batch', 7, 3),
  ('hong-tra-shan-khoi', '{"vi":"Hồng Trà Shan Khói","en":"Smoked Black Tea"}', 265000, '1kg', '', 2, 4),
  ('luc-tra-shan-moc', '{"vi":"Lục Trà Shan Mộc","en":"Rustic Green Tea"}', 225000, '1kg', '', 4, 1),
  ('luc-tra-ngoc-lan', '{"vi":"Lục Trà Hoa Ngọc Lan","en":"Magnolia Green Tea"}', 250000, '1kg', '', 5, 2),
  ('luc-tra-lai-tuyen-chon', '{"vi":"Lục Trà Hoa Lài Tuyển Chọn","en":"Select Jasmine Green Tea"}', 255000, '1kg', '', 3, 6),
  ('luc-tra-hoa-sen', '{"vi":"Lục Trà Hoa Sen","en":"Lotus Green Tea"}', 275000, '1kg', '', 1, 2),
  ('existing-unavailable', '{"vi":"Trà hiện đang ngừng bán"}', null, '100g', '', null, null);
update public.catalog_products set available = false where id = 'existing-unavailable';
insert into public.catalog_variants values
  ('hong-tra-shan-mat', '100g', 35000, 8, 2),
  ('hong-tra-shan-mat', '250g', 80000, 4, 1);

create table public.tea_batches (
  id text primary key,
  code text unique not null,
  product_id text references public.catalog_products(id),
  status text not null default 'draft',
  available_kg numeric not null default 0,
  reserved_kg numeric not null default 0
);
create table public.supply_items (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  unit text not null,
  stock_on_hand numeric not null default 0,
  unit_cost numeric not null default 0
);
insert into public.tea_batches values
  ('existing-batch', 'TEST-BATCH-ONLY', 'hong-tra-shan-mat', 'released', 20, 3);
insert into public.supply_items values
  ('00000000-0000-4000-8000-000000000010', 'TEST-TEA', 'Synthetic existing tea material', 'kg', 20, 190000);

create function public.test_assert(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'ASSERT: %', p_label; end if;
end
$$;
create function public.test_error(p_sql text, p_expected text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_expected in SQLERRM) > 0 then return; end if;
    raise exception 'ASSERT: expected %, got %', p_expected, SQLERRM;
  end;
  raise exception 'ASSERT: expected exception %', p_expected;
end
$$;

-- Exercise the current principal's real table privileges and RLS, rather than
-- assuming a missing GRANT is the only valid way to hide internal rows.
create function public.test_development_private() returns boolean language plpgsql as $$
declare table_name text; visible_rows bigint;
begin
  foreach table_name in array array[
    'product_development_projects', 'supplier_profiles', 'product_development_catalog_links',
    'product_development_suppliers', 'product_development_resources', 'product_development_events'
  ] loop
    begin
      execute format('select count(*) from public.%I', table_name) into visible_rows;
      if visible_rows <> 0 then return false; end if;
    exception when insufficient_privilege then
      null;
    end;
  end loop;
  return true;
end
$$;
