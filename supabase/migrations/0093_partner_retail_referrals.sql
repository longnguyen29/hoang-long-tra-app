-- Retail partner sources use the existing CRM and reviewed referral ownership.
-- A browser ref is only a suggestion; explicit named consent is required per order.
begin;
alter table public.partner_network_referrals add column channel text not null default 'b2b' check(channel in ('b2b','b2c'));
alter table public.partner_network_order_links drop constraint partner_network_order_links_source_check;
alter table public.partner_network_order_links add constraint partner_network_order_links_source_check check(source in ('manual','quote','account','retail'));

create table public.partner_network_retail_receipts(
 request_id uuid primary key, fingerprint text not null check(fingerprint ~ '^[0-9a-f]{64}$'),
 order_id text not null unique references public.orders(id) on delete restrict,
 total numeric not null, created_at timestamptz not null default clock_timestamp()
);
create table public.partner_network_retail_intakes(
 request_id uuid primary key references public.partner_network_retail_receipts(request_id) on delete restrict,
 order_id text not null unique references public.orders(id) on delete restrict,
 referral_id uuid not null references public.partner_network_referrals(id) on delete restrict,
 opportunity_id text not null references public.trade_opportunities(id) on delete restrict,
 sales_page_id uuid not null references public.partner_network_sales_pages(id) on delete restrict,
 page_revision integer not null check(page_revision>0),
 consent_at timestamptz not null, consent_version text not null default 'retail_partner_v1',
 created_at timestamptz not null default clock_timestamp()
);
alter table public.partner_network_retail_receipts enable row level security;
alter table public.partner_network_retail_intakes enable row level security;
revoke all on public.partner_network_retail_receipts,public.partner_network_retail_intakes from public,anon,authenticated;
grant select on public.partner_network_retail_intakes to authenticated;
create policy partner_retail_intake_manager_read on public.partner_network_retail_intakes for select to authenticated using(public.is_staff_manager());
create trigger partner_retail_intake_audit after insert or update on public.partner_network_retail_intakes for each row execute function public.partner_network_audit_change();

create function public.partner_network_public_retail_partner(p_slug text) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('slug',s.slug,'display_name',s.display_name,'phone',s.phone,'region',s.region,'revision',s.revision)
 from public.partner_network_sales_pages s join public.partner_network_partners p on p.id=s.partner_id
 where s.slug=p_slug and s.published and p.status='approved'
$$;
revoke all on function public.partner_network_public_retail_partner(text) from public;
grant execute on function public.partner_network_public_retail_partner(text) to anon,authenticated;

-- API checks durable receipts before catalogue/stock validation on a retry. A
-- lost HTTP response therefore cannot turn into a second order or stock debit.
create function public.partner_network_retail_receipt(p_request_id uuid,p_fingerprint text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_retail_receipts;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
 if p_request_id is null or p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid_checkout'; end if;
 perform pg_advisory_xact_lock(hashtextextended('partner-retail-request:'||p_request_id::text,0));
 select * into r from public.partner_network_retail_receipts where request_id=p_request_id;
 if not found then return null; end if;
 if r.fingerprint<>p_fingerprint then raise exception 'checkout_retry_conflict'; end if;
 return jsonb_build_object('orderId',r.order_id,'total',r.total,'isNew',false);
end $$;
revoke all on function public.partner_network_retail_receipt(uuid,text) from public,anon,authenticated;
grant execute on function public.partner_network_retail_receipt(uuid,text) to service_role;

create function public.submit_partner_retail_order(p_request_id uuid,p_fingerprint text,p_input jsonb,p_partner jsonb default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare receipt jsonb; s public.partner_network_sales_pages; p public.partner_network_partners; r public.partner_network_referrals;
 o public.trade_opportunities; result_id text; result_total numeric; key_value text; name_value text; contact_value text; interest_value text; now_value timestamptz;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
 receipt:=public.partner_network_retail_receipt(p_request_id,p_fingerprint);
 if receipt is not null then return receipt; end if;
 if not public.partner_network_input_keys(p_input,array['name','contact','address','tax','note','lines','total_items','total','payment']) then raise exception 'invalid_checkout'; end if;
 if p_partner is not null and p_partner<>'null'::jsonb then
  if not public.partner_network_input_keys(p_partner,array['slug','revision','consent']) or p_partner->'consent' is distinct from 'true'::jsonb
    or jsonb_typeof(p_partner->'slug') is distinct from 'string' or jsonb_typeof(p_partner->'revision') is distinct from 'number'
    or coalesce(p_partner->>'revision','') !~ '^[1-9][0-9]{0,9}$' then raise exception 'partner_consent_required'; end if;
  contact_value:=public.partner_network_text(p_input->>'contact'); key_value:=public.discovery_trade_contact_key(contact_value);
  if length(contact_value)>160 or not public.partner_network_contact_valid(contact_value) then raise exception 'invalid_partner_contact'; end if;
  perform pg_advisory_xact_lock(hashtextextended('prospect-promotion:'||key_value,0));
  select * into p from public.partner_network_partners where id=(select partner_id from public.partner_network_sales_pages where slug=p_partner->>'slug') for share;
  if not found or p.status<>'approved' then raise exception 'retail_partner_unavailable'; end if;
  select * into s from public.partner_network_sales_pages where slug=p_partner->>'slug' and partner_id=p.id for share;
  if not found or not s.published or s.revision is distinct from (p_partner->>'revision')::integer then raise exception 'retail_partner_unavailable'; end if;
 end if;
 select result.id into result_id from public.submit_retail_volume_order(p_input->>'name',p_input->>'contact',p_input->>'address',p_input->>'tax',p_input->>'note',
   p_input->'lines',(p_input->>'total_items')::integer,(p_input->>'total')::numeric,p_input->>'payment') result;
 select (retail_pricing->>'total')::numeric into result_total from public.orders where id=result_id;
 insert into public.partner_network_retail_receipts(request_id,fingerprint,order_id,total) values(p_request_id,p_fingerprint,result_id,result_total);
 if s.id is not null then
  now_value:=clock_timestamp(); name_value:=left(public.partner_network_text(p_input->>'name'),100);
  select * into o from public.trade_opportunities where contact_key=key_value or public.discovery_trade_contact_key(contact)=key_value order by created_at,id limit 1;
  if not found then
   insert into public.trade_opportunities(id,contact_key,business_name,contact,stage,source_type,source_id,monthly_potential_kg,next_action,next_action_at,notes)
    values('opp-retail-'||p_request_id,key_value,left(p_input->>'name',160),contact_value,'lead','partner_retail',p_request_id::text,0,
      'Kiểm tra nguồn khách bán lẻ và chăm sóc đơn hàng',now_value,'Khách bán lẻ gửi đơn qua trang đối tác. Nguồn cần quản trị duyệt; không tự ghi nhận quyền hưởng hoa hồng.') returning * into o;
  end if;
  -- Only an already accepted relationship with this exact partner may receive
  -- this NEW, explicitly consented order. No historic/direct order is searched.
  select * into r from public.partner_network_referrals where partner_id=p.id and status='accepted' and opportunity_id=o.id
    and contact_key=key_value order by created_at,id limit 1;
  if not found then
   select * into r from public.partner_network_referrals where partner_id=p.id and status='pending' and channel='b2c' and contact_key=key_value
     and sales_page_id=s.id order by created_at,id limit 1;
  end if;
  if r.id is null then
   select left(string_agg(coalesce(case when jsonb_typeof(x->'name')='object' then x->'name'->>'vi' else x->>'name' end,x->>'productId'),' · '),500)
    into interest_value from jsonb_array_elements(p_input->'lines')x;
   insert into public.partner_network_referrals(id,partner_id,business_name,contact_name,contact,contact_key,location,product_interest,notes,
      channel,sales_page_id,source_page_revision,partner_consent_at,partner_consent_version,contact_authorized_at,created_at,updated_at)
    values(p_request_id,p.id,left(p_input->>'name',160),name_value,contact_value,key_value,'Khách bán lẻ',coalesce(nullif(interest_value,''),'Trà bán lẻ'),
      'Đơn khách gửi từ danh mục bán lẻ; chỉ các đơn có nguồn được xác nhận mới được tính.',
      'b2c',s.id,s.revision,now_value,'retail_partner_v1',now_value,now_value,now_value) returning * into r;
  end if;
  insert into public.partner_network_retail_intakes(request_id,order_id,referral_id,opportunity_id,sales_page_id,page_revision,consent_at)
   values(p_request_id,result_id,r.id,o.id,s.id,s.revision,now_value);
  if r.status='accepted' then
   insert into public.partner_network_order_links(order_id,referral_id,source,reason,created_at)
    values(result_id,r.id,'retail','Khách đồng ý chia sẻ đơn mới cho đối tác đã được duyệt',now_value);
  end if;
 end if;
 return jsonb_build_object('orderId',result_id,'total',result_total,'isNew',true);
end $$;
revoke all on function public.submit_partner_retail_order(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_partner_retail_order(uuid,text,jsonb,jsonb) to service_role;

-- Offline B2C leads use the same authenticated referral form and duplicate review.
-- A retried request cannot silently change its customer channel.
alter function public.partner_network_submit_lead(jsonb) rename to partner_network_submit_lead_before_retail;
revoke all on function public.partner_network_submit_lead_before_retail(jsonb) from public,anon,authenticated;
create function public.partner_network_submit_lead(p_input jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare channel_value text:=coalesce(p_input->>'channel','b2b'); saved public.partner_network_referrals; result uuid; new_value boolean;
begin
 if channel_value not in ('b2b','b2c') or (p_input ? 'channel' and jsonb_typeof(p_input->'channel') is distinct from 'string') then raise exception 'invalid_referral'; end if;
 perform 1 from public.partner_network_partners where user_id=auth.uid() for update;
 perform pg_advisory_xact_lock(hashtextextended('partner-network-request:'||coalesce(p_input->>'request_id',''),0));
 select * into saved from public.partner_network_referrals where id=nullif(p_input->>'request_id','')::uuid;
 new_value:=not found;
 if not new_value and saved.channel is distinct from channel_value then raise exception 'referral_retry_conflict'; end if;
 result:=public.partner_network_submit_lead_before_retail(p_input-'channel');
 if new_value then update public.partner_network_referrals set channel=channel_value where id=result; end if;
 return result;
end $$;
revoke all on function public.partner_network_submit_lead(jsonb) from public,anon;
grant execute on function public.partner_network_submit_lead(jsonb) to authenticated;

-- Source-backed B2C acceptance reuses the same CRM duplicate-resolution rules.
-- Lock orders first, as reconciliation does, before locking a referral row.
alter function public.partner_network_resolve_lead(uuid,text,jsonb) rename to partner_network_resolve_lead_before_retail;
revoke all on function public.partner_network_resolve_lead_before_retail(uuid,text,jsonb) from public,anon,authenticated;
create function public.partner_network_resolve_lead(p_id uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb; r public.partner_network_referrals; source_opp text; order_value text;
begin
 if not public.is_staff_manager() then raise exception 'manager_required'; end if;
 perform 1 from public.orders where id in(select order_id from public.partner_network_retail_intakes where referral_id=p_id) order by id for update;
 select * into r from public.partner_network_referrals where id=p_id;
 if r.channel='b2c' and p_action='accept' then
  select i.opportunity_id into source_opp from public.partner_network_retail_intakes i where i.referral_id=r.id order by i.created_at,i.request_id limit 1;
  if nullif(p_input->>'opportunity_id','') is null and source_opp is not null then p_input:=p_input||jsonb_build_object('opportunity_id',source_opp); end if;
 end if;
 result:=public.partner_network_resolve_lead_before_retail(p_id,p_action,p_input);
 if r.channel='b2c' and p_action='accept' then
  for order_value in select i.order_id from public.partner_network_retail_intakes i join public.orders o on o.id=i.order_id
    where i.referral_id=r.id and o.type='retail' order by i.order_id loop
   if exists(select 1 from public.partner_network_order_links l where l.order_id=order_value and l.referral_id<>r.id) then raise exception 'order_already_attributed'; end if;
   insert into public.partner_network_order_links(order_id,referral_id,source,reason,created_by)
    values(order_value,r.id,'retail','Nguồn đơn bán lẻ đã được quản trị duyệt: '||public.partner_network_text(p_input->>'reason'),auth.uid()) on conflict(order_id) do nothing;
  end loop;
 end if;
 return result;
end $$;
revoke all on function public.partner_network_resolve_lead(uuid,text,jsonb) from public,anon;
grant execute on function public.partner_network_resolve_lead(uuid,text,jsonb) to authenticated;

create or replace function public.partner_network_link_order(p_referral_id uuid,p_order_id text,p_reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_referrals; o public.orders; existing public.partner_network_order_links; result public.partner_network_order_links;
begin
 if not public.is_staff_manager() then raise exception 'manager_required'; end if;
 if length(public.partner_network_text(p_reason)) not between 1 and 1000 then raise exception 'reason_required'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.type not in ('wholesale','retail') then raise exception 'supported_order_required'; end if;
 select * into r from public.partner_network_referrals where id=p_referral_id for update;
 if not found or r.status<>'accepted' then raise exception 'accepted_referral_required'; end if;
 if o.type='retail' and not exists(select 1 from public.partner_network_retail_intakes i where i.order_id=o.id and i.referral_id=r.id and i.consent_at is not null) then
  if r.channel<>'b2c' or length(public.partner_network_text(p_reason))<10 or o.ts<r.created_at
    or public.discovery_trade_contact_key(o.contact) is distinct from r.contact_key then raise exception 'verified_retail_source_required'; end if;
 end if;
 select * into existing from public.partner_network_order_links where order_id=o.id;
 if found then
  if existing.referral_id<>r.id then raise exception 'order_already_attributed'; end if;
  return to_jsonb(existing);
 end if;
 insert into public.partner_network_order_links(order_id,referral_id,source,reason,created_by)
  values(o.id,r.id,case when o.type='retail' and exists(select 1 from public.partner_network_retail_intakes i where i.order_id=o.id and i.referral_id=r.id) then 'retail' else 'manual' end,public.partner_network_text(p_reason),auth.uid()) returning * into result;
 return to_jsonb(result);
end $$;

-- Safe helper for the shared snapshot wrapper. Pending sources stay manager-only;
-- approved partners receive only source-backed accepted order IDs and channel.
create function public.partner_network_retail_snapshot(p_partner_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare manager boolean:=public.is_staff_manager(); result jsonb;
begin
 if not manager and not exists(select 1 from public.partner_network_partners where id=p_partner_id and user_id=auth.uid() and status='approved') then raise exception 'partner_required'; end if;
 select jsonb_build_object('referrals',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'channel',r.channel,'source_order_count',
    case when manager or r.status='accepted' then (select count(*) from public.partner_network_retail_intakes i where i.referral_id=r.id) else null end))
    from public.partner_network_referrals r where manager or r.partner_id=p_partner_id),'[]'::jsonb),
   'intakes',coalesce((select jsonb_agg(jsonb_build_object('order_id',i.order_id,'referral_id',i.referral_id,'opportunity_id',case when manager then i.opportunity_id else null end,'consent_at',i.consent_at))
     from public.partner_network_retail_intakes i join public.partner_network_referrals r on r.id=i.referral_id
     where manager or (r.partner_id=p_partner_id and r.status='accepted')),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.partner_network_retail_snapshot(uuid) from public,anon;
grant execute on function public.partner_network_retail_snapshot(uuid) to authenticated;
-- Collection uses the existing receivable ledger; direct/orphan retail orders never qualify.
create or replace function public.partner_network_financial(p_order_id text) returns jsonb
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
  cancelled:=not(o.type='wholesale' or (o.type='retail' and exists(
    select 1 from public.partner_network_order_links l join public.partner_network_referrals ref on ref.id=l.referral_id
    where l.order_id=o.id and ref.status='accepted' and (
      (l.source='retail' and exists(select 1 from public.partner_network_retail_intakes i where i.order_id=o.id and i.referral_id=ref.id and i.consent_at is not null))
      or (l.source='manual' and l.created_by is not null and length(btrim(l.reason))>=10 and ref.channel='b2c' and o.ts>=ref.created_at
        and public.discovery_trade_contact_key(o.contact)=ref.contact_key))))) or coalesce(to_jsonb(o)->>'status','') in ('cancelled','canceled','void') or nullif(to_jsonb(o)->>'cancelled_at','') is not null;
  return jsonb_build_object('collected',collected,'collection_complete',coalesce(r.id is not null and r.status='paid' and r.total>0 and collected>=r.total,false),
    'cancelled',cancelled,'receivable_id',r.id,'receivable_total',coalesce(r.total,0),
    'fingerprint',md5(jsonb_build_array(o.id,o.type,cancelled,r.id,r.total,r.status,payment_rows)::text));
end $$;

commit;
