-- House of Hoàng Long v3.0 — add a time-of-day to private tea session bookings
-- Run after 0010_v3_retail_tax_number.sql. Column named session_time (not "time") to avoid
-- colliding with the RETURNS TABLE-declared variable of the same name inside book_tea_session,
-- the same class of bug already hit once with "date"/"status" in 0009_v3_functions.sql.

alter table tea_sessions add column if not exists session_time time;

drop function if exists book_tea_session(date, text, text, text, text);

create or replace function book_tea_session(
  p_date date,
  p_time time,
  p_customer_name text,
  p_contact text,
  p_note text,
  p_payment_method text
)
returns table (id text, date date, session_time time, status text)
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
  if p_time is null then
    raise exception 'time required';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_date::text));

  select exists(
    select 1 from tea_sessions where tea_sessions.date = p_date and tea_sessions.status <> 'cancelled'
  ) into v_exists;

  if v_exists then
    raise exception 'date_taken';
  end if;

  v_id := 'session-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4);

  insert into tea_sessions (id, date, session_time, customer_name, contact, note, status, payment_method)
  values (
    v_id, p_date, p_time, btrim(p_customer_name), btrim(p_contact), coalesce(p_note, ''),
    'pending', coalesce(nullif(p_payment_method, ''), 'qr')
  );

  return query select v_id, p_date, p_time, 'pending'::text;
end;
$$;

revoke all on function book_tea_session(date, time, text, text, text, text) from public;
grant execute on function book_tea_session(date, time, text, text, text, text) to anon, authenticated;
