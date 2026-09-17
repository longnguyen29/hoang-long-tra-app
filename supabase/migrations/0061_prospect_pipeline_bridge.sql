begin;
alter table public.trade_opportunities add column discovery_prospect_id uuid unique references public.discovery_prospects(id);
-- Only the definer RPC may establish a link. Ordinary staff edits retain it.
create function public.guard_discovery_pipeline_link() returns trigger
language plpgsql set search_path=public as $$
begin
 if TG_OP='DELETE' then
  if old.discovery_prospect_id is not null then raise exception 'linked_opportunity_history_required'; end if;
  return old;
 end if;
 if (TG_OP='INSERT' and new.discovery_prospect_id is not null)
    or (TG_OP='UPDATE' and new.discovery_prospect_id is distinct from old.discovery_prospect_id) then
   if current_user in ('authenticated','anon') then raise exception 'use_prospect_promotion'; end if;
 end if;
 return new;
end $$;
create trigger guard_discovery_pipeline_link before insert or update or delete on public.trade_opportunities
for each row execute function public.guard_discovery_pipeline_link();
-- Match the existing Pipeline email/phone identity without rewriting legacy contacts.
create function public.discovery_trade_contact_key(value text) returns text
language sql immutable set search_path=public as $$
select case when position('@' in value)>0 then lower(trim(value))
 when regexp_replace(value,'[^0-9]','','g') like '84%' then '0'||substr(regexp_replace(value,'[^0-9]','','g'),3)
 else coalesce(nullif(regexp_replace(value,'[^0-9]','','g'),''),lower(trim(value))) end $$;

create function public.promote_discovery_prospect(p_id uuid,p_version integer,p_contact_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare p public.discovery_prospects; c public.discovery_contacts; o public.trade_opportunities; k text; matches integer;
begin
 if not public.is_staff_manager() then raise exception 'manager_required'; end if;
 select * into p from public.discovery_prospects where id=p_id for update;
 if not found or p.status<>'qualified' or p.evidence_kind<>'page_review' then raise exception 'prospect_not_qualified'; end if;
 select * into o from public.trade_opportunities where discovery_prospect_id=p_id;
 if found then
  select * into c from public.discovery_contacts where id=p_contact_id and prospect_id=p_id;
  if not found or c.kind not in ('email','phone') or public.discovery_trade_contact_key(c.value) is distinct from public.discovery_trade_contact_key(o.contact)
   then raise exception 'promotion_contact_conflict'; end if;
  return o.id;
 end if;
 if p_version is distinct from p.version then raise exception 'stale_prospect'; end if;
 select * into c from public.discovery_contacts where id=p_contact_id and prospect_id=p_id;
 if not found or c.kind not in ('email','phone') then raise exception 'select_email_or_phone'; end if;
 k:=public.discovery_trade_contact_key(c.value);
 perform pg_advisory_xact_lock(hashtextextended('prospect-promotion:'||k,0));
 if exists(select 1 from public.discovery_contacts x join public.discovery_prospects other on other.id=x.prospect_id
   where x.prospect_id<>p_id and x.kind in ('email','phone') and public.discovery_trade_contact_key(x.value)=k
     and other.status<>'not_fit') then raise exception 'shared_contact_conflict'; end if;
 select count(*) into matches from public.trade_opportunities where contact_key=k or public.discovery_trade_contact_key(contact)=k;
 if matches>1 then raise exception 'shared_contact_conflict'; end if;
 select * into o from public.trade_opportunities where contact_key=k or public.discovery_trade_contact_key(contact)=k for update;
 if found then
   if o.discovery_prospect_id is not null then raise exception 'shared_contact_conflict'; end if;
   update public.trade_opportunities set discovery_prospect_id=p_id where id=o.id;
 else
   insert into public.trade_opportunities(id,contact_key,business_name,contact,source_type,source_id,next_action,next_action_at,notes,discovery_prospect_id)
   values('opp-prospect-'||p.id,k,p.name,c.value,'prospect',p.id::text,p.next_action,
      case when p.next_action_on is null then null else (p.next_action_on::timestamp at time zone 'Asia/Ho_Chi_Minh') end,
      concat_ws(E'\n',nullif(p.relevance,''),'Nguồn: '||p.source_url),p.id) returning * into o;
 end if;
 update public.discovery_prospects set version=version+1,updated_at=now() where id=p.id;
 insert into public.discovery_activities(id,prospect_id,kind,body) values(gen_random_uuid(),p.id,'note','Đã liên kết Pipeline: '||o.id);
 return o.id;
end $$;
revoke all on function public.promote_discovery_prospect(uuid,integer,uuid) from public,anon;
grant execute on function public.promote_discovery_prospect(uuid,integer,uuid) to authenticated;
commit;
