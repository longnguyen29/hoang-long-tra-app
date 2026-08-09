-- House of Hoàng Long v3.0 — analytics, customer profiles and referral functions
-- Run after 0019 and 0020.
--
-- Aggregates return jsonb rather than `returns table (...)`. That is deliberate: a
-- RETURNS TABLE column name becomes an implicit plpgsql variable and silently shadows a
-- real column of the same name (`id`, `date`, `status`), which has broken three functions
-- in this project already — once in production, unnoticed. jsonb has no such trap.

-- ---------- record a page view ----------
-- ts is set here, never taken from the client, so the timeline can't be forged.
create or replace function record_page_view(
  p_path text, p_session text, p_referrer text, p_lang text
)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into page_views (path, session_id, referrer, lang)
  select left(btrim(p_path), 120), left(btrim(p_session), 64),
         left(coalesce(p_referrer, ''), 200), left(coalesce(p_lang, ''), 8)
  where btrim(coalesce(p_path, '')) <> '' and btrim(coalesce(p_session, '')) <> '';
$$;

revoke all on function record_page_view(text, text, text, text) from public;
grant execute on function record_page_view(text, text, text, text) to anon, authenticated;

-- ---------- dashboard: traffic ----------
create or replace function page_view_stats(p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_from timestamptz := now() - make_interval(days => v_days);
  v_result jsonb;
begin
  if not is_staff() then
    raise exception 'not_authorised';
  end if;

  select jsonb_build_object(
    'days', v_days,
    'views', (select count(*) from page_views pv where pv.ts >= v_from),
    'visitors', (select count(distinct pv.session_id) from page_views pv where pv.ts >= v_from),
    'today_views', (select count(*) from page_views pv where pv.ts >= date_trunc('day', now())),
    'today_visitors', (select count(distinct pv.session_id) from page_views pv
                       where pv.ts >= date_trunc('day', now())),
    'by_day', coalesce((
      select jsonb_agg(d order by d->>'day')
      from (
        select jsonb_build_object(
          'day', to_char(date_trunc('day', pv.ts), 'YYYY-MM-DD'),
          'views', count(*),
          'visitors', count(distinct pv.session_id)
        ) as d
        from page_views pv
        where pv.ts >= v_from
        group by date_trunc('day', pv.ts)
      ) x
    ), '[]'::jsonb),
    'top_paths', coalesce((
      select jsonb_agg(p order by (p->>'views')::int desc)
      from (
        select jsonb_build_object('path', pv.path, 'views', count(*)) as p
        from page_views pv
        where pv.ts >= v_from
        group by pv.path
        order by count(*) desc
        limit 10
      ) y
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function page_view_stats(integer) from public;
grant execute on function page_view_stats(integer) to authenticated;

-- ---------- dashboard: customer profiles ----------
-- Retail checkout is guest-first: orders carry no user_id, so a "customer" is every order
-- sharing a contact string. Same identity rule as has_prior_wholesale_order and
-- has_purchased_product, which means this reports on orders that already exist.
create or replace function customer_profiles_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not is_staff() then
    raise exception 'not_authorised';
  end if;

  with base as (
    select
      lower(btrim(o.contact))                            as contact_key,
      max(o.contact)                                     as contact,
      max(o.customer_name)                               as customer_name,
      count(*)::int                                      as order_count,
      sum(coalesce(o.estimated_total, 0))                as total_spent,
      round(avg(coalesce(o.estimated_total, 0)))         as avg_order,
      min(o.ts)                                          as first_order,
      max(o.ts)                                          as last_order,
      -- Average gap between orders, in days. Null for one-off customers, where the idea
      -- has no meaning — better than reporting a misleading zero.
      case when count(*) > 1
        then round(extract(epoch from (max(o.ts) - min(o.ts))) / 86400.0 / (count(*) - 1))
        else null end                                    as avg_days_between,
      count(*) filter (where o.type = 'wholesale')::int  as wholesale_orders
    from orders o
    where btrim(coalesce(o.contact, '')) <> ''
    group by lower(btrim(o.contact))
  ),
  -- Items per customer, ranked. Kept as its own aggregation over the unnested lines
  -- rather than a correlated subquery, which cannot see a grouped column.
  items as (
    select contact_key, name, qty,
           row_number() over (partition by contact_key order by qty desc) as rn
    from (
      select lower(btrim(o.contact))                        as contact_key,
             coalesce(l->>'name', l->>'productId')          as name,
             sum(coalesce((l->>'qty')::numeric, 0))::int    as qty
      from orders o, jsonb_array_elements(o.lines) l
      where btrim(coalesce(o.contact, '')) <> ''
        and coalesce(l->>'name', l->>'productId') is not null
      group by 1, 2
    ) g
  ),
  top_items as (
    select contact_key,
           jsonb_agg(jsonb_build_object('name', name, 'qty', qty) order by qty desc) as list
    from items where rn <= 5 group by contact_key
  )
  select coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object('top_items', coalesce(ti.list, '[]'::jsonb))
                            order by b.total_spent desc nulls last), '[]'::jsonb)
  into v_result
  from base b
  left join top_items ti on ti.contact_key = b.contact_key;

  return v_result;
end;
$$;

revoke all on function customer_profiles_summary() from public;
grant execute on function customer_profiles_summary() to authenticated;

-- ---------- referral: a buyer's personal code ----------
-- Derived from the contact, so it is stable: the same customer always gets the same code
-- and can look it up again from any device without us storing a session.
create or replace function referral_code_for(p_contact text)
returns text
language sql
immutable
as $$
  select 'HL' || upper(substr(md5(lower(btrim(p_contact)) || ':hoanglong-referral'), 1, 6));
$$;

-- ---------- referral: what a customer can see about their own referrals ----------
-- Takes a contact and returns only that contact's side. Never exposes who was referred.
create or replace function my_referral_status(p_contact text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_contact text := lower(btrim(coalesce(p_contact, '')));
  v_code text;
  v_has_ordered boolean;
begin
  if v_contact = '' then
    raise exception 'contact_required';
  end if;

  select exists (select 1 from orders o where lower(btrim(o.contact)) = v_contact)
  into v_has_ordered;

  -- Only actual buyers get a code, so it can't be farmed by strangers.
  if not v_has_ordered then
    return jsonb_build_object('has_ordered', false, 'code', null, 'referral_count', 0, 'rewards', '[]'::jsonb);
  end if;

  v_code := referral_code_for(v_contact);

  -- Created on first look-up rather than at checkout: the row only exists once someone
  -- actually wants their code.
  insert into promos (id, code, percent, owner_name, owner_contact, kind, active)
  select 'promo-ref-' || substr(md5(v_contact), 1, 10), v_code, 5,
         coalesce((select o.customer_name from orders o
                   where lower(btrim(o.contact)) = v_contact order by o.ts desc limit 1), ''),
         v_contact, 'referral', true
  where not exists (select 1 from promos p where upper(p.code) = upper(v_code));

  return jsonb_build_object(
    'has_ordered', true,
    'code', v_code,
    'referral_count', (select count(*) from referral_rewards r
                       where lower(r.referrer_contact) = v_contact),
    'rewards', coalesce((
      select jsonb_agg(jsonb_build_object('code', p.code, 'percent', p.percent))
      from promos p
      where p.kind = 'reward' and lower(p.owner_contact) = v_contact
        and p.active = true and coalesce(p.uses, 0) < coalesce(p.max_uses, 1)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function my_referral_status(text) from public;
grant execute on function my_referral_status(text) to anon, authenticated;

-- ---------- promo validation, now aware of single-use reward codes ----------
drop function if exists apply_promo_code(text);

create or replace function apply_promo_code(p_code text)
returns table (code text, percent numeric, owner_name text, kind text)
language sql
stable
security definer
set search_path = public
as $$
  select p.code, p.percent, p.owner_name, p.kind
  from promos p
  where p.active = true
    and upper(p.code) = upper(p_code)
    and (p.max_uses is null or coalesce(p.uses, 0) < p.max_uses)
  limit 1;
$$;

revoke all on function apply_promo_code(text) from public;
grant execute on function apply_promo_code(text) to anon, authenticated;

-- ---------- retail order, re-issued to grant referral rewards ----------
-- Identical to 0014 except for the promo/referral block before the insert. Re-issued in
-- full rather than patched, because that is the only way to change a plpgsql body.
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
  v_contact text;
  v_promo_code text;
  v_promo promos%rowtype;
  v_is_new_customer boolean;
  v_reward_code text;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'customer name required';
  end if;
  if p_contact is null or btrim(p_contact) = '' then
    raise exception 'contact required';
  end if;

  v_contact := lower(btrim(p_contact));
  v_id := 'order-' || to_char(v_ts, 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4);

  -- Whether this is their first order decides the referral reward, so it has to be read
  -- before this order is inserted.
  select not exists (select 1 from orders o where lower(btrim(o.contact)) = v_contact)
  into v_is_new_customer;

  -- ----- promo checks -----
  v_promo_code := nullif(btrim(coalesce(p_promo->>'code', '')), '');
  if v_promo_code is not null then
    select * into v_promo from promos p
    where upper(p.code) = upper(v_promo_code) and p.active = true
    for update;

    if not found then
      raise exception 'promo_invalid';
    end if;
    if v_promo.max_uses is not null and coalesce(v_promo.uses, 0) >= v_promo.max_uses then
      raise exception 'promo_used_up';
    end if;
    -- A referral code rewards the friend, not its owner.
    if v_promo.kind = 'referral' and lower(v_promo.owner_contact) = v_contact then
      raise exception 'self_referral';
    end if;
    -- An earned reward belongs to the person who earned it.
    if v_promo.kind = 'reward' and lower(v_promo.owner_contact) <> v_contact then
      raise exception 'reward_not_yours';
    end if;

    update promos set uses = coalesce(uses, 0) + 1 where promos.id = v_promo.id;
  end if;

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

  -- ----- issue the referrer's reward -----
  -- Only on a referred customer's FIRST order, so a friend reordering can't mint more
  -- rewards. referral_rewards_one_per_referred backs this up at the database level.
  if v_promo_code is not null and v_promo.kind = 'referral' and v_is_new_customer then
    v_reward_code := 'HLR' || upper(substr(md5(v_id || v_promo.owner_contact), 1, 6));

    insert into promos (id, code, percent, owner_name, owner_contact, kind, active, max_uses, uses)
    values ('promo-rw-' || substr(md5(v_id), 1, 10), v_reward_code, 5,
            coalesce(v_promo.owner_name, ''), v_promo.owner_contact, 'reward', true, 1, 0)
    on conflict (code) do nothing;

    insert into referral_rewards (
      id, referrer_contact, referred_contact, referral_code, order_id, reward_code
    ) values (
      'ref-' || substr(md5(v_id), 1, 12), v_promo.owner_contact, v_contact,
      v_promo.code, v_id, v_reward_code
    )
    on conflict do nothing;
  end if;

  return query select v_id, v_ts, 'pending'::text;
end;
$$;

revoke all on function submit_retail_order(text, text, text, text, text, jsonb, integer, numeric, jsonb, text) from public;
grant execute on function submit_retail_order(text, text, text, text, text, jsonb, integer, numeric, jsonb, text) to anon, authenticated;
