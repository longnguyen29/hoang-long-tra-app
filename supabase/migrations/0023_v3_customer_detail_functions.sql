-- Customer detail and trade sample submission.
-- Run after 0022_v3_customer_notes_samples.sql.
--
-- Aggregates return jsonb rather than `returns table (...)`, for the reason recorded in
-- 0021: a RETURNS TABLE column name becomes an implicit plpgsql variable and silently
-- shadows a real column of the same name.

-- ---------- everything the Dashboard shows for one customer ----------
create or replace function customer_detail(p_contact text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key text := lower(btrim(coalesce(p_contact, '')));
  v_result jsonb;
begin
  if not is_staff() then
    raise exception 'not_authorised';
  end if;
  if v_key = '' then
    raise exception 'contact_required';
  end if;

  select jsonb_build_object(
    'contact_key', v_key,
    -- The most recent order in full: what was ordered, what it cost, where it went, and
    -- whether anything reduced the price.
    'latest', (
      select to_jsonb(o) from orders o
      where lower(btrim(o.contact)) = v_key
      order by o.ts desc limit 1
    ),
    -- The whole history, newest first, kept light — the detail screen only lists date,
    -- total and status, and pulling every line item of every order would be wasteful.
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'ts', h.ts, 'type', h.type, 'status', h.status,
        'total', h.estimated_total, 'items', h.total_items, 'kg', h.total_kg,
        'promo', h.promo
      ) order by h.ts desc)
      from orders h where lower(btrim(h.contact)) = v_key
    ), '[]'::jsonb),
    'top_items', coalesce((
      select jsonb_agg(jsonb_build_object('name', g.name, 'qty', g.qty) order by g.qty desc)
      from (
        select coalesce(l->>'name', l->>'productId') as name,
               sum(coalesce((l->>'qty')::numeric, 0))::int as qty
        from orders o2, jsonb_array_elements(o2.lines) l
        where lower(btrim(o2.contact)) = v_key
          and coalesce(l->>'name', l->>'productId') is not null
        group by 1 order by 2 desc limit 8
      ) g
    ), '[]'::jsonb),
    'note', coalesce((select n.note from customer_notes n where n.contact_key = v_key), ''),
    'note_updated_at', (select n.updated_at from customer_notes n where n.contact_key = v_key)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function customer_detail(text) from public;
grant execute on function customer_detail(text) to authenticated;

-- ---------- the house's private note about a customer ----------
create or replace function save_customer_note(p_contact text, p_note text, p_by text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_key text := lower(btrim(coalesce(p_contact, '')));
begin
  if not is_staff() then
    raise exception 'not_authorised';
  end if;
  if v_key = '' then
    raise exception 'contact_required';
  end if;

  insert into customer_notes (contact_key, note, updated_at, updated_by)
  values (v_key, coalesce(p_note, ''), now(), coalesce(p_by, ''))
  on conflict (contact_key) do update
    set note = excluded.note, updated_at = now(), updated_by = excluded.updated_by;
end;
$$;

revoke all on function save_customer_note(text, text, text) from public;
grant execute on function save_customer_note(text, text, text) to authenticated;

-- ---------- a café asking for a trade sample ----------
-- Public, because the whole point is a link handed to a shop owner who has no account. The
-- qualifying answers are re-checked here rather than trusted from the form: a checkbox in a
-- page anyone can edit is not a gate, and a free pack going out the door is real money.
create or replace function submit_sample_request(
  p_store_name text,
  p_contact_name text,
  p_phone text,
  p_address text,
  p_pack text,
  p_has_shop boolean,
  p_can_reformulate boolean,
  p_can_feedback boolean,
  p_note text
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id text;
  v_pack text := coalesce(nullif(btrim(p_pack), ''), '50g');
begin
  if btrim(coalesce(p_store_name, '')) = '' then raise exception 'store_required'; end if;
  if btrim(coalesce(p_phone, '')) = '' then raise exception 'phone_required'; end if;
  if btrim(coalesce(p_address, '')) = '' then raise exception 'address_required'; end if;

  -- The free pack is for working shops that will actually put it through their bar. Paid
  -- sizes are open to anyone, so they skip the gate.
  if v_pack = '50g' and not (coalesce(p_has_shop, false)
                             and coalesce(p_can_reformulate, false)
                             and coalesce(p_can_feedback, false)) then
    raise exception 'not_qualified';
  end if;

  -- One open request per phone, so a link passed around can't be used to order repeatedly.
  if exists (
    select 1 from sample_requests r
    where regexp_replace(r.phone, '\D', '', 'g') = regexp_replace(btrim(p_phone), '\D', '', 'g')
      and r.status in ('new', 'sent')
  ) then
    raise exception 'already_requested';
  end if;

  v_id := 'sample-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);

  insert into sample_requests (
    id, store_name, contact_name, phone, address, pack,
    has_shop, can_reformulate, can_feedback, note
  ) values (
    v_id, btrim(p_store_name), btrim(coalesce(p_contact_name, '')), btrim(p_phone), btrim(p_address), v_pack,
    coalesce(p_has_shop, false), coalesce(p_can_reformulate, false), coalesce(p_can_feedback, false),
    coalesce(p_note, '')
  );

  return v_id;
end;
$$;

revoke all on function submit_sample_request(text, text, text, text, text, boolean, boolean, boolean, text) from public;
grant execute on function submit_sample_request(text, text, text, text, text, boolean, boolean, boolean, text) to anon, authenticated;
