-- Private, durable event enquiries. A service-only transaction creates or links
-- the commercial relationship; retries never append a second enquiry or note.
begin;

create table public.event_enquiries (
  id uuid primary key,
  opportunity_id text references public.trade_opportunities(id) on delete set null,
  name text not null check (length(name) between 1 and 80),
  business text not null default '' check (length(business) <= 120),
  contact text not null check (length(contact) between 1 and 120),
  contact_key text not null check (length(contact_key) between 1 and 120),
  intent text not null check (intent in ('sample', 'quote', 'cooperation')),
  note text not null default '' check (length(note) <= 700),
  source text not null check (source in ('teashow', 'event', 'website', 'zalo')),
  medium text not null check (medium in ('qr', 'referral', 'owned')),
  campaign text not null check (campaign = 'event_contact_v1'),
  consent_version text not null check (consent_version = 'event_contact_v2'),
  consent_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  throttle_key text not null check (throttle_key ~ '^[a-f0-9]{64}$')
);
create index event_enquiries_opportunity_idx on public.event_enquiries(opportunity_id, received_at desc);
create index event_enquiries_received_idx on public.event_enquiries(received_at desc);
create index event_enquiries_throttle_idx on public.event_enquiries(throttle_key, received_at desc);
create index event_enquiries_contact_idx on public.event_enquiries(contact_key, received_at desc);

alter table public.event_enquiries enable row level security;
revoke all on public.event_enquiries from public, anon, authenticated;
grant select on public.event_enquiries to authenticated;
grant all on public.event_enquiries to service_role;
create policy event_enquiries_manager_read on public.event_enquiries
  for select to authenticated using (public.is_staff_manager());

create function public.submit_event_enquiry(
  p_request_id uuid, p_name text, p_business text, p_contact text,
  p_intent text, p_note text, p_source text, p_medium text, p_campaign text,
  p_consent boolean, p_throttle_key text, p_previous_throttle_key text
)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  saved public.event_enquiries;
  opportunity public.trade_opportunities;
  contact_key_value text;
  match_count integer;
  opportunity_key text;
  notes_line text;
  lock_key text;
  received_time timestamptz;
begin
  -- SECURITY DEFINER changes current_user; the JWT role is the caller's claim.
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_request_id is null or p_consent is distinct from true
     or coalesce(length(trim(p_name)), 0) not between 1 and 80
     or coalesce(length(p_business), 0) > 120
     or coalesce(length(trim(p_contact)), 0) not between 1 and 120
     or coalesce(length(p_note), 0) > 700
     or p_intent is null or p_intent not in ('sample', 'quote', 'cooperation')
     or p_source is null or p_source not in ('teashow', 'event', 'website', 'zalo')
     or p_medium is null or p_medium not in ('qr', 'referral', 'owned')
     or p_campaign is distinct from 'event_contact_v1'
     or p_throttle_key is null or p_throttle_key !~ '^[a-f0-9]{64}$'
     or p_previous_throttle_key is null or p_previous_throttle_key !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_event_enquiry'; end if;
  contact_key_value := public.discovery_trade_contact_key(trim(p_contact));
  if contact_key_value is null or contact_key_value = '' then raise exception 'invalid_event_enquiry'; end if;

  -- All writers take request -> sorted IP buckets -> contact locks in this order.
  perform pg_advisory_xact_lock(hashtextextended('event-enquiry-request:' || p_request_id::text, 0));
  select * into saved from public.event_enquiries where id = p_request_id;
  if found then
    if (saved.name, saved.business, saved.contact, saved.intent, saved.note, saved.source, saved.medium, saved.campaign)
       is distinct from
       (trim(p_name), trim(coalesce(p_business, '')), trim(p_contact), p_intent, trim(coalesce(p_note, '')), p_source, p_medium, p_campaign)
    then raise exception 'event_enquiry_retry_conflict'; end if;
    -- A valid retry may arrive on a new network or on a different UTC date.
    return jsonb_build_object('request_id', saved.id, 'is_new', false);
  end if;
  for lock_key in select distinct value from unnest(array[p_throttle_key, p_previous_throttle_key]) as buckets(value) order by value loop
    perform pg_advisory_xact_lock(hashtextextended('event-enquiry-throttle:' || lock_key, 0));
  end loop;
  -- Share the promotion namespace so intake cannot race prospect promotion.
  perform pg_advisory_xact_lock(hashtextextended('prospect-promotion:' || contact_key_value, 0));
  received_time := clock_timestamp();
  if (select count(*) from public.event_enquiries
      where throttle_key in (p_throttle_key, p_previous_throttle_key)
        and received_at > received_time - interval '30 minutes') >= 30
     or (select count(*) from public.event_enquiries
         where contact_key = contact_key_value and received_at > received_time - interval '30 minutes') >= 3
  then raise exception 'event_enquiry_rate_limited'; end if;

  -- Older seeded rows have unnormalized contact keys. Never guess between two
  -- relationships: preserve the enquiry unlinked for the staff inbox to review.
  match_count := 0;
  opportunity_key := null;
  for opportunity in select * from public.trade_opportunities
    where contact_key = contact_key_value or public.discovery_trade_contact_key(contact) = contact_key_value for update loop
    match_count := match_count + 1;
    opportunity_key := opportunity.id;
  end loop;
  if match_count = 0 then
    opportunity_key := 'opp-event-' || p_request_id::text;
    insert into public.trade_opportunities(
      id, contact_key, business_name, contact, stage, source_type, source_id,
      next_action, next_action_at, notes, created_at, updated_at
    ) values (
      opportunity_key, contact_key_value, coalesce(nullif(trim(p_business), ''), trim(p_name)), trim(p_contact), 'lead',
      case when p_source = 'teashow' then 'teashow' else 'event_contact' end, p_request_id::text,
      'Phản hồi yêu cầu từ trang liên hệ', received_time, '', received_time, received_time
    ) on conflict (contact_key) do nothing;
    -- A staff insert may not use the advisory lock. Re-read after its unique-key
    -- conflict rather than using an upsert that could change commercial fields.
    match_count := 0;
    opportunity_key := null;
    for opportunity in select * from public.trade_opportunities
      where contact_key = contact_key_value or public.discovery_trade_contact_key(contact) = contact_key_value for update loop
      match_count := match_count + 1;
      opportunity_key := opportunity.id;
    end loop;
  end if;
  if match_count <> 1 then opportunity_key := null; end if;

  insert into public.event_enquiries(
    id, opportunity_id, name, business, contact, contact_key, intent, note, source, medium, campaign,
    consent_version, consent_at, received_at, throttle_key
  ) values (
    p_request_id, opportunity_key, trim(p_name), trim(coalesce(p_business, '')), trim(p_contact), contact_key_value,
    p_intent, trim(coalesce(p_note, '')), p_source, p_medium, p_campaign,
    'event_contact_v2', received_time, received_time, p_throttle_key
  );
  if opportunity_key is not null then
    notes_line := concat(
      '[HL-E-', upper(substr(p_request_id::text, 1, 8)), ' · ', to_char(received_time at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI'), '] ',
      trim(p_name), case when nullif(trim(p_business), '') is not null then ' · ' || trim(p_business) else '' end, ' · ',
      case p_intent when 'sample' then 'Thử mẫu' when 'quote' then 'Báo giá' else 'Hợp tác' end,
      case when nullif(trim(p_note), '') is not null then E'\n' || trim(p_note) else '' end,
      E'\nNguồn: ', p_source, '/', p_medium, ' · event_contact_v1; đồng ý liên hệ: event_contact_v2.'
    );
    -- Append to the currently locked row. Every other commercial field, including
    -- the discovery link and its do-not-contact status, remains the staff's choice.
    update public.trade_opportunities set
      notes = concat_ws(E'\n\n', nullif(notes, ''), notes_line), updated_at = received_time
      where id = opportunity_key;
  end if;
  return jsonb_build_object('request_id', p_request_id, 'is_new', true);
end $$;
revoke all on function public.submit_event_enquiry(uuid,text,text,text,text,text,text,text,text,boolean,text,text) from public, anon, authenticated;
grant execute on function public.submit_event_enquiry(uuid,text,text,text,text,text,text,text,text,boolean,text,text) to service_role;

commit;
