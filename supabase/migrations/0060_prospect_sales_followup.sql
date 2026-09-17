-- Lean sales follow-up. Additive; no automatic communication or inferred priority.
begin;
alter table public.discovery_prospects
  add column priority text check (priority in ('A','B','C')),
  add column relevance text not null default '' check (length(relevance)<=1500),
  add column next_action text not null default '' check (length(next_action)<=300),
  add column next_action_on date;
create index discovery_prospects_due_idx on public.discovery_prospects(next_action_on,priority)
  where status not in ('do_not_contact','not_fit');

create table public.discovery_activities (
  id uuid primary key,
  prospect_id uuid not null references public.discovery_prospects(id),
  kind text not null check (kind in ('note','call','email','message','meeting','sample','feedback')),
  body text not null check (length(trim(body)) between 1 and 4000),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id)
);
create index discovery_activities_prospect_idx on public.discovery_activities(prospect_id,occurred_at desc);
alter table public.discovery_activities enable row level security;
create policy discovery_activity_manager_read on public.discovery_activities for select to authenticated using(public.is_staff_manager());
revoke all on public.discovery_activities from public,anon,authenticated;
grant select on public.discovery_activities to authenticated;
grant all on public.discovery_activities to service_role;

create function public.update_discovery_followup(p_id uuid,p_version integer,p_priority text,p_relevance text,p_next_action text,p_next_action_on date)
returns public.discovery_prospects language plpgsql security definer set search_path=public as $$
declare result public.discovery_prospects;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_next_action_on is not null and nullif(trim(p_next_action),'') is null then raise exception 'action_required'; end if;
  update public.discovery_prospects set priority=p_priority,relevance=trim(p_relevance),
    next_action=trim(p_next_action),next_action_on=p_next_action_on,version=version+1,updated_at=now()
    where id=p_id and version=p_version returning * into result;
  if not found then raise exception 'stale_prospect'; end if;
  return result;
end $$;
revoke all on function public.update_discovery_followup(uuid,integer,text,text,text,date) from public,anon;
grant execute on function public.update_discovery_followup(uuid,integer,text,text,text,date) to authenticated;

-- A client-generated operation ID makes retries safe without overwriting history.
create function public.append_discovery_activity(p_id uuid,p_activity_id uuid,p_kind text,p_body text,p_occurred_at timestamptz)
returns public.discovery_activities language plpgsql security definer set search_path=public as $$
declare result public.discovery_activities;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_occurred_at is null or p_occurred_at>now()+interval '5 minutes' then raise exception 'invalid_activity_time'; end if;
  insert into public.discovery_activities(id,prospect_id,kind,body,occurred_at)
    values(p_activity_id,p_id,p_kind,trim(p_body),p_occurred_at)
    on conflict(id) do nothing returning * into result;
  if result.id is null then
    select * into result from public.discovery_activities where id=p_activity_id;
    if result.prospect_id<>p_id or result.created_by<>auth.uid() or result.kind<>p_kind or result.body<>trim(p_body) or result.occurred_at<>p_occurred_at then raise exception 'activity_conflict'; end if;
  end if;
  return result;
end $$;
revoke all on function public.append_discovery_activity(uuid,uuid,text,text,timestamptz) from public,anon;
grant execute on function public.append_discovery_activity(uuid,uuid,text,text,timestamptz) to authenticated;
create function public.add_discovery_manual_contact(p_id uuid,p_kind text,p_value text,p_source_url text,p_evidence text)
returns public.discovery_contacts language plpgsql security definer set search_path=public as $$
declare p public.discovery_prospects; result public.discovery_contacts; v text:=trim(p_value); n text;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  select * into p from public.discovery_prospects where id=p_id for update;
  if not found or p.status='do_not_contact' then raise exception 'prospect_suppressed'; end if;
  if p_source_url is null or length(p_source_url)>2000 or p_source_url !~ '^https?://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}(/|$)' or p_source_url ~ '[[:space:]@]' or p_source_url ~* '^https?://[^/]*\.local(/|$)' then raise exception 'invalid_public_source'; end if;
  if nullif(trim(p_evidence),'') is null or length(p_evidence)>180 or v is null or length(v) not between 1 and 2000 or v ~ '[[:cntrl:]]' then raise exception 'invalid_contact'; end if;
  if p_kind='email' and v ~* '^[A-Z0-9.!%+_=-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then n:=lower(v);
  elsif p_kind='phone' and v ~ '^\+?[0-9 ().-]+$' then
    n:=regexp_replace(v,'[^0-9]','','g');
    if n like '0084%' then n:=substr(n,3); end if;
    if n like '84%' then n:='0'||substr(n,3); end if;
    if n ~ '^(0[35789][0-9]{8}|02[0-9]{9})$' then n:='+84'||substr(n,2);
    elsif n ~ '^1[89]00[0-9]{4,6}$' then null;
    elsif v ~ '^\+[1-9][0-9]{7,14}$' then n:=v;
    else raise exception 'invalid_phone'; end if;
    v:=n;
  else raise exception 'invalid_contact_kind'; end if;
  insert into public.discovery_contacts(prospect_id,kind,value,normalized,source_url,sources,evidence,observed_at)
    values(p_id,p_kind,v,n,p_source_url,jsonb_build_array(p_source_url),trim(p_evidence),now())
    on conflict(prospect_id,kind,normalized) do update set
      sources=(select jsonb_agg(distinct x) from jsonb_array_elements(discovery_contacts.sources||excluded.sources)x)
    returning * into result;
  return result;
end $$;
revoke all on function public.add_discovery_manual_contact(uuid,text,text,text,text) from public,anon;
grant execute on function public.add_discovery_manual_contact(uuid,text,text,text,text) to authenticated;
commit;
