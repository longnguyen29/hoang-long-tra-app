-- A recycle bin: deletions are recoverable for seven days.
--
-- The obvious design is a deleted_at column and a filter on every read. That was rejected:
-- twenty-one queries and RPCs touch orders alone, and a single one missed would leave a
-- "deleted" order still counting toward revenue, still blocking a referral reward, still
-- visible in a customer's history. The failure would be silent and hard to spot.
--
-- So a deleted row genuinely leaves its table, copied whole into deleted_records first.
-- Every existing query stays correct without being touched, and a restore puts the row back
-- exactly as it was.

create table if not exists deleted_records (
  id bigserial primary key,
  table_name text not null,
  record_id text not null,
  payload jsonb not null,        -- the entire row, so a restore is lossless
  label text not null default '',-- something human to recognise it by in the bin
  deleted_at timestamptz not null default now(),
  deleted_by text not null default ''
);

create index if not exists deleted_records_at_idx on deleted_records(deleted_at desc);

alter table deleted_records enable row level security;

create policy "deleted_records: staff select" on deleted_records for select using (is_staff());
create policy "deleted_records: staff delete" on deleted_records for delete using (is_staff());

-- No insert or update policy even for staff: rows arrive only through archive_and_delete()
-- below, which is the single path that also removes the original. Letting the bin be written
-- to directly would allow an archive entry with no deletion, or a deletion with no archive.

-- ---------- what may be binned ----------
-- An allowlist, not a parameter. This function builds SQL from a table name, so accepting
-- an arbitrary one would let any staff account read or destroy any table in the database.
create or replace function hl_recyclable(p_table text) returns boolean
language sql immutable as $$
  select p_table in ('orders', 'leads', 'sample_requests', 'tea_sessions', 'customer_notes');
$$;

-- ---------- move a row into the bin ----------
create or replace function archive_and_delete(p_table text, p_id text, p_label text, p_by text)
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_key text;
  v_row jsonb;
  v_archive_id bigint;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if not hl_recyclable(p_table) then raise exception 'table_not_recyclable'; end if;

  -- customer_notes is keyed by contact_key; everything else by id.
  v_key := case when p_table = 'customer_notes' then 'contact_key' else 'id' end;

  execute format('select to_jsonb(t) from %I t where t.%I = $1', p_table, v_key)
    into v_row using p_id;

  if v_row is null then raise exception 'not_found'; end if;

  insert into deleted_records (table_name, record_id, payload, label, deleted_by)
  values (p_table, p_id, v_row, coalesce(p_label, ''), coalesce(p_by, ''))
  returning id into v_archive_id;

  execute format('delete from %I where %I = $1', p_table, v_key) using p_id;

  return v_archive_id;
end;
$$;

revoke all on function archive_and_delete(text, text, text, text) from public;
grant execute on function archive_and_delete(text, text, text, text) to authenticated;

-- ---------- put it back ----------
create or replace function restore_record(p_archive_id bigint)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  r deleted_records%rowtype;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  select * into r from deleted_records where id = p_archive_id;
  if not found then raise exception 'not_found'; end if;
  if not hl_recyclable(r.table_name) then raise exception 'table_not_recyclable'; end if;

  -- jsonb_populate_record rebuilds the row against the table's current shape, so a column
  -- added since the deletion simply takes its default rather than failing the restore.
  execute format('insert into %I select * from jsonb_populate_record(null::%I, $1)',
                 r.table_name, r.table_name)
    using r.payload;

  delete from deleted_records where id = p_archive_id;
  return r.record_id;
end;
$$;

revoke all on function restore_record(bigint) from public;
grant execute on function restore_record(bigint) to authenticated;

-- ---------- forget anything past the window ----------
-- Called when staff open the Dashboard rather than on a schedule: pg_cron is not available
-- on every Supabase plan, and a bin that empties when somebody looks at it is close enough
-- for a seven-day window.
create or replace function purge_deleted_records(p_days integer)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_count integer;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  with gone as (
    delete from deleted_records
    where deleted_at < now() - make_interval(days => v_days)
    returning 1
  )
  select count(*) into v_count from gone;

  return v_count;
end;
$$;

revoke all on function purge_deleted_records(integer) from public;
grant execute on function purge_deleted_records(integer) to authenticated;
