-- House of Hoàng Long v3.0 — RPC functions
-- Run after 0008_v3_rls.sql.

-- ---------- which dates are already taken, for the booking date-picker ----------
create or replace function list_taken_tea_session_dates(p_from date, p_to date)
returns table (date date)
language sql
stable
security definer
set search_path = public
as $$
  select ts.date from tea_sessions ts
  where ts.status <> 'cancelled' and ts.date between p_from and p_to;
$$;

revoke all on function list_taken_tea_session_dates(date, date) from public;
grant execute on function list_taken_tea_session_dates(date, date) to anon, authenticated;

-- ---------- book a private tea session, race-safe against double-booking the same day ----------
-- There's no existing row to `select ... for update` on a brand-new date (unlike stock rows
-- in submit_retail_order), so we serialize on a per-date advisory lock instead, then check + insert.
create or replace function book_tea_session(
  p_date date,
  p_customer_name text,
  p_contact text,
  p_note text,
  p_payment_method text
)
returns table (id text, date date, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_exists boolean;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'customer name required';
  end if;
  if p_contact is null or btrim(p_contact) = '' then
    raise exception 'contact required';
  end if;
  if p_date is null or p_date < current_date then
    raise exception 'invalid date';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_date::text));

  select exists(
    select 1 from tea_sessions where tea_sessions.date = p_date and tea_sessions.status <> 'cancelled'
  ) into v_exists;

  if v_exists then
    raise exception 'date_taken';
  end if;

  v_id := 'session-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4);

  insert into tea_sessions (id, date, customer_name, contact, note, status, payment_method)
  values (
    v_id, p_date, btrim(p_customer_name), btrim(p_contact), coalesce(p_note, ''),
    'pending', coalesce(nullif(p_payment_method, ''), 'qr')
  );

  return query select v_id, p_date, 'pending'::text;
end;
$$;

revoke all on function book_tea_session(date, text, text, text, text) from public;
grant execute on function book_tea_session(date, text, text, text, text) to anon, authenticated;
