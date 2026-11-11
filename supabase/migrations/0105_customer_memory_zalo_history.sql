begin;

alter table public.customer_memory_messages
  add column historical boolean not null default false,
  add column sender_name text not null default '' check (length(sender_name) <= 160);

-- Remember the deletion cutoff without retaining the conversation ID or contents.
create table public.customer_memory_zalo_history_deletions (
  thread_key bytea primary key check (octet_length(thread_key) = 32),
  deleted_at timestamptz not null
);
alter table public.customer_memory_zalo_history_deletions enable row level security;
revoke all on public.customer_memory_zalo_history_deletions from public, anon, authenticated;
grant select, insert, update on public.customer_memory_zalo_history_deletions to service_role;

create function public.import_customer_memory_zalo_history(
  p_external_id text,
  p_name text,
  p_messages jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  conversation_key bytea;
  conversation_id uuid;
  import_time timestamptz;
  window_start timestamptz;
  deletion_cutoff timestamptz;
  eligible_messages jsonb;
  eligible_count integer;
  inserted_count integer;
  latest_inserted_at timestamptz;
begin
  if p_external_id is null or p_external_id !~ '^[0-9A-Za-z_.:-]{4,120}$'
    or length(coalesce(p_name, '')) > 160
    or jsonb_typeof(p_messages) is distinct from 'array'
  then
    raise exception using errcode = '22023', message = 'invalid_input';
  end if;
  if jsonb_array_length(p_messages) not between 1 and 50 then
    raise exception using errcode = '22023', message = 'invalid_input';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_messages) as items(message)
    where jsonb_typeof(message) is distinct from 'object'
      or jsonb_typeof(message->'external_message_id') is distinct from 'string'
      or message->>'external_message_id' !~ '^[0-9A-Za-z_.:-]{4,240}$'
      or jsonb_typeof(message->'direction') is distinct from 'string'
      or message->>'direction' not in ('inbound', 'outbound')
      or jsonb_typeof(message->'body') is distinct from 'string'
      or length(message->>'body') > 12000
      or message->>'body' !~ '[^[:space:]]'
      or jsonb_typeof(message->'occurred_at') is distinct from 'string'
      or message->>'occurred_at' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
      or coalesce(jsonb_typeof(message->'sender_name'), 'null') not in ('string', 'null')
      or length(message->>'sender_name') > 160
  ) then
    raise exception using errcode = '22023', message = 'invalid_input';
  end if;

  -- Serialize history writes and staff deletion for this conversation.
  conversation_key := sha256(convert_to('customer-memory:zalo_personal:' || p_external_id, 'UTF8'));
  perform pg_advisory_xact_lock(hashtextextended(encode(conversation_key, 'hex'), 0));
  import_time := clock_timestamp();
  window_start := ((import_time at time zone 'Asia/Ho_Chi_Minh') - interval '3 months')
    at time zone 'Asia/Ho_Chi_Minh';
  select deleted_at into deletion_cutoff
    from public.customer_memory_zalo_history_deletions where thread_key = conversation_key;

  begin
    select coalesce(jsonb_agg(message order by source_order), '[]'::jsonb)
      into eligible_messages
      from jsonb_array_elements(p_messages) with ordinality as items(message, source_order)
      where (message->>'occurred_at')::timestamptz between window_start and import_time
        and (deletion_cutoff is null or (message->>'occurred_at')::timestamptz > deletion_cutoff);
  exception when invalid_datetime_format or datetime_field_overflow or invalid_time_zone_displacement_value then
    raise exception using errcode = '22023', message = 'invalid_input';
  end;
  eligible_count := jsonb_array_length(eligible_messages);
  if eligible_count = 0 then
    return jsonb_build_object('inserted', 0, 'duplicate', 0, 'excluded', jsonb_array_length(p_messages));
  end if;

  insert into public.customer_memory_threads (channel, external_id, display_name, status, last_message_at)
  select 'zalo_personal', p_external_id, coalesce(nullif(btrim(p_name), ''), 'Zalo cá nhân'), 'done',
    min((message->>'occurred_at')::timestamptz)
  from jsonb_array_elements(eligible_messages) as items(message)
  on conflict (channel, external_id) do nothing
  returning id into conversation_id;
  if conversation_id is null then
    select id into strict conversation_id from public.customer_memory_threads
      where channel = 'zalo_personal' and external_id = p_external_id
      for update;
  end if;

  with inserted_messages as (
    insert into public.customer_memory_messages
      (thread_id, external_message_id, direction, body, occurred_at, historical, sender_name)
    select conversation_id, message->>'external_message_id', message->>'direction',
      message->>'body', (message->>'occurred_at')::timestamptz, true,
      coalesce(message->>'sender_name', '')
    from jsonb_array_elements(eligible_messages) with ordinality as items(message, source_order)
    order by source_order
    on conflict (thread_id, external_message_id) do nothing
    returning occurred_at
  )
  select count(*)::integer, max(occurred_at) into inserted_count, latest_inserted_at from inserted_messages;

  if latest_inserted_at is not null then
    update public.customer_memory_threads
      set last_message_at = latest_inserted_at
      where id = conversation_id and last_message_at < latest_inserted_at;
  end if;

  return jsonb_build_object(
    'inserted', inserted_count,
    'duplicate', eligible_count - inserted_count,
    'excluded', jsonb_array_length(p_messages) - eligible_count
  );
end;
$$;
revoke all on function public.import_customer_memory_zalo_history(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.import_customer_memory_zalo_history(text, text, jsonb) to service_role;

create function public.delete_customer_memory_zalo_history_thread(p_thread_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  conversation_key bytea;
  conversation_channel text;
  conversation_external_id text;
begin
  select channel, external_id into conversation_channel, conversation_external_id
    from public.customer_memory_threads where id = p_thread_id;
  if not found then
    return false;
  end if;

  if conversation_channel = 'zalo_personal' then
    conversation_key := sha256(convert_to('customer-memory:zalo_personal:' || conversation_external_id, 'UTF8'));
    perform pg_advisory_xact_lock(hashtextextended(encode(conversation_key, 'hex'), 0));
  end if;
  delete from public.customer_memory_threads where id = p_thread_id;
  if not found then
    return false;
  end if;

  if conversation_key is not null then
    insert into public.customer_memory_zalo_history_deletions (thread_key, deleted_at)
    values (conversation_key, clock_timestamp())
    on conflict (thread_key) do update
      set deleted_at = greatest(customer_memory_zalo_history_deletions.deleted_at, excluded.deleted_at);
  end if;
  return true;
end;
$$;
revoke all on function public.delete_customer_memory_zalo_history_thread(uuid) from public, anon, authenticated;
grant execute on function public.delete_customer_memory_zalo_history_thread(uuid) to service_role;

commit;
