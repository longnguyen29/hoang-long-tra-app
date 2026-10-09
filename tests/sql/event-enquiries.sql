-- Run after migration 0077 as the database owner. Synthetic fixtures only;
-- the transaction rolls back all enquiries/opportunities and sends no messages.
begin;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
declare
  first_id uuid := gen_random_uuid();
  second_id uuid := gen_random_uuid();
  conflict_id uuid := gen_random_uuid();
  legacy_id uuid := gen_random_uuid();
  contact_value text;
  legacy_contact text;
  saved_opp_id text;
  result jsonb;
  before_notes text;
  hash_value text := repeat('a',64);
  previous_hash text := repeat('b',64);
begin
  if to_regclass('public.event_enquiries') is null then raise exception 'Migration 0077 required'; end if;
  if has_table_privilege('anon','public.event_enquiries','SELECT')
     or has_table_privilege('anon','public.event_enquiries','INSERT')
     or has_table_privilege('authenticated','public.event_enquiries','INSERT')
     or has_function_privilege('anon','public.submit_event_enquiry(uuid,text,text,text,text,text,text,text,text,boolean,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.submit_event_enquiry(uuid,text,text,text,text,text,text,text,text,boolean,text,text)','EXECUTE')
  then raise exception 'Public write/read privileges are too broad'; end if;
  contact_value := first_id::text || '@event.invalid';
  result := public.submit_event_enquiry(first_id,'TEST ROLLBACK','',''||contact_value,'quote','TEST ONLY','teashow','qr','event_contact_v1',true,hash_value,previous_hash);
  if result->>'is_new' is distinct from 'true' then raise exception 'New receipt failed'; end if;
  select e.opportunity_id into saved_opp_id from public.event_enquiries e where e.id=first_id;
  if saved_opp_id is null or (select stage from public.trade_opportunities where id=saved_opp_id) <> 'lead' then raise exception 'New lead missing'; end if;
  select notes into before_notes from public.trade_opportunities where id=saved_opp_id;
  result := public.submit_event_enquiry(first_id,'TEST ROLLBACK','',contact_value,'quote','TEST ONLY','teashow','qr','event_contact_v1',true,hash_value,previous_hash);
  if result->>'is_new' is distinct from 'false' or before_notes is distinct from (select notes from public.trade_opportunities where id=saved_opp_id) then raise exception 'Retry changed history'; end if;
  begin
    perform public.submit_event_enquiry(first_id,'CHANGED','',contact_value,'quote','TEST ONLY','teashow','qr','event_contact_v1',true,hash_value,previous_hash);
    raise exception 'Changed payload retry was accepted';
  exception when others then
    if sqlerrm <> 'event_enquiry_retry_conflict' then raise; end if;
  end;
  update public.trade_opportunities set stage='active', owner='TEST OWNER', next_action='KEEP THIS', notes='KEEP NOTE' where id=saved_opp_id;
  perform public.submit_event_enquiry(second_id,'TEST AGAIN','CHANGED NAME',contact_value,'sample','SECOND ENQUIRY','website','owned','event_contact_v1',true,hash_value,previous_hash);
  if (select e.opportunity_id from public.event_enquiries e where e.id=second_id) is distinct from saved_opp_id
     or not exists(select 1 from public.trade_opportunities where id=saved_opp_id and stage='active' and owner='TEST OWNER' and next_action='KEEP THIS' and notes like 'KEEP NOTE%')
  then raise exception 'Repeat contact changed commercial state or failed to link'; end if;
  -- Simulate an older contact key that disagrees with the normalized email.
  legacy_contact := upper(legacy_id::text || '@event.invalid');
  insert into public.trade_opportunities(id,contact_key,business_name,contact) values('test-legacy-'||legacy_id,'legacy-'||legacy_id,'TEST LEGACY',legacy_contact);
  perform public.submit_event_enquiry(legacy_id,'TEST LEGACY','',lower(legacy_contact),'quote','','website','owned','event_contact_v1',true,hash_value,previous_hash);
  if (select e.opportunity_id from public.event_enquiries e where e.id=legacy_id) is distinct from ('test-legacy-'||legacy_id) then raise exception 'Legacy contact not linked'; end if;
  insert into public.trade_opportunities(id,contact_key,business_name,contact) values('test-conflict-'||conflict_id,'alternate-'||conflict_id,'TEST AMBIGUOUS',contact_value);
  perform public.submit_event_enquiry(conflict_id,'TEST AMBIGUOUS','',contact_value,'cooperation','','website','owned','event_contact_v1',true,hash_value,previous_hash);
  if not exists(select 1 from public.event_enquiries where id=conflict_id and event_enquiries.opportunity_id is null) then raise exception 'Ambiguous contact was guessed or lost'; end if;
end $$;
rollback;
select 'event enquiry SQL checks passed; all fixtures rolled back' as result;
