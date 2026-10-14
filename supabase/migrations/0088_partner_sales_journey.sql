-- Reviewed personal partner pages reuse the event inbox and the existing CRM.
-- Public intake records a pending origin; it never assigns an accepted account.
begin;
create table public.partner_network_sales_pages (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null unique references public.partner_network_partners(id) on delete restrict,
  slug text not null unique check(slug ~ '^[a-z0-9](?:[a-z0-9-]{1,62})[a-z0-9]$'),
  display_name text not null check(length(display_name) between 1 and 100),
  phone text not null check(length(phone) between 8 and 40),
  region text not null default '' check(length(region)<=160),
  tea_ids text[] not null check(cardinality(tea_ids) between 1 and 4 and tea_ids <@ array['steamed-green','smoked-black','black-op1','magnolia-green']::text[]),
  published boolean not null default false,
  revision integer not null default 1 check(revision>=1),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  review_reason text not null default '' check(length(review_reason)<=1000),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.partner_network_sales_pages enable row level security;
revoke all on public.partner_network_sales_pages from public,anon,authenticated;
grant select on public.partner_network_sales_pages to authenticated;
grant all on public.partner_network_sales_pages to service_role;
create policy partner_sales_pages_manager_read on public.partner_network_sales_pages for select to authenticated using(public.is_staff_manager());
create trigger partner_sales_pages_audit after insert or update on public.partner_network_sales_pages for each row execute function public.partner_network_audit_change();

alter table public.partner_network_referrals
  add column source_enquiry_id uuid unique references public.event_enquiries(id) on delete restrict,
  add column sales_page_id uuid references public.partner_network_sales_pages(id) on delete restrict,
  add column source_page_revision integer,
  add column source_request_fingerprint text,
  add column requested_quantity_kg numeric(16,3) check(requested_quantity_kg between 0 and 10000000),
  add column requested_delivery_on date,
  add column partner_consent_at timestamptz,
  add column partner_consent_version text;

alter table public.partner_network_order_links
  add column forecast_amount numeric(14,0) check(forecast_amount between 0 and 999999999999),
  add column forecast_note text not null default '' check(length(forecast_note)<=1000),
  add column expected_payment_on date,
  add column public_note text not null default '' check(length(public_note)<=500),
  add column next_action text not null default '' check(length(next_action)<=160),
  add column update_reason text not null default '' check(length(update_reason)<=1000),
  add column updated_by uuid references auth.users(id) on delete restrict,
  add column updated_at timestamptz;
create trigger partner_order_updates_audit after update on public.partner_network_order_links for each row execute function public.partner_network_audit_change();

create function public.partner_network_preserve_sales_origin() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
  if TG_TABLE_NAME='partner_network_sales_pages' then
    if new.partner_id<>old.partner_id then raise exception 'sales_page_owner_immutable'; end if;
  elsif old.source_enquiry_id is not null and
    (new.partner_id,new.source_enquiry_id,new.sales_page_id,new.source_page_revision,new.source_request_fingerprint,new.partner_consent_at,new.partner_consent_version)
    is distinct from
    (old.partner_id,old.source_enquiry_id,old.sales_page_id,old.source_page_revision,old.source_request_fingerprint,old.partner_consent_at,old.partner_consent_version) then
    raise exception 'sales_origin_immutable';
  end if;
  return new;
end $$;
create trigger partner_sales_page_owner before update on public.partner_network_sales_pages for each row execute function public.partner_network_preserve_sales_origin();
create trigger partner_sales_referral_origin before update on public.partner_network_referrals for each row execute function public.partner_network_preserve_sales_origin();

create function public.partner_network_manage_sales_page(p_partner_id uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.partner_network_partners; s public.partner_network_sales_pages; existing_value boolean;
  slug_value text; name_value text; phone_value text; region_value text; teas_value text[]; published_value boolean; reason_value text;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if not public.partner_network_input_keys(p_input,array['slug','display_name','phone','region','tea_ids','published','content_reviewed','reason','expected_revision'])
    or exists(select 1 from unnest(array['slug','display_name','phone','region','reason'])k where p_input ? k and jsonb_typeof(p_input->k) is distinct from 'string')
    or exists(select 1 from unnest(array['published','content_reviewed'])k where p_input ? k and jsonb_typeof(p_input->k) is distinct from 'boolean')
    or jsonb_typeof(p_input->'expected_revision') is distinct from 'number' or (p_input->>'expected_revision') !~ '^(0|[1-9][0-9]*)$' then raise exception 'invalid_sales_page'; end if;
  select * into p from public.partner_network_partners where id=p_partner_id for update;
  if not found or p.status<>'approved' then raise exception 'partner_not_approved'; end if;
  select * into s from public.partner_network_sales_pages where partner_id=p.id for update; existing_value:=found;
  if (p_input->>'expected_revision')::numeric is distinct from (case when existing_value then s.revision else 0 end)::numeric then raise exception 'sales_page_changed'; end if;
  slug_value:=coalesce(p_input->>'slug',s.slug); name_value:=public.partner_network_text(coalesce(p_input->>'display_name',s.display_name));
  phone_value:=public.partner_network_text(coalesce(p_input->>'phone',s.phone)); region_value:=public.partner_network_text(coalesce(p_input->>'region',s.region,''));
  published_value:=coalesce((p_input->>'published')::boolean,s.published,false); reason_value:=public.partner_network_text(p_input->>'reason');
  if p_input ? 'tea_ids' then
    if jsonb_typeof(p_input->'tea_ids')<>'array' or exists(select 1 from jsonb_array_elements(p_input->'tea_ids') x where jsonb_typeof(x)<>'string') then raise exception 'invalid_sales_page'; end if;
    select array_agg(value order by value) into teas_value from (select distinct jsonb_array_elements_text(p_input->'tea_ids') value)x;
    if coalesce(cardinality(teas_value),0)<>jsonb_array_length(p_input->'tea_ids') then raise exception 'invalid_sales_page'; end if;
  else teas_value:=s.tea_ids; end if;
  if coalesce(slug_value,'') !~ '^[a-z0-9](?:[a-z0-9-]{1,62})[a-z0-9]$' or slug_value like '%--%' or coalesce(length(name_value),0) not between 1 and 100
    or coalesce(length(phone_value),0) not between 8 and 40 or phone_value !~ '^\+?[0-9 ().-]+$' or phone_value ~ '^\+0' or length(regexp_replace(phone_value,'[^0-9]','','g')) not between 8 and 15
    or coalesce(length(region_value),0) not between 1 and 160 or coalesce(length(reason_value),0) not between 1 and 1000 or coalesce(cardinality(teas_value),0) not between 1 and 4
    or not(teas_value <@ array['steamed-green','smoked-black','black-op1','magnolia-green']::text[]) then raise exception 'invalid_sales_page'; end if;
  if existing_value and s.reviewed_at is not null and slug_value<>s.slug then raise exception 'sales_page_slug_locked'; end if;
  if published_value and p_input->'content_reviewed' is distinct from 'true'::jsonb then raise exception 'sales_page_content_review_required'; end if;
  if existing_value then
    update public.partner_network_sales_pages set slug=slug_value,display_name=name_value,phone=phone_value,region=region_value,tea_ids=teas_value,published=published_value,
      revision=revision+case when (slug,display_name,phone,region,tea_ids,published) is distinct from (slug_value,name_value,phone_value,region_value,teas_value,published_value) then 1 else 0 end,
      reviewed_by=case when published_value then auth.uid() else reviewed_by end,reviewed_at=case when published_value then now() else reviewed_at end,
      review_reason=reason_value,updated_by=auth.uid(),updated_at=now() where id=s.id returning * into s;
  else
    insert into public.partner_network_sales_pages(partner_id,slug,display_name,phone,region,tea_ids,published,reviewed_by,reviewed_at,review_reason,created_by,updated_by)
      values(p.id,slug_value,name_value,phone_value,region_value,teas_value,published_value,case when published_value then auth.uid() end,case when published_value then now() end,reason_value,auth.uid(),auth.uid()) returning * into s;
  end if;
  return to_jsonb(s);
end $$;

create function public.partner_network_public_sales_page(p_slug text) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('slug',s.slug,'display_name',s.display_name,'phone',s.phone,'region',s.region,'tea_ids',s.tea_ids,'revision',s.revision)
  from public.partner_network_sales_pages s join public.partner_network_partners p on p.id=s.partner_id
  where s.slug=p_slug and s.published and p.status='approved'
$$;

create function public.partner_network_submit_page_enquiry(p_slug text,p_revision integer,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.partner_network_sales_pages; p public.partner_network_partners; r public.partner_network_referrals; e public.event_enquiries;
  rid uuid; event_result jsonb; fingerprint_value text; contact_value text; key_value text; lock_key text; location_value text; interest_value text; quantity_value numeric; date_value date; teas_value text[];
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  if not public.partner_network_input_keys(p_input,array['request_id','name','business','contact','intent','note','source','medium','campaign','consent','throttle_key','previous_throttle_key',
      'location','product_interest','requested_quantity_kg','desired_date','partner_consent','tea_ids']) or p_input->'partner_consent' is distinct from 'true'::jsonb then raise exception 'partner_consent_required'; end if;
  if exists(select 1 from unnest(array['request_id','name','business','contact','intent','note','source','medium','campaign','throttle_key','previous_throttle_key','location','product_interest'])k
    where jsonb_typeof(p_input->k) is distinct from 'string') then raise exception 'invalid_page_enquiry'; end if;
  if coalesce(p_input->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'invalid_page_enquiry'; end if;
  rid:=(p_input->>'request_id')::uuid; contact_value:=public.partner_network_text(p_input->>'contact'); key_value:=public.discovery_trade_contact_key(contact_value);
  location_value:=public.partner_network_text(p_input->>'location'); interest_value:=public.partner_network_text(p_input->>'product_interest');
  quantity_value:=nullif(p_input->>'requested_quantity_kg','')::numeric; date_value:=nullif(p_input->>'desired_date','')::date;
  if not public.partner_network_contact_valid(contact_value) or length(location_value) not between 1 and 160 or length(interest_value) not between 1 and 500
    or (quantity_value is not null and (quantity_value<0 or quantity_value>10000000 or quantity_value<>round(quantity_value,3) or quantity_value::text in ('NaN','Infinity','-Infinity')))
    or (date_value is not null and (date_value<'1900-01-01' or date_value>'2100-12-31')) then raise exception 'invalid_page_enquiry'; end if;
  fingerprint_value:=md5(jsonb_build_array(p_slug,p_revision,p_input-'throttle_key'-'previous_throttle_key')::text);
  -- Follow existing intake/promotion lock ordering before protecting partner/page
  -- eligibility. Re-entrant locks inside submit_event_enquiry retain its protections.
  perform pg_advisory_xact_lock(hashtextextended('event-enquiry-request:'||rid::text,0));
  for lock_key in select distinct value from unnest(array[p_input->>'throttle_key',p_input->>'previous_throttle_key'])x(value) order by value loop
    perform pg_advisory_xact_lock(hashtextextended('event-enquiry-throttle:'||lock_key,0));
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('prospect-promotion:'||key_value,0));
  select * into p from public.partner_network_partners where id=(select partner_id from public.partner_network_sales_pages where slug=p_slug) for share;
  if not found or p.status<>'approved' then raise exception 'sales_page_unavailable'; end if;
  select * into s from public.partner_network_sales_pages where slug=p_slug and partner_id=p.id for share;
  if not found or not s.published then raise exception 'sales_page_unavailable'; end if;
  if s.revision is distinct from p_revision then raise exception 'sales_page_revision_changed'; end if;
  if jsonb_typeof(p_input->'tea_ids') is distinct from 'array' or exists(select 1 from jsonb_array_elements(p_input->'tea_ids')x where jsonb_typeof(x)<>'string') then raise exception 'invalid_page_tea_selection'; end if;
  select array_agg(value order by value) into teas_value from (select distinct jsonb_array_elements_text(p_input->'tea_ids') value)x;
  if coalesce(cardinality(teas_value),0) not between 1 and 4 or cardinality(teas_value)<>jsonb_array_length(p_input->'tea_ids') or not(teas_value <@ s.tea_ids) then raise exception 'invalid_page_tea_selection'; end if;
  select * into r from public.partner_network_referrals where id=rid;
  if found and (r.source_enquiry_id is distinct from rid or r.sales_page_id is distinct from s.id or r.source_request_fingerprint is distinct from fingerprint_value) then raise exception 'page_enquiry_retry_conflict'; end if;
  select * into e from public.event_enquiries where id=rid;
  if found and r.id is null then raise exception 'page_enquiry_retry_conflict'; end if;
  event_result:=public.submit_event_enquiry(rid,p_input->>'name',p_input->>'business',contact_value,p_input->>'intent',p_input->>'note',p_input->>'source',p_input->>'medium',p_input->>'campaign',
    (p_input->>'consent')::boolean,p_input->>'throttle_key',p_input->>'previous_throttle_key');
  if r.id is null then
    select * into e from public.event_enquiries where id=rid;
    insert into public.partner_network_referrals(id,partner_id,business_name,contact_name,contact,contact_key,location,product_interest,notes,
      source_enquiry_id,sales_page_id,source_page_revision,source_request_fingerprint,requested_quantity_kg,requested_delivery_on,partner_consent_at,partner_consent_version,contact_authorized_at,created_at,updated_at)
    values(rid,p.id,coalesce(nullif(e.business,''),e.name),e.name,e.contact,e.contact_key,location_value,interest_value,e.note,
      e.id,s.id,s.revision,fingerprint_value,quantity_value,date_value,e.consent_at,'partner_page_v1',e.consent_at,e.received_at,e.received_at);
  end if;
  return event_result;
end $$;

-- Acceptance can reuse the central opportunity created by intake, while the
-- existing duplicate/ownership checks and mandatory manager reason still apply.
alter function public.partner_network_resolve_lead(uuid,text,jsonb) rename to partner_network_resolve_lead_before_pages;
revoke all on function public.partner_network_resolve_lead_before_pages(uuid,text,jsonb) from public,anon,authenticated;
create function public.partner_network_resolve_lead(p_id uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_referrals; opportunity_value text;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  select * into r from public.partner_network_referrals where id=p_id;
  if p_action='accept' and r.source_enquiry_id is not null and nullif(p_input->>'opportunity_id','') is null then
    select e.opportunity_id into opportunity_value from public.event_enquiries e join public.trade_opportunities o on o.id=e.opportunity_id
      where e.id=r.source_enquiry_id and (o.contact_key=r.contact_key or public.discovery_trade_contact_key(o.contact)=r.contact_key)
      and (select count(*) from public.trade_opportunities x where x.contact_key=r.contact_key or public.discovery_trade_contact_key(x.contact)=r.contact_key)=1;
    if opportunity_value is not null then p_input:=p_input||jsonb_build_object('opportunity_id',opportunity_value); end if;
  end if;
  return public.partner_network_resolve_lead_before_pages(p_id,p_action,p_input);
end $$;

create function public.partner_network_order_partner_update(p_order_id text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.partner_network_order_links; r public.partner_network_referrals; amount_value numeric; date_value date; reason_value text;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if not public.partner_network_input_keys(p_input,array['forecast_amount','forecast_note','expected_payment_on','public_note','next_action','reason'])
    or exists(select 1 from unnest(array['forecast_note','public_note','next_action','reason'])k where p_input ? k and jsonb_typeof(p_input->k) is distinct from 'string')
    or (p_input ? 'expected_payment_on' and jsonb_typeof(p_input->'expected_payment_on') not in ('string','null'))
    or (p_input ? 'forecast_amount' and jsonb_typeof(p_input->'forecast_amount') not in ('number','string','null')) then raise exception 'invalid_partner_order_update'; end if;
  reason_value:=public.partner_network_text(p_input->>'reason');
  if length(reason_value) not between 1 and 1000 then raise exception 'reason_required'; end if;
  perform 1 from public.orders where id=p_order_id for update;
  select * into l from public.partner_network_order_links where order_id=p_order_id for update;
  if not found then raise exception 'order_referral_link_required'; end if;
  select * into r from public.partner_network_referrals where id=l.referral_id;
  if r.status<>'accepted' then raise exception 'accepted_referral_required'; end if;
  amount_value:=case when p_input ? 'forecast_amount' then nullif(p_input->>'forecast_amount','')::numeric else l.forecast_amount end;
  date_value:=case when p_input ? 'expected_payment_on' then nullif(p_input->>'expected_payment_on','')::date else l.expected_payment_on end;
  if (amount_value is not null and (amount_value<0 or amount_value>999999999999 or amount_value<>trunc(amount_value) or amount_value::text in ('NaN','Infinity','-Infinity')))
    or (date_value is not null and (date_value<'1900-01-01' or date_value>'2100-12-31'))
    or length(public.partner_network_text(p_input->>'forecast_note'))>1000 or length(public.partner_network_text(p_input->>'public_note'))>500 or length(public.partner_network_text(p_input->>'next_action'))>160 then raise exception 'invalid_partner_order_update'; end if;
  if amount_value is not null and length(case when p_input ? 'forecast_note' then public.partner_network_text(p_input->>'forecast_note') else l.forecast_note end)=0 then raise exception 'forecast_note_required'; end if;
  update public.partner_network_order_links set forecast_amount=amount_value,expected_payment_on=date_value,
    forecast_note=case when p_input ? 'forecast_note' then public.partner_network_text(p_input->>'forecast_note') else forecast_note end,
    public_note=case when p_input ? 'public_note' then public.partner_network_text(p_input->>'public_note') else public_note end,
    next_action=case when p_input ? 'next_action' then public.partner_network_text(p_input->>'next_action') else next_action end,
    update_reason=reason_value,updated_by=auth.uid(),updated_at=now() where order_id=p_order_id returning * into l;
  return to_jsonb(l);
end $$;

create function public.partner_network_sales_orders(p_partner_id uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
  select coalesce(jsonb_agg(data order by ts desc),'[]'::jsonb) from (
    select o.ts,jsonb_build_object('id',o.id,'referral_id',r.id,'ts',o.ts,'status',o.status,'stage',to_jsonb(o)->'stage','health',to_jsonb(o)->'health',
      'shipping_carrier',to_jsonb(o)->'shipping_carrier','tracking_code',to_jsonb(o)->'tracking_code','carrier_status_code',to_jsonb(o)->'carrier_status_code',
      'carrier_status_name',to_jsonb(o)->'carrier_status_name','carrier_status_at',to_jsonb(o)->'carrier_status_at','delivered_at',to_jsonb(o)->'delivered_at',
      'delivery_due_at',(select pr.delivery_due_at from public.procedure_runs pr where pr.order_id=o.id),
      'collection_complete',coalesce((public.partner_network_financial(o.id)->>'collection_complete')::boolean,false),
      'forecast_amount',l.forecast_amount,'forecast_note',l.forecast_note,'expected_payment_on',l.expected_payment_on,'public_note',l.public_note,'next_action',l.next_action,
      'updated_at',greatest(l.updated_at,o.ts,nullif(to_jsonb(o)->>'updated_at','')::timestamptz,(select max(ev.created_at) from public.order_events ev where ev.order_id=o.id)),
      'lines',coalesce((select jsonb_agg(jsonb_build_object(
        'name',case when jsonb_typeof(x->'name')='object' then coalesce(x->'name'->>'vi',x->'name'->>'en','Trà') else coalesce(x->>'name',x->>'tea_name',x->>'tea',x->>'label','Trà') end,
        'qty',case when coalesce(x->>'qty',x->>'kg',x->>'quantity','') ~ '^[0-9]+(?:\.[0-9]+)?$' then coalesce(x->'qty',x->'kg',x->'quantity') else 'null'::jsonb end,
        'unit',case when x ? 'unit' then left(x->>'unit',16) when x ? 'kg' then 'kg' else null end))
        from jsonb_array_elements(case when jsonb_typeof(to_jsonb(o)->'lines')='array' then to_jsonb(o)->'lines' else '[]'::jsonb end)x),'[]'::jsonb))
      ||case when p_partner_id is null then jsonb_build_object('partner_id',r.partner_id,'referral_name',r.business_name) else '{}'::jsonb end data
    from public.partner_network_order_links l join public.partner_network_referrals r on r.id=l.referral_id join public.orders o on o.id=l.order_id
    where r.status='accepted' and (p_partner_id is null or r.partner_id=p_partner_id) order by o.ts desc,o.id limit 200
  )visible_rows
$$;

alter function public.partner_network_snapshot() rename to partner_network_snapshot_before_sales_journey;
revoke all on function public.partner_network_snapshot_before_sales_journey() from public,anon,authenticated;
create function public.partner_network_snapshot() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb; p public.partner_network_partners; s public.partner_network_sales_pages; item jsonb; r public.partner_network_referrals;
  referrals_value jsonb:='[]'::jsonb; commissions_value jsonb:='[]'::jsonb; samples_value jsonb; quotes_value jsonb;
begin
  result:=public.partner_network_snapshot_before_sales_journey();
  select * into p from public.partner_network_partners where user_id=auth.uid();
  if not found then return result||jsonb_build_object('orders','[]'::jsonb,'sales_page',null); end if;
  select * into s from public.partner_network_sales_pages where partner_id=p.id;
  for item in select value from jsonb_array_elements(result->'referrals') loop
    select * into r from public.partner_network_referrals where id=(item->>'id')::uuid and partner_id=p.id;
    samples_value:='[]'::jsonb; quotes_value:='[]'::jsonb;
    if r.status='accepted' then
      select coalesce(jsonb_agg(data),'[]'::jsonb) into samples_value from (select jsonb_build_object('id',x.id,'status',x.status,'sent_at',to_jsonb(x)->'sent_at','updated_at',to_jsonb(x)->'updated_at') data
        from public.sample_requests x where x.opportunity_id=r.opportunity_id order by coalesce(to_jsonb(x)->>'updated_at',to_jsonb(x)->>'ts') desc,x.id limit 10)q;
      select coalesce(jsonb_agg(data),'[]'::jsonb) into quotes_value from (select jsonb_build_object('id',x.id,'status',to_jsonb(x)->'status','sent_at',to_jsonb(x)->'sent_at','updated_at',to_jsonb(x)->'updated_at') data
        from public.trade_quotes x where x.opportunity_id=r.opportunity_id order by to_jsonb(x)->>'updated_at' desc,x.id limit 10)q;
    end if;
    referrals_value:=referrals_value||jsonb_build_array(item||jsonb_build_object('source_enquiry_id',r.source_enquiry_id,'requested_quantity_kg',r.requested_quantity_kg,
      'requested_delivery_on',r.requested_delivery_on,'samples',samples_value,'quotes',quotes_value));
  end loop;
  for item in select value from jsonb_array_elements(result->'commissions') loop
    if coalesce((item->>'stale')::boolean,false) then item:=jsonb_set(item,'{eligible_amount}','null'::jsonb); end if;
    item:=item||jsonb_build_object('expected_payment_on',(select l.expected_payment_on from public.partner_network_order_links l where l.order_id=item->>'order_id'));
    commissions_value:=commissions_value||jsonb_build_array(item);
  end loop;
  return result||jsonb_build_object('referrals',referrals_value,'commissions',commissions_value,'orders',public.partner_network_sales_orders(p.id),
    'sales_page',case when s.id is null then null else jsonb_build_object('slug',s.slug,'display_name',s.display_name,'phone',s.phone,'region',s.region,'tea_ids',s.tea_ids,'revision',s.revision,'published',s.published) end);
end $$;

alter function public.partner_network_admin_snapshot() rename to partner_network_admin_snapshot_before_sales_journey;
revoke all on function public.partner_network_admin_snapshot_before_sales_journey() from public,anon,authenticated;
create function public.partner_network_admin_snapshot() returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
  result:=public.partner_network_admin_snapshot_before_sales_journey();
  return result||jsonb_build_object('sales_pages',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.partner_network_sales_pages s),'[]'::jsonb),
    'order_updates',public.partner_network_sales_orders(null));
end $$;

revoke all on function public.partner_network_preserve_sales_origin(),public.partner_network_sales_orders(uuid),
  public.partner_network_manage_sales_page(uuid,jsonb),public.partner_network_public_sales_page(text),public.partner_network_submit_page_enquiry(text,integer,jsonb),
  public.partner_network_resolve_lead(uuid,text,jsonb),public.partner_network_order_partner_update(text,jsonb),public.partner_network_snapshot(),public.partner_network_admin_snapshot() from public,anon,authenticated;
grant execute on function public.partner_network_public_sales_page(text) to anon,authenticated;
grant execute on function public.partner_network_submit_page_enquiry(text,integer,jsonb) to service_role;
grant execute on function public.partner_network_manage_sales_page(uuid,jsonb),public.partner_network_resolve_lead(uuid,text,jsonb),
  public.partner_network_order_partner_update(text,jsonb),public.partner_network_snapshot(),public.partner_network_admin_snapshot() to authenticated;
commit;
