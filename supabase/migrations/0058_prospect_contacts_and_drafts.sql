-- Additive research tools only: no delivery provider, jobs, triggers or sent status.
alter table public.discovery_prospects add column contact_attempt_at timestamptz;

create table public.discovery_contacts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.discovery_prospects(id) on delete cascade,
  kind text not null check (kind in ('email','phone','facebook','zalo','whatsapp')),
  value text not null check (length(value) between 1 and 2000),
  normalized text not null check (length(normalized) between 1 and 2000),
  source_url text not null check (source_url ~ '^https?://' and length(source_url) <= 2000),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  evidence text not null default '' check (length(evidence) <= 180),
  observed_at timestamptz not null,
  verification text not null default 'public_source' check (verification = 'public_source'),
  role text not null default 'unknown' check (role = 'unknown'),
  consent text not null default 'unknown' check (consent = 'unknown'),
  unique(prospect_id,kind,normalized)
);
create index discovery_contacts_match_idx on public.discovery_contacts(kind,normalized);
alter table public.discovery_contacts enable row level security;
create policy discovery_contacts_manager_read on public.discovery_contacts for select to authenticated using(public.is_staff_manager());
revoke all on public.discovery_contacts from public,anon,authenticated;
grant select on public.discovery_contacts to authenticated;
grant all on public.discovery_contacts to service_role;

create table public.discovery_outreach_drafts (
  prospect_id uuid primary key references public.discovery_prospects(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  version integer not null default 1,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.discovery_outreach_drafts enable row level security;
create policy discovery_drafts_manager_read on public.discovery_outreach_drafts for select to authenticated using(public.is_staff_manager() and exists(select 1 from public.discovery_prospects p where p.id = prospect_id and p.status = 'qualified' and p.evidence_kind = 'page_review'));
revoke all on public.discovery_outreach_drafts from public,anon,authenticated;
grant select on public.discovery_outreach_drafts to authenticated;
grant all on public.discovery_outreach_drafts to service_role;

create function public.save_discovery_draft(p_id uuid,p_version integer,p_body text)
returns public.discovery_outreach_drafts language plpgsql security definer set search_path=public as $$
declare prospect public.discovery_prospects; result public.discovery_outreach_drafts;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  select * into prospect from public.discovery_prospects where id=p_id for update;
  if not found or prospect.status <> 'qualified' or prospect.evidence_kind <> 'page_review' then raise exception 'prospect_not_qualified'; end if;
  if p_version is null or p_version < 0 or p_body is null or length(trim(p_body)) not between 1 and 4000 then raise exception 'invalid_draft'; end if;
  if p_version = 0 then
    insert into public.discovery_outreach_drafts(prospect_id,body,updated_by) values(p_id,trim(p_body),auth.uid()) on conflict do nothing returning * into result;
  else
    update public.discovery_outreach_drafts set body=trim(p_body), version=version+1, updated_by=auth.uid(), updated_at=now() where prospect_id=p_id and version=p_version returning * into result;
  end if;
  if result.prospect_id is null then raise exception 'stale_draft'; end if;
  return result;
end $$;
revoke all on function public.save_discovery_draft(uuid,integer,text) from public,anon;
grant execute on function public.save_discovery_draft(uuid,integer,text) to authenticated;

-- One attempt per prospect per minute, even on fetch failure. Reserve before networking.
create function public.reserve_discovery_contacts(p_id uuid,p_user uuid)
returns text language plpgsql security definer set search_path=public as $$
declare prospect public.discovery_prospects;
begin
  if not exists(select 1 from public.staff_roles where user_id=p_user and role in ('admin','manager')) then raise exception 'manager_required'; end if;
  select * into prospect from public.discovery_prospects where id=p_id for update;
  if not found then raise exception 'prospect_missing'; end if;
  if prospect.status='do_not_contact' then raise exception 'prospect_suppressed'; end if;
  if prospect.contact_attempt_at > now()-interval '1 minute' then raise exception 'collection_cooldown'; end if;
  update public.discovery_prospects set contact_attempt_at=now() where id=p_id;
  return prospect.source_url;
end $$;
revoke all on function public.reserve_discovery_contacts(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_discovery_contacts(uuid,uuid) to service_role;

-- Merge new observations; a failed/empty scan never erases earlier contacts.
create function public.store_discovery_contacts(p_id uuid,p_contacts jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare prospect public.discovery_prospects; item jsonb;
begin
  select * into prospect from public.discovery_prospects where id=p_id for update;
  if not found or prospect.status='do_not_contact' then raise exception 'prospect_suppressed'; end if;
  if p_contacts is null or jsonb_typeof(p_contacts)<>'array' or jsonb_array_length(p_contacts)>90 then raise exception 'invalid_contacts'; end if;
  for item in select value from jsonb_array_elements(p_contacts) loop
    insert into public.discovery_contacts(prospect_id,kind,value,normalized,source_url,sources,evidence,observed_at)
    values(p_id,item->>'kind',item->>'value',item->>'normalized',item->>'source_url',item->'sources',item->>'evidence',(item->>'observed_at')::timestamptz)
    on conflict(prospect_id,kind,normalized) do update set value=excluded.value, source_url=excluded.source_url, evidence=excluded.evidence, observed_at=excluded.observed_at,
      sources=(select coalesce(jsonb_agg(distinct x),'[]'::jsonb) from jsonb_array_elements(discovery_contacts.sources || excluded.sources) x);
  end loop;
end $$;
revoke all on function public.store_discovery_contacts(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.store_discovery_contacts(uuid,jsonb) to service_role;

create function public.discovery_review_summary()
returns table(prospect_id uuid,contact_count bigint,has_draft boolean)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_staff_manager() then raise exception 'manager_required'; end if;
 return query select p.id, (select count(*) from public.discovery_contacts c where c.prospect_id=p.id),
   p.status='qualified' and p.evidence_kind='page_review' and exists(select 1 from public.discovery_outreach_drafts d where d.prospect_id=p.id)
 from public.discovery_prospects p order by p.updated_at desc limit 500;
end $$;
revoke all on function public.discovery_review_summary() from public,anon;
grant execute on function public.discovery_review_summary() to authenticated;

create function public.discovery_contact_matches(p_id uuid)
returns table(prospect_id uuid,name text,kind text)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_staff_manager() then raise exception 'manager_required'; end if;
 return query select distinct p.id,p.name,c.kind from public.discovery_contacts c
 join public.discovery_contacts mine on mine.prospect_id=p_id and mine.kind=c.kind and mine.normalized=c.normalized
 join public.discovery_prospects p on p.id=c.prospect_id
 where c.prospect_id<>p_id and c.kind in ('phone','email') limit 30;
end $$;
revoke all on function public.discovery_contact_matches(uuid) from public,anon;
grant execute on function public.discovery_contact_matches(uuid) to authenticated;
