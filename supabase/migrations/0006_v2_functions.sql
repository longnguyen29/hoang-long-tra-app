-- House of Hoàng Long v2.0 — RPC functions
-- Run after 0005_v2_rls.sql.

-- ---------- track_order now also returns the tracking code (order status page) ----------
-- CREATE OR REPLACE can't change a function's return columns, so drop the 0003 version first.
drop function if exists track_order(text);

create or replace function track_order(p_order_id text)
returns table (id text, status text, tracking_code text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.status, o.tracking_code
  from orders o
  where lower(o.id) = lower(p_order_id)
  limit 1;
$$;

revoke all on function track_order(text) from public;
grant execute on function track_order(text) to anon, authenticated;

-- ---------- has this contact ordered wholesale before? (for the free test-pack offer) ----------
create or replace function has_prior_wholesale_order(p_contact text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from orders
    where type = 'wholesale' and lower(contact) = lower(p_contact)
  );
$$;

revoke all on function has_prior_wholesale_order(text) from public;
grant execute on function has_prior_wholesale_order(text) to anon, authenticated;

-- ---------- verify a wholesale partner ID (no full list exposed) ----------
create or replace function verify_partner_code(p_code text)
returns table (business_name text, contact text)
language sql
stable
security definer
set search_path = public
as $$
  select a.business_name, a.contact
  from wholesale_accounts a
  where upper(a.code) = upper(p_code)
  limit 1;
$$;

revoke all on function verify_partner_code(text) from public;
grant execute on function verify_partner_code(text) to anon, authenticated;

-- ---------- submit a retail order with atomic, race-safe stock deduction ----------
-- Deducts Sóc Sơn stock first, then Tuyên Quang/Hà Giang, per product or per variant
-- (matching p_lines[].productId / p_lines[].weight). Raises an exception (and rolls back
-- everything, including rows already deducted earlier in the same call) if any priced,
-- stock-tracked line no longer has enough stock — e.g. two customers checking out at once.
create or replace function submit_retail_order(
  p_customer_name text,
  p_contact text,
  p_address text,
  p_note text,
  p_lines jsonb,
  p_total_items integer,
  p_estimated_total numeric,
  p_promo jsonb,
  p_payment_method text
)
returns table (id text, ts timestamptz, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_ts timestamptz := now();
  line jsonb;
  v_product_id text;
  v_weight text;
  v_qty integer;
  v_ss integer;
  v_hg integer;
  v_total integer;
  v_ss_after integer;
  v_hg_after integer;
  v_deduct integer;
  v_still_available boolean;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'customer name required';
  end if;
  if p_contact is null or btrim(p_contact) = '' then
    raise exception 'contact required';
  end if;

  v_id := 'order-' || to_char(v_ts, 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4);

  for line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_product_id := line->>'productId';
    v_weight := nullif(line->>'weight', '');
    v_qty := round((line->>'qty')::numeric)::integer;

    if v_product_id is null or v_qty <= 0 then
      continue; -- unlinked line items (e.g. a free test pack) skip stock checks
    end if;

    if v_weight is not null then
      select stock_ha_giang, stock_soc_son into v_hg, v_ss
      from catalog_variants
      where product_id = v_product_id and weight = v_weight
      for update;

      if not found or (v_hg is null and v_ss is null) then
        continue; -- no variant row, or unlimited stock (both null)
      end if;

      v_total := coalesce(v_hg, 0) + coalesce(v_ss, 0);
      if v_total < v_qty then
        raise exception 'out_of_stock:%:%', v_product_id, v_weight;
      end if;

      v_deduct := v_qty;
      v_ss_after := greatest(0, coalesce(v_ss, 0) - v_deduct);
      v_deduct := greatest(0, v_deduct - coalesce(v_ss, 0));
      v_hg_after := greatest(0, coalesce(v_hg, 0) - v_deduct);

      update catalog_variants
      set stock_ha_giang = v_hg_after, stock_soc_son = v_ss_after
      where product_id = v_product_id and weight = v_weight;

      select bool_or(
        (coalesce(cv.stock_ha_giang, 0) + coalesce(cv.stock_soc_son, 0)) > 0
        or (cv.stock_ha_giang is null and cv.stock_soc_son is null)
      )
      into v_still_available
      from catalog_variants cv
      where cv.product_id = v_product_id;

      update catalog_products set available = coalesce(v_still_available, true) where id = v_product_id;
    else
      select stock_ha_giang, stock_soc_son into v_hg, v_ss
      from catalog_products
      where id = v_product_id
      for update;

      if not found or (v_hg is null and v_ss is null) then
        continue;
      end if;

      v_total := coalesce(v_hg, 0) + coalesce(v_ss, 0);
      if v_total < v_qty then
        raise exception 'out_of_stock:%', v_product_id;
      end if;

      v_deduct := v_qty;
      v_ss_after := greatest(0, coalesce(v_ss, 0) - v_deduct);
      v_deduct := greatest(0, v_deduct - coalesce(v_ss, 0));
      v_hg_after := greatest(0, coalesce(v_hg, 0) - v_deduct);

      update catalog_products
      set stock_ha_giang = v_hg_after, stock_soc_son = v_ss_after, available = (v_ss_after + v_hg_after) > 0
      where id = v_product_id;
    end if;
  end loop;

  insert into orders (
    id, ts, type, customer_name, contact, address, tax_number, vat, promo, note,
    lines, total_kg, total_items, estimated_total, tier, payment_method, status, tracking_code, unread
  ) values (
    v_id, v_ts, 'retail', btrim(p_customer_name), btrim(p_contact), coalesce(p_address, ''), '', 10,
    p_promo, coalesce(p_note, ''), coalesce(p_lines, '[]'::jsonb), null, p_total_items, p_estimated_total,
    null, coalesce(nullif(p_payment_method, ''), 'qr'), 'pending', '', true
  );

  return query select v_id, v_ts, 'pending'::text;
end;
$$;

revoke all on function submit_retail_order(text, text, text, text, jsonb, integer, numeric, jsonb, text) from public;
grant execute on function submit_retail_order(text, text, text, text, jsonb, integer, numeric, jsonb, text) to anon, authenticated;
