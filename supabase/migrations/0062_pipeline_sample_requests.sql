begin;
alter table public.sample_requests add column opportunity_id text references public.trade_opportunities(id);
create unique index sample_requests_one_open_opportunity on public.sample_requests(opportunity_id)
 where opportunity_id is not null and status in ('new','sent');

-- A small staff-visible status check reveals no prospect research or contact data.
create function public.pipeline_prospect_suppressed(p_opportunity_id text) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_staff() then raise exception 'staff_required'; end if;
 return exists(select 1 from public.trade_opportunities o join public.discovery_prospects p on p.id=o.discovery_prospect_id
  where o.id=p_opportunity_id and p.status='do_not_contact');
end $$;
revoke all on function public.pipeline_prospect_suppressed(text) from public,anon;
grant execute on function public.pipeline_prospect_suppressed(text) to authenticated;

create function public.create_pipeline_sample(p_opportunity_id text,p_request_id uuid,p_contact_name text,p_phone text,p_address text,p_pack text,p_note text)
returns text language plpgsql security definer set search_path=public as $$
declare o public.trade_opportunities; s public.sample_requests; prospect_status text;
begin
 if not public.is_staff() then raise exception 'staff_required'; end if;
 -- Same lock order as promotion: prospect before opportunity.
 select p.status into prospect_status from public.discovery_prospects p
 join public.trade_opportunities x on x.discovery_prospect_id=p.id where x.id=p_opportunity_id for update of p;
 if prospect_status='do_not_contact' then raise exception 'prospect_suppressed'; end if;
 select * into o from public.trade_opportunities where id=p_opportunity_id for update;
 if not found then raise exception 'opportunity_not_found'; end if;
 if p_request_id is null or coalesce(length(trim(p_contact_name)),0) not between 1 and 150
  or coalesce(length(trim(p_address)),0) not between 5 and 1000
  or coalesce(length(trim(p_pack)),0) not between 1 and 150
  or coalesce(length(p_note),0)>4000
  or coalesce(p_phone,'') !~ '^\+?[0-9 ()-]{8,25}$'
  or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 8 and 15 then raise exception 'invalid_sample_details'; end if;
 select * into s from public.sample_requests where id='pipeline-sample-'||p_request_id;
 if found then
  if s.opportunity_id is distinct from p_opportunity_id or s.contact_name<>trim(p_contact_name)
   or s.phone<>trim(p_phone) or s.address<>trim(p_address) or s.pack<>trim(p_pack) or s.note<>coalesce(trim(p_note),'')
   then raise exception 'sample_retry_conflict'; end if;
  return s.id;
 end if;
 if exists(select 1 from public.sample_requests where opportunity_id=o.id and status in ('new','sent')) then raise exception 'sample_already_open'; end if;
 insert into public.sample_requests(id,store_name,contact_name,phone,address,pack,note,opportunity_id)
 values('pipeline-sample-'||p_request_id,o.business_name,trim(p_contact_name),trim(p_phone),trim(p_address),trim(p_pack),coalesce(trim(p_note),''),o.id) returning * into s;
 if o.stage in ('lead','sample_requested') then
  update public.trade_opportunities set stage='sample_requested',next_action='Xác nhận và chuẩn bị bộ mẫu',updated_at=now() where id=o.id;
 end if;
 if o.discovery_prospect_id is not null then
  insert into public.discovery_activities(id,prospect_id,kind,body) values(gen_random_uuid(),o.discovery_prospect_id,'sample','Đã tạo yêu cầu chuẩn bị mẫu: '||s.id||'. Chưa gửi hàng.');
 end if;
 return s.id;
end $$;
revoke all on function public.create_pipeline_sample(text,uuid,text,text,text,text,text) from public,anon;
grant execute on function public.create_pipeline_sample(text,uuid,text,text,text,text,text) to authenticated;

-- Protect the existing staff sample editor as well as the new RPC.
create function public.guard_pipeline_sample() returns trigger
language plpgsql security definer set search_path=public as $$
declare prospect_status text;
begin
 if TG_OP='DELETE' then
  if old.opportunity_id is not null then raise exception 'linked_sample_history_required'; end if;
  return old;
 end if;
 if TG_OP='UPDATE' and old.opportunity_id is not null and
  (new.contact_name,new.phone,new.address,new.pack,new.store_name,new.note) is distinct from
  (old.contact_name,old.phone,old.address,old.pack,old.store_name,old.note) then raise exception 'linked_sample_details_immutable'; end if;
 if TG_OP='UPDATE' and new.opportunity_id is distinct from old.opportunity_id then raise exception 'sample_link_immutable'; end if;
 if new.opportunity_id is not null and (TG_OP='INSERT' or (new.status='sent' and old.status is distinct from 'sent')) then
  select p.status into prospect_status from public.discovery_prospects p join public.trade_opportunities o on o.discovery_prospect_id=p.id
   where o.id=new.opportunity_id for update of p;
  if prospect_status='do_not_contact' then raise exception 'prospect_suppressed'; end if;
 end if;
 return new;
end $$;
create trigger guard_pipeline_sample before insert or update or delete on public.sample_requests
for each row execute function public.guard_pipeline_sample();

create function public.guard_suppressed_trade_preparation() returns trigger
language plpgsql security definer set search_path=public as $$
declare prospect_status text; opportunity_key text;
begin
 if TG_TABLE_NAME='trade_quotes' then
  if TG_OP='UPDATE' and not (new.status='sent' and old.status is distinct from 'sent') then return new; end if;
  opportunity_key:=new.opportunity_id;
 else
  if new.stage is not distinct from old.stage or new.stage not in ('sample_requested','sample_sent','feedback','quoted') then return new; end if;
  opportunity_key:=new.id;
 end if;
 select p.status into prospect_status from public.discovery_prospects p join public.trade_opportunities o on o.discovery_prospect_id=p.id
 where o.id=opportunity_key for update of p;
 if prospect_status='do_not_contact' then raise exception 'prospect_suppressed'; end if;
 return new;
end $$;
create trigger guard_suppressed_quote before insert or update on public.trade_quotes
for each row execute function public.guard_suppressed_trade_preparation();
create trigger guard_suppressed_stage before update on public.trade_opportunities
for each row execute function public.guard_suppressed_trade_preparation();
-- Existing price/recipe entry points must respect the same new-preparation boundary.
create function public.guard_suppressed_related_preparation() returns trigger
language plpgsql security definer set search_path=public as $$
declare prospect_status text;
begin
 if new.opportunity_id is null then return new; end if;
 select p.status into prospect_status from public.discovery_prospects p join public.trade_opportunities o on o.discovery_prospect_id=p.id
 where o.id=new.opportunity_id for update of p;
 if prospect_status='do_not_contact' then raise exception 'prospect_suppressed'; end if;
 return new;
end $$;
create trigger guard_suppressed_price_preparation before insert on public.partner_price_agreements
for each row execute function public.guard_suppressed_related_preparation();
create trigger guard_suppressed_recipe_preparation before insert on public.recipes
for each row execute function public.guard_suppressed_related_preparation();
commit;
