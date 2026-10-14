-- Explicit, profit-based partner agreements; legacy revenue agreements and paid records stay intact.
-- Costs are the manager-confirmed ALL costs before commission, not an automatic estimate.
begin;
alter table public.partner_network_partners add column commission_basis text not null default 'revenue' check(commission_basis in ('revenue','profit'));
alter table public.partner_network_partners add column commission_terms_version integer not null default 0 check(commission_terms_version>=0);
alter table public.partner_network_commissions add column commission_basis text not null default 'revenue' check(commission_basis in ('revenue','profit'));
alter table public.partner_network_commissions add column terms_version_snapshot integer not null default 0;
alter table public.partner_network_commissions add column commission_base numeric(14,2) check(commission_base>=0);
alter table public.partner_network_commissions alter column calculated_amount drop not null;
alter table public.partner_network_order_reviews add column commission_basis text not null default 'revenue' check(commission_basis in ('revenue','profit'));
alter table public.partner_network_order_reviews add column terms_version_snapshot integer not null default 0;
update public.partner_network_commissions set commission_base=eligible_base where status<>'paid';

alter function public.partner_network_manage_partner(uuid,text,jsonb) rename to partner_network_manage_partner_revenue_v1;
revoke all on function public.partner_network_manage_partner_revenue_v1(uuid,text,jsonb) from public,anon,authenticated;
create function public.partner_network_manage_partner(p_id uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.partner_network_partners; basis_value text; result jsonb;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  select * into p from public.partner_network_partners where id=p_id for update;
  if not found then raise exception 'partner_not_found'; end if;
  basis_value:=coalesce(p_input->>'commission_basis',p.commission_basis);
  if basis_value not in ('revenue','profit') or (p_input ? 'commission_basis' and jsonb_typeof(p_input->'commission_basis')<>'string') then raise exception 'invalid_commission_basis'; end if;
  if basis_value<>p.commission_basis and p.approved_at is not null and length(public.partner_network_text(p_input->>'reason'))<10 then raise exception 'commission_basis_reason_required'; end if;
  if p_action in ('reject','disable') and basis_value<>p.commission_basis then raise exception 'invalid_partner_action'; end if;
  result:=public.partner_network_manage_partner_revenue_v1(p_id,p_action,p_input-'commission_basis');
  if p_input ? 'commission_basis' and basis_value<>p.commission_basis then
    update public.partner_network_partners set commission_basis=basis_value,commission_terms_version=commission_terms_version+1,updated_at=now() where id=p_id;
  end if;
  select to_jsonb(x) into result from public.partner_network_partners x where id=p_id;
  return result;
end $$;

create or replace function public.partner_network_fingerprint(p_order_id text,p_referral_id uuid) returns text
language sql stable security definer set search_path=pg_catalog,public as $$
  with data as (
    select md5(jsonb_build_array(public.partner_network_financial(p_order_id)->>'fingerprint',r.id,r.partner_id,r.status,r.opportunity_id,l.referral_id,
      public.partner_network_order_index(p_order_id,p_referral_id),v.vat_amount,v.billed_shipping_amount,v.refunded_amount,v.cancelled,v.internal_cost_total,v.minimum_retained_profit)::text) legacy,
      coalesce(v.commission_basis,'revenue') basis,
      case when c.status='paid' then c.terms_version_snapshot else p.commission_terms_version end version
    from public.partner_network_referrals r join public.partner_network_partners p on p.id=r.partner_id
      left join public.partner_network_order_links l on l.order_id=p_order_id
      left join public.partner_network_order_reviews v on v.order_id=p_order_id
      left join public.partner_network_commissions c on c.order_id=p_order_id where r.id=p_referral_id
  ) select case when basis='revenue' and version=0 then legacy else md5(jsonb_build_array(legacy,basis,version)::text) end from data
$$;


create or replace function public.partner_network_commission_view(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions; v public.partner_network_order_reviews; f jsonb; base numeric; amount_value numeric; cap_value numeric; link_valid boolean; stale_value boolean;
  current_index_value integer; entitlement_review_value boolean; commission_base_value numeric; profit_before_value numeric;
begin
  select * into c from public.partner_network_commissions where id=p_id;
  if not found then return null; end if;
  select * into v from public.partner_network_order_reviews where order_id=c.order_id;
  f:=public.partner_network_financial(c.order_id);
  select exists(select 1 from public.partner_network_referrals r join public.partner_network_order_links l on l.referral_id=r.id and l.order_id=c.order_id
    where r.id=c.referral_id and r.partner_id=c.partner_id and r.status='accepted') into link_valid;
  base:=case when coalesce(v.cancelled,c.cancelled) or coalesce((f->>'cancelled')::boolean,true) or not link_valid then 0
    else greatest(0,(f->>'collected')::numeric-coalesce(v.vat_amount,c.vat_amount)-coalesce(v.billed_shipping_amount,c.billed_shipping_amount)-coalesce(v.refunded_amount,c.refunded_amount)) end;
  profit_before_value:=case when v.internal_cost_total is null then null else base-v.internal_cost_total end;
  commission_base_value:=case when c.commission_basis='profit' then case when profit_before_value is null then null else greatest(0,profit_before_value) end else base end;
  amount_value:=case when commission_base_value is null then null when commission_base_value=0 then 0 else greatest(0,least(floor(commission_base_value),round(commission_base_value*c.rate_percent/100,0)+c.adjustment_amount)) end;
  cap_value:=case when v.internal_cost_total is null or v.minimum_retained_profit is null then null else greatest(0,base-v.internal_cost_total-v.minimum_retained_profit) end;
  stale_value:=c.fingerprint is distinct from public.partner_network_fingerprint(c.order_id,c.referral_id);
  current_index_value:=public.partner_network_order_index(c.order_id,c.referral_id);
  -- A late collection or an earlier cancellation can change first/repeat entitlement.
  -- Retain the paid agreement/history; a frozen historical rate cannot establish
  -- the recovery balance for a changed entitlement without manager review.
  entitlement_review_value:=c.status='paid' and current_index_value is distinct from c.order_index;
  return to_jsonb(c)||jsonb_build_object('current_collected',(f->>'collected')::numeric,'current_eligible_base',base,'current_amount',amount_value,
    'current_commission_basis',c.commission_basis,'current_commission_base',commission_base_value,'current_profit_before_commission',profit_before_value,'profit_costs_review_required',c.commission_basis='profit' and v.internal_cost_total is null,
    'current_order_index',current_index_value,'entitlement_review_required',entitlement_review_value,
    'collection_complete',coalesce((f->>'collection_complete')::boolean,false),
    'current_vat_amount',v.vat_amount,'current_billed_shipping_amount',v.billed_shipping_amount,'current_refunded_amount',v.refunded_amount,'current_cancelled',v.cancelled,
    'cost_total',v.internal_cost_total,'minimum_profit',v.minimum_retained_profit,'commission_cap',cap_value,'current_commission_cap',cap_value,
    'stale',stale_value,'overpaid_amount',case when entitlement_review_value or amount_value is null then null when c.status='paid' then greatest(0,coalesce(c.paid_amount,0)-amount_value) else 0 end);
end $$;

create or replace function public.partner_network_reconcile(p_order_id text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.partner_network_order_links; r public.partner_network_referrals; p public.partner_network_partners; c public.partner_network_commissions;
  f jsonb; vat_value numeric; shipping_value numeric; refund_value numeric; rate_value numeric; default_rate numeric; note_value text; reason_value text; cancel_value boolean; base numeric; exists_value boolean;
  cost_value numeric; profit_value numeric; order_index_value integer; basis_value text; calculation_base numeric; version_value integer;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if not public.partner_network_input_keys(p_input,array['vat_amount','billed_shipping_amount','refunded_amount','review_note','rate_percent','adjustment_reason','cancelled','internal_cost_total','minimum_retained_profit','commission_basis'])
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
  select * into p from public.partner_network_partners where id=r.partner_id for update;
  select * into c from public.partner_network_commissions where order_id=p_order_id for update; exists_value:=found;
  basis_value:=coalesce(p_input->>'commission_basis',case when exists_value then c.commission_basis else p.commission_basis end);
  if basis_value not in ('revenue','profit') or (p_input ? 'commission_basis' and jsonb_typeof(p_input->'commission_basis')<>'string') then raise exception 'invalid_commission_basis'; end if;
  if exists_value and c.status='paid' and basis_value<>c.commission_basis then raise exception 'paid_commission_immutable'; end if;
  if exists_value and c.status<>'paid' and (basis_value<>c.commission_basis or c.terms_version_snapshot<>p.commission_terms_version)
    and (not(p_input ? 'commission_basis') or length(reason_value)<10) then raise exception 'commission_basis_reason_required'; end if;
  if not exists_value and basis_value<>p.commission_basis and length(reason_value)<10 then raise exception 'commission_basis_reason_required'; end if;
  version_value:=case when exists_value and c.status='paid' then c.terms_version_snapshot else p.commission_terms_version end;
  if exists_value and c.status='paid' and p_input ? 'rate_percent' and (p_input->>'rate_percent')::numeric is distinct from c.rate_percent then raise exception 'paid_commission_immutable'; end if;
  insert into public.partner_network_order_reviews(order_id,vat_amount,billed_shipping_amount,refunded_amount,cancelled,internal_cost_total,minimum_retained_profit,review_note,reviewed_by,commission_basis,terms_version_snapshot)
    values(p_order_id,vat_value,shipping_value,refund_value,cancel_value,cost_value,profit_value,note_value,auth.uid(),basis_value,version_value)
    on conflict(order_id) do update set vat_amount=excluded.vat_amount,billed_shipping_amount=excluded.billed_shipping_amount,refunded_amount=excluded.refunded_amount,
      cancelled=excluded.cancelled,internal_cost_total=excluded.internal_cost_total,minimum_retained_profit=excluded.minimum_retained_profit,review_note=excluded.review_note,reviewed_by=auth.uid(),commission_basis=basis_value,terms_version_snapshot=version_value,updated_at=now();
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
  calculation_base:=case when basis_value='profit' then case when cost_value is null then null else greatest(0,base-cost_value) end else base end;
  if exists_value then
    update public.partner_network_commissions set status='review',rate_percent=rate_value,collected_amount=(f->>'collected')::numeric,vat_amount=vat_value,billed_shipping_amount=shipping_value,
      refunded_amount=refund_value,cancelled=cancel_value,eligible_base=base,calculated_amount=case when calculation_base is null then null else least(floor(calculation_base),round(calculation_base*rate_value/100,0)) end,commission_basis=basis_value,commission_base=calculation_base,terms_version_snapshot=version_value,
      review_note=note_value,adjustment_amount=0,adjustment_reason=reason_value,order_index=order_index_value,internal_cost_total=cost_value,minimum_retained_profit=profit_value,
      exception_reason='',exception_by=null,fingerprint=public.partner_network_fingerprint(p_order_id,r.id),reviewed_by=auth.uid(),reviewed_at=now(),
      approved_amount=null,approved_by=null,approved_at=null,void_reason='',updated_at=now() where id=c.id returning * into c;
  else
    insert into public.partner_network_commissions(order_id,referral_id,partner_id,rate_percent,collected_amount,vat_amount,billed_shipping_amount,refunded_amount,cancelled,eligible_base,calculated_amount,
      review_note,adjustment_reason,order_index,internal_cost_total,minimum_retained_profit,fingerprint,reviewed_by,commission_basis,commission_base,terms_version_snapshot)
    values(p_order_id,r.id,p.id,rate_value,(f->>'collected')::numeric,vat_value,shipping_value,refund_value,cancel_value,base,case when calculation_base is null then null else least(floor(calculation_base),round(calculation_base*rate_value/100,0)) end,note_value,reason_value,order_index_value,cost_value,profit_value,public.partner_network_fingerprint(p_order_id,r.id),auth.uid(),basis_value,calculation_base,version_value) returning * into c;
  end if;
  return public.partner_network_commission_view(c.id);
end $$;

create or replace function public.partner_network_commission_action(p_id uuid,p_action text,p_input jsonb) returns jsonb
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
  perform 1 from public.partner_network_partners where id=c.partner_id for update;
  select * into c from public.partner_network_commissions where id=p_id for update;
  if c.status='paid' then raise exception 'paid_commission_immutable'; end if;
  view_value:=public.partner_network_commission_view(c.id);
  if p_action<>'void' and (view_value->>'stale')::boolean then raise exception 'commission_stale_reconcile_required'; end if;
  reason_value:=public.partner_network_text(p_input->>'reason');
  cap_value:=(view_value->>'current_commission_cap')::numeric;
  exception_value:=public.partner_network_text(p_input->>'exception_reason');
  select exists(select 1 from public.staff_roles where user_id=auth.uid() and role='admin') into actor_is_admin;
  if p_action<>'void' and view_value->'current_amount'='null'::jsonb then raise exception 'profit_review_required'; end if;
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
    if (view_value->>'current_commission_base')::numeric=0 and amount_value<>0 then raise exception 'no_eligible_revenue'; end if;
    if least(floor(c.commission_base),round(c.commission_base*c.rate_percent/100,0))+amount_value<0 or least(floor(c.commission_base),round(c.commission_base*c.rate_percent/100,0))+amount_value>c.commission_base then raise exception 'adjustment_outside_eligible_revenue'; end if;
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

alter function public.partner_network_snapshot() rename to partner_network_snapshot_revenue_v1;
revoke all on function public.partner_network_snapshot_revenue_v1() from public,anon,authenticated;

-- A separate, deliberate release. Nothing in an internal review/upload is shared
-- merely because the partner owns the referral or sees their commission amount.
create table public.partner_network_cost_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.partner_network_commissions(order_id) on delete restrict,
  partner_id uuid not null references public.partner_network_partners(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null check(length(file_name) between 1 and 160),
  content_type text not null check(content_type in ('application/pdf','image/jpeg','image/png')),
  expected_size bigint not null check(expected_size between 1 and 5242880),
  status text not null default 'pending' check(status in ('pending','ready')),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  ready_at timestamptz
);
create table public.partner_network_cost_statements (
  order_id text primary key references public.partner_network_commissions(order_id) on delete restrict,
  commission_id uuid not null unique references public.partner_network_commissions(id) on delete restrict,
  partner_id uuid not null references public.partner_network_partners(id) on delete restrict,
  published boolean not null default false,
  summary text not null default '' check(length(summary)<=4000),
  snapshot jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  evidence_id uuid references public.partner_network_cost_evidence(id) on delete restrict,
  published_by uuid references auth.users(id) on delete restrict,
  published_at timestamptz,
  withdrawn_by uuid references auth.users(id) on delete restrict,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.partner_network_cost_evidence enable row level security;
alter table public.partner_network_cost_statements enable row level security;
revoke all on public.partner_network_cost_evidence,public.partner_network_cost_statements from public,anon,authenticated;
grant select on public.partner_network_cost_evidence,public.partner_network_cost_statements to authenticated;
grant all on public.partner_network_cost_evidence,public.partner_network_cost_statements to service_role;
create policy partner_cost_evidence_manager_read on public.partner_network_cost_evidence for select to authenticated using(public.is_staff_manager());
create policy partner_cost_statement_manager_read on public.partner_network_cost_statements for select to authenticated using(public.is_staff_manager());
create trigger partner_cost_evidence_audit after insert or update on public.partner_network_cost_evidence for each row execute function public.partner_network_audit_change();
create trigger partner_cost_statement_audit after insert or update on public.partner_network_cost_statements for each row execute function public.partner_network_audit_change();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('partner-cost-statements','partner-cost-statements',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
-- No client storage policy is added: the server brokers only scoped, short-lived
-- signed uploads/downloads after the caller's authenticated RPC authorization.

create function public.partner_network_cost_statement_fingerprint(p_commission_id uuid) returns text
language sql stable security definer set search_path=pg_catalog,public as $$
  select md5(jsonb_build_array(public.partner_network_fingerprint(c.order_id,c.referral_id),c.commission_basis,c.rate_percent,c.adjustment_amount,
    public.partner_network_commission_view(c.id)->'current_commission_base',public.partner_network_commission_view(c.id)->'current_amount')::text)
  from public.partner_network_commissions c where c.id=p_commission_id
$$;

create function public.partner_network_prepare_cost_evidence(p_order_id text,p_file_name text,p_content_type text,p_expected_size bigint) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions; e public.partner_network_cost_evidence; evidence_id_value uuid:=gen_random_uuid(); file_value text;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  select * into c from public.partner_network_commissions where order_id=p_order_id;
  if not found then raise exception 'commission_not_found'; end if;
  file_value:=public.partner_network_text(p_file_name);
  if length(file_value) not between 1 and 160 or file_value ~ '[/\\]' or p_content_type is null or p_content_type not in ('application/pdf','image/jpeg','image/png')
    or p_expected_size is null or p_expected_size not between 1 and 5242880 then raise exception 'invalid_cost_evidence'; end if;
  insert into public.partner_network_cost_evidence(id,order_id,partner_id,storage_path,file_name,content_type,expected_size,uploaded_by)
    values(evidence_id_value,p_order_id,c.partner_id,c.partner_id::text||'/'||evidence_id_value::text,file_value,p_content_type,p_expected_size,auth.uid()) returning * into e;
  return to_jsonb(e);
end $$;

create function public.partner_network_finalize_cost_evidence(p_id uuid,p_actual_size bigint) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare e public.partner_network_cost_evidence; stored_size text; stored_type text;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  select * into e from public.partner_network_cost_evidence where id=p_id for update;
  if not found then raise exception 'cost_evidence_not_found'; end if;
  if p_actual_size is distinct from e.expected_size then raise exception 'cost_evidence_size_mismatch'; end if;
  select metadata->>'size',metadata->>'mimetype' into stored_size,stored_type from storage.objects where bucket_id='partner-cost-statements' and name=e.storage_path;
  if not found or (case when coalesce(stored_size,'') ~ '^[0-9]{1,8}$' then stored_size::bigint else null end) is distinct from e.expected_size or stored_type is distinct from e.content_type then raise exception 'cost_evidence_upload_unverified'; end if;
  update public.partner_network_cost_evidence set status='ready',ready_at=coalesce(ready_at,now()) where id=e.id returning * into e;
  return to_jsonb(e);
end $$;

create function public.partner_network_cost_statement(p_order_id text,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions; e public.partner_network_cost_evidence; v jsonb; s public.partner_network_cost_statements;
  summary_value text; evidence_value uuid; public_snapshot jsonb;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_action not in ('publish','withdraw') or not public.partner_network_input_keys(p_input,array['summary','reason','evidence_id','content_reviewed','expected_snapshot']) then raise exception 'invalid_cost_statement_action'; end if;
  perform 1 from public.orders where id=p_order_id for update;
  perform 1 from public.receivables where order_id=p_order_id for update;
  select * into c from public.partner_network_commissions where order_id=p_order_id for update;
  if not found then raise exception 'commission_not_found'; end if;
  if p_action='withdraw' then
    if length(public.partner_network_text(p_input->>'reason')) not between 1 and 1000 then raise exception 'reason_required'; end if;
    update public.partner_network_cost_statements set published=false,withdrawn_by=auth.uid(),withdrawn_at=now(),updated_at=now() where order_id=p_order_id returning * into s;
    return coalesce(to_jsonb(s),jsonb_build_object('order_id',p_order_id,'published',false));
  end if;
  if p_input->'content_reviewed' is distinct from 'true'::jsonb then raise exception 'cost_statement_content_review_required'; end if;
  if jsonb_typeof(p_input->'summary') is distinct from 'string' then raise exception 'invalid_cost_statement'; end if;
  summary_value:=public.partner_network_text(p_input->>'summary');
  if length(summary_value) not between 1 and 4000 then raise exception 'invalid_cost_statement'; end if;
  v:=public.partner_network_commission_view(c.id);
  if (v->>'stale')::boolean or c.status='void' then raise exception 'commission_stale_reconcile_required'; end if;
  if v->'cost_total'='null'::jsonb or v->'current_amount'='null'::jsonb then raise exception 'profit_review_required'; end if;
  public_snapshot:=jsonb_build_object('order_id',p_order_id,'commission_basis',c.commission_basis,
    'eligible_base',v->'current_eligible_base','internal_cost_total',v->'cost_total','commission_base',v->'current_commission_base',
    'rate_percent',c.rate_percent,'calculated_amount',v->'current_amount');
  if p_input->'expected_snapshot' is distinct from (public_snapshot-'order_id') then raise exception 'cost_statement_preview_changed'; end if;
  evidence_value:=nullif(p_input->>'evidence_id','')::uuid;
  if evidence_value is not null then
    select * into e from public.partner_network_cost_evidence where id=evidence_value for update;
    if not found or e.order_id<>p_order_id or e.partner_id<>c.partner_id or e.status<>'ready' then raise exception 'ready_cost_evidence_required'; end if;
  end if;
  insert into public.partner_network_cost_statements(order_id,commission_id,partner_id,published,summary,snapshot,fingerprint,evidence_id,published_by,published_at)
    values(p_order_id,c.id,c.partner_id,true,summary_value,public_snapshot,public.partner_network_cost_statement_fingerprint(c.id),evidence_value,auth.uid(),now())
    on conflict(order_id) do update set published=true,summary=excluded.summary,snapshot=excluded.snapshot,fingerprint=excluded.fingerprint,evidence_id=excluded.evidence_id,
      published_by=auth.uid(),published_at=now(),withdrawn_by=null,withdrawn_at=null,updated_at=now() returning * into s;
  return to_jsonb(s);
end $$;

create function public.partner_network_cost_statement_view(p_commission_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions; s public.partner_network_cost_statements; e public.partner_network_cost_evidence;
  p public.partner_network_partners; manager_value boolean; stale_value boolean; evidence_value jsonb; draft_value jsonb; preview_value jsonb; current_value jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'verified_email_required'; end if;
  manager_value:=public.is_staff_manager();
  select * into c from public.partner_network_commissions where id=p_commission_id;
  if not found then raise exception 'cost_statement_not_available'; end if;
  select * into p from public.partner_network_partners where id=c.partner_id;
  if not manager_value and (p.user_id<>auth.uid() or p.status<>'approved') then raise exception 'cost_statement_not_available'; end if;
  select * into s from public.partner_network_cost_statements where commission_id=c.id;
  stale_value:=s.fingerprint is distinct from public.partner_network_cost_statement_fingerprint(c.id) or (public.partner_network_commission_view(c.id)->>'stale')::boolean;
  if not manager_value and (s.order_id is null or not s.published or stale_value) then return jsonb_build_object('available',false); end if;
  if s.evidence_id is not null then
    select * into e from public.partner_network_cost_evidence where id=s.evidence_id and status='ready';
    if found then evidence_value:=jsonb_build_object('id',e.id,'file_name',e.file_name,'content_type',e.content_type); end if;
  end if;
  if manager_value then
    current_value:=public.partner_network_commission_view(c.id);
    preview_value:=jsonb_build_object('order_id',c.order_id,'commission_basis',c.commission_basis,
      'eligible_base',current_value->'current_eligible_base','internal_cost_total',current_value->'cost_total','commission_base',current_value->'current_commission_base',
      'rate_percent',c.rate_percent,'calculated_amount',current_value->'current_amount');
    select jsonb_build_object('id',x.id,'file_name',x.file_name,'content_type',x.content_type,'status',x.status,'expected_size',x.expected_size) into draft_value
      from public.partner_network_cost_evidence x where x.order_id=c.order_id order by x.uploaded_at desc,x.id desc limit 1;
  end if;
  return jsonb_build_object('available',true,'order_id',c.order_id,'published',coalesce(s.published,false),'stale',case when s.order_id is null then false else stale_value end,
    'summary',coalesce(s.summary,''),'snapshot',s.snapshot,'published_at',s.published_at,'evidence',evidence_value)
    ||case when manager_value then jsonb_build_object('draft_evidence',draft_value,'preview_snapshot',preview_value) else '{}'::jsonb end;
end $$;

create function public.partner_network_cost_evidence_access(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare e public.partner_network_cost_evidence; c public.partner_network_commissions; access_value jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'verified_email_required'; end if;
  select * into e from public.partner_network_cost_evidence where id=p_id;
  if not found then raise exception 'cost_evidence_not_available'; end if;
  if not public.is_staff_manager() then
    select * into c from public.partner_network_commissions where order_id=e.order_id;
    access_value:=public.partner_network_cost_statement_view(c.id);
    if e.status<>'ready' or access_value->>'available'<>'true' or access_value->'evidence'->>'id' is distinct from e.id::text then raise exception 'cost_evidence_not_available'; end if;
  end if;
  return jsonb_build_object('id',e.id,'order_id',e.order_id,'storage_path',e.storage_path,'file_name',e.file_name,'content_type',e.content_type,'expected_size',e.expected_size,'status',e.status);
end $$;

create function public.partner_network_snapshot() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb; items jsonb; c public.partner_network_commissions; item jsonb; statement_value jsonb; p public.partner_network_partners;
begin
  result:=public.partner_network_snapshot_revenue_v1();
  select * into p from public.partner_network_partners where user_id=auth.uid();
  if not found then return result; end if;
  result:=jsonb_set(result,'{partner}',(result->'partner')||jsonb_build_object('commission_basis',p.commission_basis));
  items:='[]'::jsonb;
  for item in select value from jsonb_array_elements(result->'commissions') loop
    select * into c from public.partner_network_commissions where id=(item->>'id')::uuid and partner_id=p.id;
    statement_value:=null;
    if p.status='approved' then
      statement_value:=public.partner_network_cost_statement_view(c.id);
      if statement_value->>'available'<>'true' then statement_value:=null; end if;
    end if;
    -- The commission amount and its agreed basis are visible; unpublished profit
    -- computation/costs are not. A released statement contains only reviewed keys.
    item:=item||jsonb_build_object('commission_basis',c.commission_basis,'cost_statement',statement_value,
      'commission_base',case when statement_value is not null then statement_value->'snapshot'->'commission_base' when c.commission_basis='revenue' then item->'eligible_base' else 'null'::jsonb end);
    if c.commission_basis='profit' and statement_value is null then item:=jsonb_set(item,'{eligible_base}','null'::jsonb); end if;
    items:=items||jsonb_build_array(item);
  end loop;
  return jsonb_set(result,'{commissions}',items);
end $$;

revoke all on function public.partner_network_cost_statement_fingerprint(uuid) from public,anon,authenticated;
revoke all on function public.partner_network_manage_partner(uuid,text,jsonb),public.partner_network_snapshot(),
  public.partner_network_prepare_cost_evidence(text,text,text,bigint),public.partner_network_finalize_cost_evidence(uuid,bigint),
  public.partner_network_cost_statement(text,text,jsonb),public.partner_network_cost_statement_view(uuid),public.partner_network_cost_evidence_access(uuid) from public,anon;
grant execute on function public.partner_network_manage_partner(uuid,text,jsonb),public.partner_network_snapshot(),
  public.partner_network_prepare_cost_evidence(text,text,text,bigint),public.partner_network_finalize_cost_evidence(uuid,bigint),
  public.partner_network_cost_statement(text,text,jsonb),public.partner_network_cost_statement_view(uuid),public.partner_network_cost_evidence_access(uuid) to authenticated;
commit;

