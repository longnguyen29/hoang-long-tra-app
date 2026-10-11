-- Phase 1 referral partners are different from wholesale buyer accounts.
-- Additive, dormant until explicitly released. No public launch or payment automation.
begin;

create table public.partner_network_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  code text unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected','disabled')),
  business_name text not null check (length(business_name) between 1 and 160),
  contact_name text not null check (length(contact_name) between 1 and 100),
  email text not null,
  phone text not null check (length(phone) between 8 and 40),
  region text not null check (length(region) between 1 and 160),
  partner_type text not null check (partner_type in ('consultant','supplier','sales_rep','distributor')),
  notes text not null default '' check (length(notes) <= 1500),
  rate_percent numeric(7,4) check (rate_percent between 0 and 100),
  default_rate_percent numeric(7,4) check (default_rate_percent between 0 and 100),
  first_order_rate_percent numeric(7,4) check (first_order_rate_percent between 0 and 100),
  repeat_rate_percent numeric(7,4) check (repeat_rate_percent between 0 and 100),
  repeat_order_limit integer not null default 0 check (repeat_order_limit between 0 and 30),
  terms text not null default '' check (length(terms)<=2000),
  consent_at timestamptz not null default now(),
  consent_version text not null default 'partner_network_v1',
  review_reason text not null default '',
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_network_approval_code check (status <> 'approved' or code is not null)
);

create table public.partner_network_referrals (
  id uuid primary key,
  partner_id uuid not null references public.partner_network_partners(id) on delete restrict,
  business_name text not null check (length(business_name) between 1 and 160),
  contact_name text not null check (length(contact_name) between 1 and 100),
  contact text not null check (length(contact) between 1 and 160),
  contact_key text not null,
  location text not null check (length(location) between 1 and 240),
  product_interest text not null check (length(product_interest) between 1 and 500),
  expected_volume_kg numeric(14,2) check (expected_volume_kg >= 0 and expected_volume_kg <= 10000000),
  notes text not null default '' check (length(notes) <= 1500),
  contact_authorized_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  opportunity_id text references public.trade_opportunities(id) on delete restrict,
  resolution_reason text not null default '',
  resolved_by uuid references auth.users(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_network_accepted_link check (status <> 'accepted' or opportunity_id is not null)
);
create unique index partner_network_one_referral_opportunity on public.partner_network_referrals(opportunity_id) where status = 'accepted';
create index partner_network_referrals_partner_idx on public.partner_network_referrals(partner_id,created_at desc);
create index partner_network_referrals_contact_idx on public.partner_network_referrals(contact_key);

create table public.partner_network_order_links (
  order_id text primary key references public.orders(id) on delete cascade,
  referral_id uuid not null references public.partner_network_referrals(id) on delete restrict,
  source text not null check (source in ('manual','quote','account')),
  reason text not null default '',
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.partner_network_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique references public.partner_network_order_links(order_id) on delete restrict,
  referral_id uuid not null references public.partner_network_referrals(id) on delete restrict,
  partner_id uuid not null references public.partner_network_partners(id) on delete restrict,
  status text not null default 'review' check (status in ('draft','review','approved','paid','void')),
  rate_percent numeric(7,4) not null check (rate_percent between 0 and 100),
  collected_amount numeric(14,2) not null default 0 check (collected_amount >= 0),
  vat_amount numeric(14,2) not null check (vat_amount >= 0),
  billed_shipping_amount numeric(14,2) not null check (billed_shipping_amount >= 0),
  refunded_amount numeric(14,2) not null check (refunded_amount >= 0),
  cancelled boolean not null default false,
  eligible_base numeric(14,2) not null default 0 check (eligible_base >= 0),
  calculated_amount numeric(14,2) not null default 0 check (calculated_amount >= 0),
  adjustment_amount numeric(14,2) not null default 0,
  adjustment_reason text not null default '',
  order_index integer not null default 1,
  internal_cost_total numeric(14,2) check (internal_cost_total>=0),
  minimum_retained_profit numeric(14,2) check (minimum_retained_profit>=0),
  exception_reason text not null default '',
  exception_by uuid references auth.users(id) on delete restrict,
  review_note text not null,
  fingerprint text not null,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  approved_amount numeric(14,2),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  paid_amount numeric(14,2),
  paid_reference text,
  paid_at timestamptz,
  paid_by uuid references auth.users(id) on delete restrict,
  void_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_network_paid_record check (status <> 'paid' or (paid_amount > 0 and paid_reference is not null and paid_at is not null and paid_by is not null))
);

-- Latest reviewed exclusions/profit assumptions are separate from immutable
-- commission payment records, so a later refund can flag a historical overpayment.
create table public.partner_network_order_reviews (
  order_id text primary key references public.orders(id) on delete restrict,
  vat_amount numeric(14,2) not null check (vat_amount>=0),
  billed_shipping_amount numeric(14,2) not null check (billed_shipping_amount>=0),
  refunded_amount numeric(14,2) not null check (refunded_amount>=0),
  cancelled boolean not null default false,
  internal_cost_total numeric(14,2) check (internal_cost_total>=0),
  minimum_retained_profit numeric(14,2) check (minimum_retained_profit>=0),
  review_note text not null,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.partner_network_audit (
  id bigint generated always as identity primary key,
  entity text not null,
  entity_id text not null,
  action text not null,
  actor_id uuid references auth.users(id) on delete restrict,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.partner_network_partners enable row level security;
alter table public.partner_network_referrals enable row level security;
alter table public.partner_network_order_links enable row level security;
alter table public.partner_network_commissions enable row level security;
alter table public.partner_network_order_reviews enable row level security;
alter table public.partner_network_audit enable row level security;
revoke all on public.partner_network_partners,public.partner_network_referrals,public.partner_network_order_links,public.partner_network_commissions,public.partner_network_order_reviews,public.partner_network_audit from public,anon,authenticated;
grant select on public.partner_network_partners,public.partner_network_referrals,public.partner_network_order_links,public.partner_network_commissions,public.partner_network_order_reviews,public.partner_network_audit to authenticated;
grant all on public.partner_network_partners,public.partner_network_referrals,public.partner_network_order_links,public.partner_network_commissions,public.partner_network_order_reviews,public.partner_network_audit to service_role;
create policy partner_network_partners_manager_read on public.partner_network_partners for select to authenticated using (public.is_staff_manager());
create policy partner_network_referrals_manager_read on public.partner_network_referrals for select to authenticated using (public.is_staff_manager());
create policy partner_network_order_links_manager_read on public.partner_network_order_links for select to authenticated using (public.is_staff_manager());
create policy partner_network_commissions_manager_read on public.partner_network_commissions for select to authenticated using (public.is_staff_manager());
create policy partner_network_reviews_manager_read on public.partner_network_order_reviews for select to authenticated using (public.is_staff_manager());
create policy partner_network_audit_manager_read on public.partner_network_audit for select to authenticated using (public.is_staff_manager());

create function public.partner_network_input_keys(p_input jsonb,p_allowed text[]) returns boolean
language sql immutable set search_path=pg_catalog,public as $$
  select coalesce(jsonb_typeof(p_input)='object' and not exists(select 1 from jsonb_object_keys(p_input) k where not(k=any(p_allowed))),false)
$$;
create function public.partner_network_text(p_value text) returns text
language sql immutable set search_path=pg_catalog,public as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(normalize(coalesce(p_value,''),NFC),'[[:cntrl:]]','','g'),
    '['||chr(1564)||chr(8203)||'-'||chr(8207)||chr(8234)||'-'||chr(8238)||chr(8288)||'-'||chr(8303)||chr(65279)||']','','g'),'[[:space:]]+',' ','g'))
$$;
create function public.partner_network_contact_valid(p_contact text) returns boolean
language sql immutable set search_path=pg_catalog,public as $$
  select case when position('@' in coalesce(p_contact,''))>0 then p_contact ~* '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$'
  else p_contact ~ '^\+?[0-9 ().-]+$' and length(regexp_replace(p_contact,'[^0-9]','','g')) between 8 and 15 end
$$;

create function public.partner_network_audit_change() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  insert into public.partner_network_audit(entity,entity_id,action,actor_id,before_data,after_data)
  values(TG_TABLE_NAME,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'order_id',to_jsonb(old)->>'id',to_jsonb(old)->>'order_id'),lower(TG_OP),auth.uid(),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) end,case when TG_OP<>'DELETE' then to_jsonb(new) end);
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
create trigger partner_network_partners_audit after insert or update on public.partner_network_partners for each row execute function public.partner_network_audit_change();
create trigger partner_network_referrals_audit after insert or update on public.partner_network_referrals for each row execute function public.partner_network_audit_change();
create trigger partner_network_links_audit after insert or delete on public.partner_network_order_links for each row execute function public.partner_network_audit_change();
create trigger partner_network_commissions_audit after insert or update on public.partner_network_commissions for each row execute function public.partner_network_audit_change();
create trigger partner_network_reviews_audit after insert or update on public.partner_network_order_reviews for each row execute function public.partner_network_audit_change();

create function public.partner_network_apply(p_input jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare u auth.users; result uuid; business text; person text; phone_value text; region_value text; notes_value text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into u from auth.users where id=auth.uid();
  if not found or u.email_confirmed_at is null or nullif(u.email,'') is null then raise exception 'verified_email_required'; end if;
  if not public.partner_network_input_keys(p_input,array['business_name','contact_name','phone','region','partner_type','notes','consent']) or p_input->'consent' is distinct from 'true'::jsonb then raise exception 'invalid_application'; end if;
  if exists(select 1 from unnest(array['business_name','contact_name','phone','region','partner_type'])k where jsonb_typeof(p_input->k) is distinct from 'string')
    or (p_input ? 'notes' and jsonb_typeof(p_input->'notes') is distinct from 'string') then raise exception 'invalid_application'; end if;
  business:=public.partner_network_text(p_input->>'business_name'); person:=public.partner_network_text(p_input->>'contact_name');
  phone_value:=public.partner_network_text(p_input->>'phone'); region_value:=public.partner_network_text(p_input->>'region'); notes_value:=public.partner_network_text(p_input->>'notes');
  if length(business) not between 1 and 160 or length(person) not between 1 and 100 or not public.partner_network_contact_valid(phone_value) or position('@' in phone_value)>0
    or length(phone_value)>40 or length(region_value) not between 1 and 160 or length(notes_value)>1500
    or coalesce(p_input->>'partner_type','') not in ('consultant','supplier','sales_rep','distributor') then raise exception 'invalid_application'; end if;
  perform pg_advisory_xact_lock(hashtextextended('partner-network-user:'||auth.uid()::text,0));
  if exists(select 1 from public.partner_network_partners where user_id=auth.uid()) then raise exception 'application_exists'; end if;
  insert into public.partner_network_partners(user_id,business_name,contact_name,email,phone,region,partner_type,notes)
  values(auth.uid(),business,person,lower(u.email),phone_value,region_value,p_input->>'partner_type',notes_value) returning id into result;
  return result;
end $$;

create function public.partner_network_manage_partner(p_id uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.partner_network_partners; rate_value numeric; first_rate numeric; repeat_rate numeric; repeat_limit integer; terms_value text; reason_value text;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_action not in ('approve','reject','disable','update') or not public.partner_network_input_keys(p_input,array['rate_percent','default_rate_percent','first_order_rate_percent','repeat_rate_percent','repeat_order_limit','terms','reason','business_name','contact_name','phone','region','partner_type','notes']) then raise exception 'invalid_partner_action'; end if;
  select * into p from public.partner_network_partners where id=p_id for update;
  if not found then raise exception 'partner_not_found'; end if;
  if p_input ? 'rate_percent' and p_input ? 'default_rate_percent' and (p_input->>'rate_percent')::numeric is distinct from (p_input->>'default_rate_percent')::numeric then raise exception 'conflicting_commission_rate'; end if;
  rate_value:=case when p_input ? 'default_rate_percent' then (p_input->>'default_rate_percent')::numeric when p_input ? 'rate_percent' then (p_input->>'rate_percent')::numeric else p.default_rate_percent end;
  first_rate:=case when p_input ? 'first_order_rate_percent' then (p_input->>'first_order_rate_percent')::numeric else p.first_order_rate_percent end;
  repeat_rate:=case when p_input ? 'repeat_rate_percent' then (p_input->>'repeat_rate_percent')::numeric else p.repeat_rate_percent end;
  repeat_limit:=case when p_input ? 'repeat_order_limit' then (p_input->>'repeat_order_limit')::integer else p.repeat_order_limit end;
  terms_value:=case when p_input ? 'terms' then public.partner_network_text(p_input->>'terms') else p.terms end;
  reason_value:=public.partner_network_text(p_input->>'reason');
  if rate_value is not null and (rate_value<0 or rate_value>100 or rate_value::text in ('NaN','Infinity','-Infinity')) then raise exception 'invalid_commission_rate'; end if;
  if (first_rate is not null and (first_rate<0 or first_rate>100 or first_rate::text in ('NaN','Infinity','-Infinity'))) or (repeat_rate is not null and (repeat_rate<0 or repeat_rate>100 or repeat_rate::text in ('NaN','Infinity','-Infinity')))
    or repeat_limit is null or repeat_limit not between 0 and 30 or length(terms_value)>2000 then raise exception 'invalid_commission_terms'; end if;
  if p_action in ('reject','disable') and length(reason_value) not between 1 and 1000 then raise exception 'reason_required'; end if;
  if p_action='approve' then
    update public.partner_network_partners set status='approved',code=coalesce(code,'HL-P-'||upper(replace(id::text,'-',''))),rate_percent=rate_value,default_rate_percent=rate_value,
      first_order_rate_percent=first_rate,repeat_rate_percent=repeat_rate,repeat_order_limit=repeat_limit,terms=terms_value,
      approved_at=coalesce(approved_at,now()),approved_by=coalesce(approved_by,auth.uid()),review_reason=reason_value,updated_at=now() where id=p.id returning * into p;
  elsif p_action in ('reject','disable') then
    update public.partner_network_partners set status=case p_action when 'reject' then 'rejected' else 'disabled' end,review_reason=reason_value,updated_at=now() where id=p.id returning * into p;
  else
    if p_input ? 'business_name' then p.business_name:=public.partner_network_text(p_input->>'business_name'); end if;
    if p_input ? 'contact_name' then p.contact_name:=public.partner_network_text(p_input->>'contact_name'); end if;
    if p_input ? 'phone' then p.phone:=public.partner_network_text(p_input->>'phone'); end if;
    if p_input ? 'region' then p.region:=public.partner_network_text(p_input->>'region'); end if;
    if p_input ? 'partner_type' then p.partner_type:=p_input->>'partner_type'; end if;
    if p_input ? 'notes' then p.notes:=public.partner_network_text(p_input->>'notes'); end if;
    if length(p.business_name) not between 1 and 160 or length(p.contact_name) not between 1 and 100 or length(p.phone)>40 or not public.partner_network_contact_valid(p.phone)
      or position('@' in p.phone)>0 or length(p.region) not between 1 and 160 or length(p.notes)>1500 or p.partner_type not in ('consultant','supplier','sales_rep','distributor') then raise exception 'invalid_partner_details'; end if;
    update public.partner_network_partners set business_name=p.business_name,contact_name=p.contact_name,phone=p.phone,region=p.region,partner_type=p.partner_type,
      notes=p.notes,rate_percent=rate_value,default_rate_percent=rate_value,first_order_rate_percent=first_rate,repeat_rate_percent=repeat_rate,repeat_order_limit=repeat_limit,terms=terms_value,
      review_reason=case when p_input ? 'reason' then reason_value else review_reason end,updated_at=now() where id=p.id returning * into p;
  end if;
  return to_jsonb(p);
end $$;

create function public.partner_network_submit_lead(p_input jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.partner_network_partners; saved public.partner_network_referrals; rid uuid; business text; person text; contact_value text; location_value text; interest_value text; notes_value text; volume numeric;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into p from public.partner_network_partners where user_id=auth.uid() for update;
  if not found or p.status<>'approved' then raise exception 'partner_not_approved'; end if;
  if not public.partner_network_input_keys(p_input,array['request_id','business_name','contact_name','contact','location','product_interest','expected_volume_kg','notes','contact_authorized']) or p_input->'contact_authorized' is distinct from 'true'::jsonb then raise exception 'authorized_contact_required'; end if;
  if exists(select 1 from unnest(array['request_id','business_name','contact_name','contact','location','product_interest'])k where jsonb_typeof(p_input->k) is distinct from 'string')
    or (p_input ? 'notes' and jsonb_typeof(p_input->'notes') is distinct from 'string') then raise exception 'invalid_referral'; end if;
  if coalesce(p_input->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'invalid_referral'; end if;
  rid:=(p_input->>'request_id')::uuid; business:=public.partner_network_text(p_input->>'business_name'); person:=public.partner_network_text(p_input->>'contact_name');
  contact_value:=public.partner_network_text(p_input->>'contact'); location_value:=public.partner_network_text(p_input->>'location'); interest_value:=public.partner_network_text(p_input->>'product_interest'); notes_value:=public.partner_network_text(p_input->>'notes');
  volume:=nullif(p_input->>'expected_volume_kg','')::numeric;
  if rid is null or length(business) not between 1 and 160 or length(person) not between 1 and 100 or length(contact_value)>160 or not public.partner_network_contact_valid(contact_value)
    or length(location_value) not between 1 and 240 or length(interest_value) not between 1 and 500 or length(notes_value)>1500
    or (volume is not null and (volume<0 or volume>10000000 or volume<>round(volume,2) or volume::text in ('NaN','Infinity','-Infinity'))) then raise exception 'invalid_referral'; end if;
  perform pg_advisory_xact_lock(hashtextextended('partner-network-request:'||rid::text,0));
  select * into saved from public.partner_network_referrals where id=rid;
  if found then
    if (saved.partner_id,saved.business_name,saved.contact_name,saved.contact,saved.location,saved.product_interest,saved.expected_volume_kg,saved.notes)
      is distinct from (p.id,business,person,contact_value,location_value,interest_value,volume,notes_value) then raise exception 'referral_retry_conflict'; end if;
    return saved.id;
  end if;
  if (select count(*) from public.partner_network_referrals where partner_id=p.id and created_at>now()-interval '1 day')>=30 then raise exception 'referral_daily_limit'; end if;
  insert into public.partner_network_referrals(id,partner_id,business_name,contact_name,contact,contact_key,location,product_interest,expected_volume_kg,notes)
  values(rid,p.id,business,person,contact_value,public.discovery_trade_contact_key(contact_value),location_value,interest_value,volume,notes_value);
  return rid;
end $$;

create function public.partner_network_duplicates(p_id uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
  with referral as (select * from public.partner_network_referrals where id=p_id), candidates as (
    select 'referral'::text kind,x.id::text id,x.business_name name,'contact_or_business_location'::text reason,x.opportunity_id
      from public.partner_network_referrals x,referral r where x.id<>r.id and x.status<>'rejected' and
      (x.contact_key=r.contact_key or (lower(public.partner_network_text(x.business_name))=lower(r.business_name) and lower(public.partner_network_text(x.location))=lower(r.location)))
    union all select 'opportunity',x.id,x.business_name,'contact',x.id from public.trade_opportunities x,referral r
      where x.contact_key=r.contact_key or public.discovery_trade_contact_key(x.contact)=r.contact_key
    union all select 'customer',x.id,x.business_name,'contact_or_business_location',x.opportunity_id from public.wholesale_accounts x,referral r
      where public.discovery_trade_contact_key(x.contact)=r.contact_key or (lower(public.partner_network_text(x.business_name))=lower(r.business_name) and lower(public.partner_network_text(x.delivery_address))=lower(r.location))
    union all select 'order',x.id,x.customer_name,'contact_or_business_location',q.opportunity_id from public.orders x left join public.trade_quotes q on q.id=x.quote_id,referral r
      where public.discovery_trade_contact_key(x.contact)=r.contact_key or (lower(public.partner_network_text(x.customer_name))=lower(r.business_name) and lower(public.partner_network_text(x.address))=lower(r.location))
    union all select 'prospect',x.id::text,x.name,'authorized_contact',o.id from public.discovery_prospects x join public.discovery_contacts c on c.prospect_id=x.id
      left join public.trade_opportunities o on o.discovery_prospect_id=x.id,referral r
      where c.kind in ('email','phone') and public.discovery_trade_contact_key(c.value)=r.contact_key
    union all select 'prospect',x.id::text,x.name,'business_location',o.id from public.discovery_prospects x left join public.trade_opportunities o on o.discovery_prospect_id=x.id,referral r
      where lower(public.partner_network_text(x.name))=lower(r.business_name) and lower(public.partner_network_text(x.region))=lower(r.location)
  ) select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from (select distinct * from candidates order by kind,id limit 50)c
$$;

create function public.partner_network_resolve_lead(p_id uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_referrals; p public.partner_network_partners; o public.trade_opportunities; key_value text; reason_value text; chosen text; duplicates jsonb;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_action not in ('accept','reject') or not public.partner_network_input_keys(p_input,array['opportunity_id','reason']) then raise exception 'invalid_referral_action'; end if;
  -- Serializes all resolutions for the same commercial identity, as prospect promotion does.
  select contact_key into key_value from public.partner_network_referrals where id=p_id;
  if not found then raise exception 'referral_not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('prospect-promotion:'||key_value,0));
  select * into r from public.partner_network_referrals where id=p_id for update;
  select * into p from public.partner_network_partners where id=r.partner_id for update;
  reason_value:=public.partner_network_text(p_input->>'reason'); chosen:=nullif(public.partner_network_text(p_input->>'opportunity_id'),'');
  if length(reason_value)>1000 then raise exception 'invalid_reason'; end if;
  if r.status<>'pending' then raise exception 'referral_already_resolved'; end if;
  if p_action='reject' then
    if reason_value='' then raise exception 'reason_required'; end if;
    update public.partner_network_referrals set status='rejected',resolution_reason=reason_value,resolved_by=auth.uid(),resolved_at=now(),updated_at=now() where id=r.id returning * into r;
    return to_jsonb(r);
  end if;
  if p.status<>'approved' then raise exception 'partner_not_approved'; end if;
  duplicates:=public.partner_network_duplicates(r.id);
  if (chosen is not null or jsonb_array_length(duplicates)>0) and reason_value='' then raise exception 'duplicate_resolution_required'; end if;
  if chosen is not null then
    select * into o from public.trade_opportunities where id=chosen for update;
    if not found then raise exception 'opportunity_not_found'; end if;
  else
    if exists(select 1 from public.trade_opportunities where contact_key=key_value or public.discovery_trade_contact_key(contact)=key_value) then raise exception 'select_existing_opportunity'; end if;
    insert into public.trade_opportunities(id,contact_key,business_name,contact,stage,source_type,source_id,monthly_potential_kg,next_action,next_action_at,notes)
    values('opp-referral-'||r.id,key_value,r.business_name,r.contact,'lead','partner_referral',r.id::text,coalesce(r.expected_volume_kg,0),'Xác nhận nhu cầu khách do đối tác giới thiệu',now(),
      concat('Nguồn giới thiệu: ',p.code,E'\nĐịa điểm: ',r.location,E'\nNhu cầu: ',r.product_interest,case when r.notes<>'' then E'\n'||r.notes else '' end)) returning * into o;
  end if;
  if exists(select 1 from public.partner_network_referrals where opportunity_id=o.id and status='accepted' and id<>r.id) then raise exception 'opportunity_already_attributed'; end if;
  update public.partner_network_referrals set status='accepted',opportunity_id=o.id,resolution_reason=reason_value,resolved_by=auth.uid(),resolved_at=now(),updated_at=now() where id=r.id returning * into r;
  return to_jsonb(r);
end $$;

create function public.partner_network_sync_order_links() returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  -- Only structural CRM/quote/account relationships establish automatic attribution.
  -- Never silently match orders by an unverified phone number.
  insert into public.partner_network_order_links(order_id,referral_id,source,reason,created_by)
  select distinct on (o.id) o.id,r.id,'quote','Liên kết báo giá trong Pipeline',auth.uid()
    from public.partner_network_referrals r join public.trade_quotes q on q.opportunity_id=r.opportunity_id
    join public.orders o on o.quote_id=q.id or q.converted_order_id=o.id
    where r.status='accepted' and o.type='wholesale' and o.ts>=r.created_at order by o.id,r.created_at
    on conflict(order_id) do nothing;
  insert into public.partner_network_order_links(order_id,referral_id,source,reason,created_by)
  select distinct on (o.id) o.id,r.id,'account','Liên kết tài khoản khách B2B trong Pipeline',auth.uid()
    from public.partner_network_referrals r join public.wholesale_accounts a on a.opportunity_id=r.opportunity_id
    join public.orders o on o.partner_account_id=a.id where r.status='accepted' and o.type='wholesale' and o.ts>=r.created_at order by o.id,r.created_at
    on conflict(order_id) do nothing;
end $$;

create function public.partner_network_link_order(p_referral_id uuid,p_order_id text,p_reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_referrals; o public.orders; existing public.partner_network_order_links; result public.partner_network_order_links;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if length(public.partner_network_text(p_reason)) not between 1 and 1000 then raise exception 'reason_required'; end if;
  select * into r from public.partner_network_referrals where id=p_referral_id for update;
  if not found or r.status<>'accepted' then raise exception 'accepted_referral_required'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.type<>'wholesale' then raise exception 'wholesale_order_required'; end if;
  select * into existing from public.partner_network_order_links where order_id=o.id;
  if found then
    if existing.referral_id<>r.id then raise exception 'order_already_attributed'; end if;
    return to_jsonb(existing);
  end if;
  insert into public.partner_network_order_links(order_id,referral_id,source,reason,created_by)
    values(o.id,r.id,'manual',public.partner_network_text(p_reason),auth.uid()) returning * into result;
  return to_jsonb(result);
end $$;

create function public.partner_network_financial(p_order_id text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare o public.orders; r public.receivables; collected numeric:=0; payment_rows jsonb; cancelled boolean;
begin
  select * into o from public.orders where id=p_order_id;
  if not found then return jsonb_build_object('collected',0,'collection_complete',false,'cancelled',true,'fingerprint','missing-order'); end if;
  select * into r from public.receivables where order_id=o.id;
  if found then
    select coalesce(sum(amount),0),coalesce(jsonb_agg(jsonb_build_array(id,amount,paid_at) order by id),'[]'::jsonb)
      into collected,payment_rows from public.receivable_payments where receivable_id=r.id;
    collected:=case when r.status='void' then 0 else least(collected,r.total) end;
  else payment_rows:='[]'::jsonb; end if;
  cancelled:=o.type<>'wholesale' or coalesce(to_jsonb(o)->>'status','') in ('cancelled','canceled','void') or nullif(to_jsonb(o)->>'cancelled_at','') is not null;
  return jsonb_build_object('collected',collected,'collection_complete',coalesce(r.id is not null and r.status='paid' and r.total>0 and collected>=r.total,false),
    'cancelled',cancelled,'receivable_id',r.id,'receivable_total',coalesce(r.total,0),
    'fingerprint',md5(jsonb_build_array(o.id,o.type,cancelled,r.id,r.total,r.status,payment_rows)::text));
end $$;

create function public.partner_network_fingerprint(p_order_id text,p_referral_id uuid) returns text
language sql stable security definer set search_path=pg_catalog,public as $$
  select md5(jsonb_build_array(public.partner_network_financial(p_order_id)->>'fingerprint',r.id,r.partner_id,r.status,r.opportunity_id,l.referral_id)::text)
  from public.partner_network_referrals r left join public.partner_network_order_links l on l.order_id=p_order_id where r.id=p_referral_id
$$;

-- A first/repeat sequence is per referred CUSTOMER/opportunity, not across all
-- customers introduced by a partner. Only cash-collected, non-cancelled orders count.
create function public.partner_network_order_index(p_order_id text,p_referral_id uuid) returns integer
language sql stable security definer set search_path=pg_catalog,public as $$
  select 1+count(*)::integer from public.partner_network_order_links l
    join public.orders earlier on earlier.id=l.order_id join public.orders current_order on current_order.id=p_order_id
    left join public.partner_network_commissions c on c.order_id=earlier.id
    left join public.partner_network_order_reviews v on v.order_id=earlier.id
    where l.referral_id=p_referral_id and (earlier.ts,earlier.id)<(current_order.ts,current_order.id)
      and (public.partner_network_financial(earlier.id)->>'collected')::numeric>0
      and not coalesce((public.partner_network_financial(earlier.id)->>'cancelled')::boolean,true) and not coalesce(v.cancelled,c.cancelled,false)
      and greatest(0,(public.partner_network_financial(earlier.id)->>'collected')::numeric-coalesce(v.vat_amount,0)-coalesce(v.billed_shipping_amount,0)-coalesce(v.refunded_amount,0))>0
$$;

create or replace function public.partner_network_fingerprint(p_order_id text,p_referral_id uuid) returns text
language sql stable security definer set search_path=pg_catalog,public as $$
  select md5(jsonb_build_array(public.partner_network_financial(p_order_id)->>'fingerprint',r.id,r.partner_id,r.status,r.opportunity_id,l.referral_id,
    public.partner_network_order_index(p_order_id,p_referral_id),v.vat_amount,v.billed_shipping_amount,v.refunded_amount,v.cancelled,v.internal_cost_total,v.minimum_retained_profit)::text)
  from public.partner_network_referrals r left join public.partner_network_order_links l on l.order_id=p_order_id
    left join public.partner_network_order_reviews v on v.order_id=p_order_id where r.id=p_referral_id
$$;

create function public.partner_network_commission_view(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions; v public.partner_network_order_reviews; f jsonb; base numeric; amount_value numeric; cap_value numeric; link_valid boolean; stale_value boolean;
begin
  select * into c from public.partner_network_commissions where id=p_id;
  if not found then return null; end if;
  select * into v from public.partner_network_order_reviews where order_id=c.order_id;
  f:=public.partner_network_financial(c.order_id);
  select exists(select 1 from public.partner_network_referrals r join public.partner_network_order_links l on l.referral_id=r.id and l.order_id=c.order_id
    where r.id=c.referral_id and r.partner_id=c.partner_id and r.status='accepted') into link_valid;
  base:=case when coalesce(v.cancelled,c.cancelled) or coalesce((f->>'cancelled')::boolean,true) or not link_valid then 0
    else greatest(0,(f->>'collected')::numeric-coalesce(v.vat_amount,c.vat_amount)-coalesce(v.billed_shipping_amount,c.billed_shipping_amount)-coalesce(v.refunded_amount,c.refunded_amount)) end;
  -- Adjustments cannot create eligible revenue or exceed that eligible revenue.
  amount_value:=case when base=0 then 0 else greatest(0,least(floor(base),least(floor(base),round(base*c.rate_percent/100,0))+c.adjustment_amount)) end;
  cap_value:=case when v.internal_cost_total is null or v.minimum_retained_profit is null then null else greatest(0,base-v.internal_cost_total-v.minimum_retained_profit) end;
  stale_value:=c.fingerprint is distinct from public.partner_network_fingerprint(c.order_id,c.referral_id);
  return to_jsonb(c)||jsonb_build_object('current_collected',(f->>'collected')::numeric,'current_eligible_base',base,'current_amount',amount_value,
    'current_order_index',public.partner_network_order_index(c.order_id,c.referral_id),
    'collection_complete',coalesce((f->>'collection_complete')::boolean,false),
    'current_vat_amount',v.vat_amount,'current_billed_shipping_amount',v.billed_shipping_amount,'current_refunded_amount',v.refunded_amount,'current_cancelled',v.cancelled,
    'cost_total',v.internal_cost_total,'minimum_profit',v.minimum_retained_profit,'commission_cap',cap_value,'current_commission_cap',cap_value,
    'stale',stale_value,'overpaid_amount',case when c.status='paid' then greatest(0,coalesce(c.paid_amount,0)-amount_value) else 0 end);
end $$;

create function public.partner_network_reconcile(p_order_id text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.partner_network_order_links; r public.partner_network_referrals; p public.partner_network_partners; c public.partner_network_commissions;
  f jsonb; vat_value numeric; shipping_value numeric; refund_value numeric; rate_value numeric; default_rate numeric; note_value text; reason_value text; cancel_value boolean; base numeric; exists_value boolean;
  cost_value numeric; profit_value numeric; order_index_value integer;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if not public.partner_network_input_keys(p_input,array['vat_amount','billed_shipping_amount','refunded_amount','review_note','rate_percent','adjustment_reason','cancelled','internal_cost_total','minimum_retained_profit'])
    or not(p_input ?& array['vat_amount','billed_shipping_amount','refunded_amount','review_note']) then raise exception 'financial_review_required'; end if;
  vat_value:=(p_input->>'vat_amount')::numeric; shipping_value:=(p_input->>'billed_shipping_amount')::numeric; refund_value:=(p_input->>'refunded_amount')::numeric;
  note_value:=public.partner_network_text(p_input->>'review_note'); reason_value:=public.partner_network_text(p_input->>'adjustment_reason'); cancel_value:=coalesce((p_input->>'cancelled')::boolean,false);
  cost_value:=nullif(p_input->>'internal_cost_total','')::numeric; profit_value:=nullif(p_input->>'minimum_retained_profit','')::numeric;
  if vat_value is null or shipping_value is null or refund_value is null or least(vat_value,shipping_value,refund_value)<0
    or greatest(vat_value,shipping_value,refund_value)>999999999999 or length(note_value) not between 1 and 2000 or length(reason_value)>1000
    or vat_value::text in ('NaN','Infinity','-Infinity') or shipping_value::text in ('NaN','Infinity','-Infinity') or refund_value::text in ('NaN','Infinity','-Infinity') then raise exception 'invalid_financial_review'; end if;
  if (cost_value is not null and (cost_value<0 or cost_value>999999999999 or cost_value::text in ('NaN','Infinity','-Infinity'))) or
    (profit_value is not null and (profit_value<0 or profit_value>999999999999 or profit_value::text in ('NaN','Infinity','-Infinity'))) then raise exception 'invalid_profit_review'; end if;
  perform public.partner_network_sync_order_links();
  perform 1 from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  perform 1 from public.receivables where order_id=p_order_id for update;
  select * into l from public.partner_network_order_links where order_id=p_order_id for update;
  if not found then raise exception 'order_referral_link_required'; end if;
  select * into r from public.partner_network_referrals where id=l.referral_id for update;
  if r.status<>'accepted' then raise exception 'accepted_referral_required'; end if;
  select * into p from public.partner_network_partners where id=r.partner_id;
  select * into c from public.partner_network_commissions where order_id=p_order_id for update; exists_value:=found;
  if exists_value and c.status='paid' and p_input ? 'rate_percent' and (p_input->>'rate_percent')::numeric is distinct from c.rate_percent then raise exception 'paid_commission_immutable'; end if;
  insert into public.partner_network_order_reviews(order_id,vat_amount,billed_shipping_amount,refunded_amount,cancelled,internal_cost_total,minimum_retained_profit,review_note,reviewed_by)
    values(p_order_id,vat_value,shipping_value,refund_value,cancel_value,cost_value,profit_value,note_value,auth.uid())
    on conflict(order_id) do update set vat_amount=excluded.vat_amount,billed_shipping_amount=excluded.billed_shipping_amount,refunded_amount=excluded.refunded_amount,
      cancelled=excluded.cancelled,internal_cost_total=excluded.internal_cost_total,minimum_retained_profit=excluded.minimum_retained_profit,review_note=excluded.review_note,reviewed_by=auth.uid(),updated_at=now();
  if exists_value and c.status='paid' then return public.partner_network_commission_view(c.id); end if;
  order_index_value:=public.partner_network_order_index(p_order_id,r.id);
  default_rate:=case when order_index_value=1 then coalesce(p.first_order_rate_percent,p.default_rate_percent)
    when order_index_value-1<=p.repeat_order_limit then p.repeat_rate_percent else 0 end;
  if not exists_value and p.partner_type='distributor' and not (p_input ? 'rate_percent' and length(reason_value)>=10) then raise exception 'distributor_explicit_terms_required'; end if;
  rate_value:=case when p_input ? 'rate_percent' then (p_input->>'rate_percent')::numeric
    when exists_value and c.order_index=order_index_value then c.rate_percent else default_rate end;
  if rate_value is null then raise exception 'commission_rate_required'; end if;
  if rate_value<0 or rate_value>100 or rate_value::text in ('NaN','Infinity','-Infinity') then raise exception 'invalid_commission_rate'; end if;
  if p_input ? 'rate_percent' and rate_value is distinct from (case when exists_value and c.order_index=order_index_value then c.rate_percent else default_rate end)
    and length(reason_value)<10 then raise exception 'rate_adjustment_reason_required'; end if;
  f:=public.partner_network_financial(p_order_id);
  cancel_value:=cancel_value or (f->>'cancelled')::boolean;
  base:=case when cancel_value then 0 else greatest(0,(f->>'collected')::numeric-vat_value-shipping_value-refund_value) end;
  if exists_value then
    update public.partner_network_commissions set status='review',rate_percent=rate_value,collected_amount=(f->>'collected')::numeric,vat_amount=vat_value,billed_shipping_amount=shipping_value,
      refunded_amount=refund_value,cancelled=cancel_value,eligible_base=base,calculated_amount=least(floor(base),round(base*rate_value/100,0)),
      review_note=note_value,adjustment_amount=0,adjustment_reason=reason_value,order_index=order_index_value,internal_cost_total=cost_value,minimum_retained_profit=profit_value,
      exception_reason='',exception_by=null,fingerprint=public.partner_network_fingerprint(p_order_id,r.id),reviewed_by=auth.uid(),reviewed_at=now(),
      approved_amount=null,approved_by=null,approved_at=null,void_reason='',updated_at=now() where id=c.id returning * into c;
  else
    insert into public.partner_network_commissions(order_id,referral_id,partner_id,rate_percent,collected_amount,vat_amount,billed_shipping_amount,refunded_amount,cancelled,eligible_base,calculated_amount,
      review_note,adjustment_reason,order_index,internal_cost_total,minimum_retained_profit,fingerprint,reviewed_by)
    values(p_order_id,r.id,p.id,rate_value,(f->>'collected')::numeric,vat_value,shipping_value,refund_value,cancel_value,base,least(floor(base),round(base*rate_value/100,0)),note_value,reason_value,order_index_value,cost_value,profit_value,public.partner_network_fingerprint(p_order_id,r.id),auth.uid()) returning * into c;
  end if;
  return public.partner_network_commission_view(c.id);
end $$;

create function public.partner_network_commission_action(p_id uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions; view_value jsonb; reason_value text; amount_value numeric; reference_value text; paid_date timestamptz; exception_value text; cap_value numeric; actor_is_admin boolean;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_action not in ('approve','adjust','pay','void') or not public.partner_network_input_keys(p_input,array['adjustment_amount','reason','amount','reference','paid_at','exception_reason']) then raise exception 'invalid_commission_action'; end if;
  -- Payment writers lock receivables. Hold that same row through checking and approval/payment.
  select * into c from public.partner_network_commissions where id=p_id;
  if not found then raise exception 'commission_not_found'; end if;
  perform 1 from public.orders where id=c.order_id for update;
  perform 1 from public.receivables where order_id=c.order_id for update;
  perform 1 from public.partner_network_referrals where id=c.referral_id for update;
  select * into c from public.partner_network_commissions where id=p_id for update;
  if c.status='paid' then raise exception 'paid_commission_immutable'; end if;
  view_value:=public.partner_network_commission_view(c.id);
  if p_action<>'void' and (view_value->>'stale')::boolean then raise exception 'commission_stale_reconcile_required'; end if;
  reason_value:=public.partner_network_text(p_input->>'reason');
  cap_value:=(view_value->>'current_commission_cap')::numeric;
  exception_value:=public.partner_network_text(p_input->>'exception_reason');
  select exists(select 1 from public.staff_roles where user_id=auth.uid() and role='admin') into actor_is_admin;
  if p_action in ('approve','pay') then
    if cap_value is null then raise exception 'profit_review_required'; end if;
    if (view_value->>'current_amount')::numeric>cap_value then
      if length(c.exception_reason)<10 then
        if not actor_is_admin or length(exception_value) not between 10 and 1000 then raise exception 'profit_guardrail_admin_exception_required'; end if;
        update public.partner_network_commissions set exception_reason=exception_value,exception_by=auth.uid(),updated_at=now() where id=c.id returning * into c;
      end if;
    end if;
  end if;
  if p_action='approve' then
    if c.status not in ('draft','review') then raise exception 'commission_not_in_review'; end if;
    update public.partner_network_commissions set status='approved',approved_amount=(view_value->>'current_amount')::numeric,approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=c.id;
  elsif p_action='adjust' then
    amount_value:=(p_input->>'adjustment_amount')::numeric;
    if amount_value is null or abs(amount_value)>999999999999 or amount_value::text in ('NaN','Infinity','-Infinity') or length(reason_value) not between 1 and 1000 then raise exception 'adjustment_reason_required'; end if;
    if amount_value<>trunc(amount_value) then raise exception 'whole_vnd_adjustment_required'; end if;
    if c.status='void' then raise exception 'commission_void'; end if;
    if (view_value->>'current_eligible_base')::numeric=0 and amount_value<>0 then raise exception 'no_eligible_revenue'; end if;
    if least(floor(c.eligible_base),round(c.eligible_base*c.rate_percent/100,0))+amount_value<0 or least(floor(c.eligible_base),round(c.eligible_base*c.rate_percent/100,0))+amount_value>c.eligible_base then raise exception 'adjustment_outside_eligible_revenue'; end if;
    update public.partner_network_commissions set adjustment_amount=amount_value,adjustment_reason=reason_value,status='review',approved_amount=null,approved_at=null,approved_by=null,exception_reason='',exception_by=null,updated_at=now() where id=c.id;
  elsif p_action='pay' then
    amount_value:=(p_input->>'amount')::numeric; reference_value:=public.partner_network_text(p_input->>'reference'); paid_date:=(p_input->>'paid_at')::timestamptz;
    if c.status<>'approved' then raise exception 'commission_approval_required'; end if;
    if not coalesce((view_value->>'collection_complete')::boolean,false) then raise exception 'customer_payment_incomplete'; end if;
    -- Phase 1 records one full settlement; partial payouts need a separate ledger
    -- before they can be supported without losing the remaining balance.
    if amount_value is null or amount_value<=0 or amount_value::text in ('NaN','Infinity','-Infinity')
      or amount_value is distinct from c.approved_amount or amount_value is distinct from (view_value->>'current_amount')::numeric then raise exception 'invalid_commission_payment'; end if;
    if length(reference_value) not between 1 and 200 or paid_date is null or paid_date>now()+interval '1 day' then raise exception 'payment_reference_date_required'; end if;
    update public.partner_network_commissions set status='paid',paid_amount=amount_value,paid_reference=reference_value,paid_at=paid_date,paid_by=auth.uid(),updated_at=now() where id=c.id;
  else
    if length(reason_value) not between 1 and 1000 then raise exception 'reason_required'; end if;
    update public.partner_network_commissions set status='void',void_reason=reason_value,approved_amount=null,approved_by=null,approved_at=null,updated_at=now() where id=c.id;
  end if;
  return public.partner_network_commission_view(c.id);
end $$;

create function public.partner_network_snapshot() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare p public.partner_network_partners; result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into p from public.partner_network_partners where user_id=auth.uid();
  if not found then return jsonb_build_object('partner',null,'referrals','[]'::jsonb,'commissions','[]'::jsonb); end if;
  select jsonb_build_object('partner',jsonb_build_object('id',p.id,'code',p.code,'status',p.status,'business_name',p.business_name,'contact_name',p.contact_name,'email',p.email,'phone',p.phone,
    'region',p.region,'partner_type',p.partner_type,'notes',p.notes,'rate_percent',p.rate_percent,'default_rate_percent',p.default_rate_percent,'first_order_rate_percent',p.first_order_rate_percent,
    'repeat_rate_percent',p.repeat_rate_percent,'repeat_order_limit',p.repeat_order_limit,'terms',p.terms,'created_at',p.created_at,'approved_at',p.approved_at),
    'referrals',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'business_name',r.business_name,'contact_name',r.contact_name,'contact',r.contact,'location',r.location,
      'product_interest',r.product_interest,'expected_volume_kg',r.expected_volume_kg,'notes',r.notes,'status',r.status,'created_at',r.created_at,
      'pipeline_stage',o.stage,
      'order_count',(select count(*) from public.partner_network_order_links l where l.referral_id=r.id),
      'paid_order_count',(select count(*) from public.partner_network_order_links l join public.receivables recv on recv.order_id=l.order_id
        left join public.partner_network_order_reviews review on review.order_id=l.order_id
        where l.referral_id=r.id and recv.status='paid' and recv.total>0 and not coalesce(review.cancelled,false)
          and (public.partner_network_financial(l.order_id)->>'collected')::numeric>=recv.total),
      'duplicate_review',case when r.status='pending' then 'pending_review' else 'resolved' end) order by r.created_at desc)
      from public.partner_network_referrals r left join public.trade_opportunities o on o.id=r.opportunity_id where r.partner_id=p.id),'[]'::jsonb),
    'commissions',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'order_id',c.order_id,'referral_id',c.referral_id,'status',c.status,'rate_percent',c.rate_percent,
      'eligible_base',(public.partner_network_commission_view(c.id)->>'current_eligible_base')::numeric,
      'eligible_amount',case when (public.partner_network_commission_view(c.id)->>'stale')::boolean or c.status='void' then 0 else (public.partner_network_commission_view(c.id)->>'current_amount')::numeric end,
      'approved_amount',case when (public.partner_network_commission_view(c.id)->>'stale')::boolean then null else c.approved_amount end,
      'paid_amount',c.paid_amount,'paid_at',c.paid_at,'stale',(public.partner_network_commission_view(c.id)->>'stale')::boolean,'created_at',c.created_at)
      order by c.created_at desc) from public.partner_network_commissions c where c.partner_id=p.id),'[]'::jsonb)) into result;
  return result;
end $$;

create function public.partner_network_admin_snapshot() returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  perform public.partner_network_sync_order_links();
  return jsonb_build_object(
    'partners',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.partner_network_partners p),'[]'::jsonb),
    'referrals',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('pipeline_stage',o.stage,'duplicates',public.partner_network_duplicates(r.id)) order by r.created_at desc)
      from public.partner_network_referrals r left join public.trade_opportunities o on o.id=r.opportunity_id),'[]'::jsonb),
    'commissions',coalesce((select jsonb_agg(public.partner_network_commission_view(c.id) order by c.created_at desc) from public.partner_network_commissions c),'[]'::jsonb),
    'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'customer_name',o.customer_name,'contact',o.contact,'type',o.type,'status',o.status,'ts',o.ts,
      'collected',(public.partner_network_financial(o.id)->>'collected')::numeric,'receivable_id',public.partner_network_financial(o.id)->>'receivable_id',
      'receivable_total',(public.partner_network_financial(o.id)->>'receivable_total')::numeric,'referral_id',l.referral_id,'partner_id',r.partner_id) order by o.ts desc)
      from public.orders o left join public.partner_network_order_links l on l.order_id=o.id left join public.partner_network_referrals r on r.id=l.referral_id where o.type='wholesale'),'[]'::jsonb),
    'audit',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from public.partner_network_audit order by id desc limit 100)a),'[]'::jsonb));
end $$;

-- Internal helpers are not callable by partners. Only explicitly approved RPCs are exposed.
revoke all on function public.partner_network_input_keys(jsonb,text[]),public.partner_network_text(text),public.partner_network_contact_valid(text),public.partner_network_audit_change(),
  public.partner_network_duplicates(uuid),public.partner_network_sync_order_links(),public.partner_network_financial(text),public.partner_network_fingerprint(text,uuid),public.partner_network_order_index(text,uuid),public.partner_network_commission_view(uuid) from public,anon,authenticated;
revoke all on function public.partner_network_apply(jsonb),public.partner_network_manage_partner(uuid,text,jsonb),public.partner_network_submit_lead(jsonb),public.partner_network_resolve_lead(uuid,text,jsonb),
  public.partner_network_link_order(uuid,text,text),public.partner_network_reconcile(text,jsonb),public.partner_network_commission_action(uuid,text,jsonb),public.partner_network_snapshot(),public.partner_network_admin_snapshot() from public,anon;
grant execute on function public.partner_network_apply(jsonb),public.partner_network_manage_partner(uuid,text,jsonb),public.partner_network_submit_lead(jsonb),public.partner_network_resolve_lead(uuid,text,jsonb),
  public.partner_network_link_order(uuid,text,text),public.partner_network_reconcile(text,jsonb),public.partner_network_commission_action(uuid,text,jsonb),public.partner_network_snapshot(),public.partner_network_admin_snapshot() to authenticated;
commit;
