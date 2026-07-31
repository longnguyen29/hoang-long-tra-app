-- House of Hoàng Long — RPC functions for anonymous (public) access.
-- Run after 0002_rls.sql.
--
-- These are SECURITY DEFINER and each returns/affects at most the single row a
-- caller is entitled to — never a full table listing — so they let the public
-- site work (order tracking, chat, promo codes, payment QR, reorder) without
-- granting anon any direct SELECT/UPDATE on orders / leads / support_threads /
-- promos / settings_payment.

create extension if not exists pgcrypto;

-- ---------- track an order by its exact ID (status only, no PII) ----------
create or replace function track_order(p_order_id text)
returns table (id text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.status
  from orders o
  where lower(o.id) = lower(p_order_id)
  limit 1;
$$;

revoke all on function track_order(text) from public;
grant execute on function track_order(text) to anon, authenticated;

-- ---------- validate + apply a single promo code (no full list exposed) ----------
create or replace function apply_promo_code(p_code text)
returns table (code text, percent numeric, owner_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.code, p.percent, p.owner_name
  from promos p
  where p.active = true and upper(p.code) = upper(p_code)
  limit 1;
$$;

revoke all on function apply_promo_code(text) from public;
grant execute on function apply_promo_code(text) to anon, authenticated;

-- ---------- public bank-transfer details for the post-checkout VietQR block ----------
create or replace function get_payment_info()
returns table (bin text, bank_short_name text, account_number text, account_name text)
language sql
stable
security definer
set search_path = public
as $$
  select s.bin, s.bank_short_name, s.account_number, s.account_name
  from settings_payment s
  where s.id = 1;
$$;

revoke all on function get_payment_info() from public;
grant execute on function get_payment_info() to anon, authenticated;

-- ---------- reorder: most recent order for a given contact (exact match only) ----------
create or replace function reorder_lookup(p_type text, p_contact text)
returns table (lines jsonb, customer_name text, contact text, address text, tax_number text)
language sql
stable
security definer
set search_path = public
as $$
  select o.lines, o.customer_name, o.contact, o.address, o.tax_number
  from orders o
  where o.type = p_type and lower(o.contact) = lower(p_contact)
  order by o.ts desc
  limit 1;
$$;

revoke all on function reorder_lookup(text, text) from public;
grant execute on function reorder_lookup(text, text) to anon, authenticated;

-- ---------- support chat: read only the caller's own thread ----------
create or replace function get_customer_thread(p_customer_id text)
returns table (
  id text, customer_id text, customer_name text, role text, messages jsonb, unread_for_admin boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.customer_id, t.customer_name, t.role, t.messages, t.unread_for_admin
  from support_threads t
  where t.customer_id = p_customer_id
  limit 1;
$$;

revoke all on function get_customer_thread(text) from public;
grant execute on function get_customer_thread(text) to anon, authenticated;

-- ---------- support chat: start or continue the caller's own thread ----------
create or replace function submit_customer_message(
  p_customer_id text,
  p_customer_name text,
  p_role text,
  p_text text
)
returns table (
  id text, customer_id text, customer_name text, role text, messages jsonb, unread_for_admin boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_messages jsonb;
  v_msg jsonb;
begin
  if p_text is null or btrim(p_text) = '' then
    raise exception 'message text is required';
  end if;

  v_msg := jsonb_build_object(
    'from', 'customer',
    'text', p_text,
    'ts', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  select t.id, t.messages into v_id, v_messages
  from support_threads t
  where t.customer_id = p_customer_id;

  if v_id is null then
    v_id := 'thread-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 6);
    begin
      insert into support_threads (id, customer_id, customer_name, role, messages, unread_for_admin)
      values (
        v_id,
        p_customer_id,
        coalesce(nullif(btrim(p_customer_name), ''), 'Guest'),
        p_role,
        jsonb_build_array(v_msg),
        true
      );
    exception when unique_violation then
      -- lost a race with a concurrent call for the same customer_id: append instead
      update support_threads
      set messages = messages || jsonb_build_array(v_msg),
          unread_for_admin = true
      where support_threads.customer_id = p_customer_id;
    end;
  else
    update support_threads
    set messages = coalesce(v_messages, '[]'::jsonb) || jsonb_build_array(v_msg),
        unread_for_admin = true,
        customer_name = coalesce(nullif(btrim(p_customer_name), ''), support_threads.customer_name)
    where support_threads.id = v_id;
  end if;

  return query
    select t.id, t.customer_id, t.customer_name, t.role, t.messages, t.unread_for_admin
    from support_threads t
    where t.customer_id = p_customer_id;
end;
$$;

revoke all on function submit_customer_message(text, text, text, text) from public;
grant execute on function submit_customer_message(text, text, text, text) to anon, authenticated;
