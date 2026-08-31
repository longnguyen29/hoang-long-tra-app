-- Material master, product BOM and automatic estimated order costs.
-- Additive: existing manual order costs remain authoritative and untouched.

create table if not exists supply_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(btrim(code)) between 1 and 40),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  category text not null default 'packaging'
    check (category in ('tea','packaging','label','production','labor','other')),
  unit text not null default 'unit'
    check (unit in ('kg','g','unit','roll','box')),
  stock_on_hand numeric(14,3) not null default 0 check (stock_on_hand >= 0),
  reorder_point numeric(14,3) not null default 0 check (reorder_point >= 0),
  target_stock numeric(14,3) not null default 0 check (target_stock >= 0),
  lead_time_days integer not null default 0 check (lead_time_days between 0 and 365),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  supplier_name text not null default '',
  supplier_contact text not null default '',
  note text not null default '',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_bom_components (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references catalog_products(id) on delete cascade,
  variant_weight text not null default '',
  supply_item_id uuid not null references supply_items(id) on delete restrict,
  quantity_per_sale numeric(14,4) not null check (quantity_per_sale > 0),
  waste_percent numeric(6,3) not null default 0 check (waste_percent between 0 and 100),
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_bom_component_unique unique(product_id,variant_weight,supply_item_id)
);

create index if not exists supply_items_active_idx on supply_items(active,category,name);
create index if not exists product_bom_lookup_idx on product_bom_components(product_id,variant_weight);

alter table supply_items enable row level security;
alter table product_bom_components enable row level security;

create policy "supply_items: staff select" on supply_items for select using (is_staff());
create policy "supply_items: manager insert" on supply_items for insert to authenticated with check (is_staff_manager());
create policy "supply_items: manager update" on supply_items for update using (is_staff_manager()) with check (is_staff_manager());
create policy "supply_items: manager delete" on supply_items for delete using (is_staff_manager());

create policy "product_bom: staff select" on product_bom_components for select using (is_staff());
create policy "product_bom: manager insert" on product_bom_components for insert to authenticated with check (is_staff_manager());
create policy "product_bom: manager update" on product_bom_components for update using (is_staff_manager()) with check (is_staff_manager());
create policy "product_bom: manager delete" on product_bom_components for delete using (is_staff_manager());

alter table order_costs alter column created_by drop not null;
alter table order_costs add column if not exists source_type text not null default 'manual'
  check (source_type in ('manual','bom'));
alter table order_costs add column if not exists source_key text;
alter table order_costs add column if not exists estimated boolean not null default false;

create unique index if not exists order_costs_source_key_unique
  on order_costs(order_id,source_key) where source_key is not null;

create or replace function sync_order_bom_costs_internal(p_order_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  component record;
begin
  if not exists(select 1 from orders where id=p_order_id) then raise exception 'order_not_found'; end if;

  for component in
    with order_lines as (
      select
        coalesce(line->>'productId',line->>'product_id') product_id,
        coalesce(line->>'weight',line->>'variant_weight','') variant_weight,
        greatest(0,coalesce(nullif(line->>'qty','')::numeric,nullif(line->>'quantity','')::numeric,0)) sale_quantity
      from orders o cross join lateral jsonb_array_elements(o.lines) line
      where o.id=p_order_id
    )
    select
      s.id supply_item_id,s.name,s.category,s.unit,s.unit_cost,
      sum(l.sale_quantity*b.quantity_per_sale*(1+b.waste_percent/100)) quantity
    from order_lines l
    join product_bom_components b on b.product_id=l.product_id and b.variant_weight=l.variant_weight
    join supply_items s on s.id=b.supply_item_id and s.active=true
    where l.sale_quantity>0
    group by s.id,s.name,s.category,s.unit,s.unit_cost
  loop
    insert into order_costs(
      order_id,category,description,quantity,unit_cost,payment_status,incurred_on,note,
      created_by,source_type,source_key,estimated
    ) values(
      p_order_id,
      case when component.category='tea' then 'tea'
           when component.category in ('packaging','label') then 'packaging'
           when component.category in ('production','labor') then component.category
           else 'other' end,
      'Định mức · '||component.name,
      component.quantity,component.unit_cost,'planned',current_date,
      'Tự động tính từ định mức sản phẩm · đơn vị '||component.unit,
      auth.uid(),'bom','bom:'||component.supply_item_id::text,true
    )
    on conflict(order_id,source_key) where source_key is not null do update set
      category=excluded.category,
      description=excluded.description,
      quantity=excluded.quantity,
      unit_cost=case when order_costs.estimated then excluded.unit_cost else order_costs.unit_cost end,
      note=excluded.note,
      updated_at=now()
    where order_costs.source_type='bom';
    v_count:=v_count+1;
  end loop;

  delete from order_costs c
  where c.order_id=p_order_id and c.source_type='bom' and c.estimated=true
    and not exists (
      select 1
      from orders o cross join lateral jsonb_array_elements(o.lines) line
      join product_bom_components b
        on b.product_id=coalesce(line->>'productId',line->>'product_id')
       and b.variant_weight=coalesce(line->>'weight',line->>'variant_weight','')
      where o.id=p_order_id and c.source_key='bom:'||b.supply_item_id::text
    );
  return v_count;
end;
$$;

revoke all on function sync_order_bom_costs_internal(text) from public,anon,authenticated;
grant execute on function sync_order_bom_costs_internal(text) to service_role;

create or replace function sync_order_bom_costs(p_order_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  return sync_order_bom_costs_internal(p_order_id);
end;
$$;

revoke all on function sync_order_bom_costs(text) from public,anon;
grant execute on function sync_order_bom_costs(text) to authenticated;

create or replace function trigger_sync_order_bom_costs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform sync_order_bom_costs_internal(new.id);
  return new;
end;
$$;
revoke all on function trigger_sync_order_bom_costs() from public,anon,authenticated;

drop trigger if exists orders_sync_bom_costs on orders;
create trigger orders_sync_bom_costs
after insert or update of lines on orders
for each row execute function trigger_sync_order_bom_costs();

-- Recalculate open orders when a BOM or material price changes.
create or replace function refresh_open_bom_costs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare row_order record;
begin
  for row_order in select id from orders where status in ('pending','confirmed') loop
    perform sync_order_bom_costs_internal(row_order.id);
  end loop;
  return null;
end;
$$;
revoke all on function refresh_open_bom_costs() from public,anon,authenticated;

drop trigger if exists bom_refresh_open_orders on product_bom_components;
create trigger bom_refresh_open_orders after insert or update or delete on product_bom_components
for each statement execute function refresh_open_bom_costs();

drop trigger if exists supply_cost_refresh_open_orders on supply_items;
create trigger supply_cost_refresh_open_orders after update of unit_cost on supply_items
for each statement execute function refresh_open_bom_costs();
