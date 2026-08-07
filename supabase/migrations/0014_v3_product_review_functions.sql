-- House of Hoàng Long v3.0 — product review RPCs + sold_count auto-increment
-- Run after 0013_v3_product_reviews_rls.sql.

-- ---------- did this contact ever buy this product? ----------
-- Retail checkout is guest-only (orders has no user_id), so identity is the contact
-- string the customer typed at checkout — same approach as has_prior_wholesale_order.
-- Retail order lines always carry productId (see submit_retail_order's p_lines shape).
create or replace function has_purchased_product(p_contact text, p_product_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from orders o, jsonb_array_elements(o.lines) l
    where lower(o.contact) = lower(btrim(p_contact))
      and l->>'productId' = p_product_id
  );
$$;

revoke all on function has_purchased_product(text, text) from public;
grant execute on function has_purchased_product(text, text) to anon, authenticated;

-- ---------- public read: approved reviews only, reviewer contact stripped ----------
create or replace function list_approved_product_reviews()
returns table (id text, product_id text, reviewer_name text, rating integer, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.product_id, r.reviewer_name, r.rating, r.body, r.created_at
  from product_reviews r
  where r.approved = true
  order by r.created_at desc;
$$;

revoke all on function list_approved_product_reviews() from public;
grant execute on function list_approved_product_reviews() to anon, authenticated;

-- ---------- submit a review (purchase-checked, always lands unapproved) ----------
-- Returns the new review id as a scalar rather than `returns table (id ...)`: a RETURNS
-- TABLE column named `id`/`rating`/etc. would be implicitly declared as a plpgsql variable
-- and collide with the same-named product_reviews columns below (the ambiguity bug already
-- hit once in 0009's book_tea_session).
create or replace function submit_product_review(
  p_product_id text,
  p_contact text,
  p_reviewer_name text,
  p_rating integer,
  p_body text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if p_product_id is null or btrim(p_product_id) = '' then
    raise exception 'product required';
  end if;
  if p_reviewer_name is null or btrim(p_reviewer_name) = '' then
    raise exception 'name required';
  end if;
  if p_contact is null or btrim(p_contact) = '' then
    raise exception 'contact required';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'invalid rating';
  end if;

  if not exists (select 1 from catalog_products cp where cp.id = p_product_id) then
    raise exception 'unknown product';
  end if;

  if not has_purchased_product(p_contact, p_product_id) then
    raise exception 'not_purchased';
  end if;

  if exists (
    select 1 from product_reviews pr
    where pr.product_id = p_product_id and lower(pr.contact) = lower(btrim(p_contact))
  ) then
    raise exception 'already_reviewed';
  end if;

  v_id := 'prev-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4);

  insert into product_reviews (id, product_id, reviewer_name, contact, rating, body, approved)
  values (v_id, p_product_id, btrim(p_reviewer_name), btrim(p_contact), p_rating, coalesce(btrim(p_body), ''), false);

  return v_id;
end;
$$;

revoke all on function submit_product_review(text, text, text, integer, text) from public;
grant execute on function submit_product_review(text, text, text, integer, text) to anon, authenticated;

-- ---------- submit_retail_order: also bump catalog_products.sold_count ----------
-- Identical to the 0010 version except for the sold_count increment marked below. The
-- increment happens right after line validation, before the stock-tracking branches —
-- those `continue` early for untracked/unlimited-stock products, which would otherwise
-- leave those products' counters permanently at 0.
drop function if exists submit_retail_order(text, text, text, text, text, jsonb, integer, numeric, jsonb, text);

create or replace function submit_retail_order(
  p_customer_name text,
  p_contact text,
  p_address text,
  p_tax_number text,
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

    -- sold counter: every real product line counts, tracked stock or not
    update catalog_products set sold_count = sold_count + v_qty where catalog_products.id = v_product_id;

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

      update catalog_products set available = coalesce(v_still_available, true) where catalog_products.id = v_product_id;
    else
      select stock_ha_giang, stock_soc_son into v_hg, v_ss
      from catalog_products
      where catalog_products.id = v_product_id
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
      where catalog_products.id = v_product_id;
    end if;
  end loop;

  insert into orders (
    id, ts, type, customer_name, contact, address, tax_number, vat, promo, note,
    lines, total_kg, total_items, estimated_total, tier, payment_method, status, tracking_code, unread
  ) values (
    v_id, v_ts, 'retail', btrim(p_customer_name), btrim(p_contact), coalesce(p_address, ''), coalesce(p_tax_number, ''), 10,
    p_promo, coalesce(p_note, ''), coalesce(p_lines, '[]'::jsonb), null, p_total_items, p_estimated_total,
    null, coalesce(nullif(p_payment_method, ''), 'qr'), 'pending', '', true
  );

  return query select v_id, v_ts, 'pending'::text;
end;
$$;

revoke all on function submit_retail_order(text, text, text, text, text, jsonb, integer, numeric, jsonb, text) from public;
grant execute on function submit_retail_order(text, text, text, text, text, jsonb, integer, numeric, jsonb, text) to anon, authenticated;
