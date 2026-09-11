-- Separate research prospects from customer/order data. No outreach jobs or triggers.
create table public.discovery_prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 160),
  source_url text not null check (source_url ~ '^https?://'),
  source_key text not null unique,
  region text not null default '',
  evidence text not null default '',
  evidence_kind text not null check (evidence_kind in ('page_review', 'search_snippet')),
  contact text not null default '',
  notes text not null default '',
  status text not null default 'research' check (status in ('research','qualified','not_fit','do_not_contact')),
  observed_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
create index discovery_prospects_status_idx on public.discovery_prospects(status, updated_at desc);
alter table public.discovery_prospects enable row level security;
create policy discovery_manager_read on public.discovery_prospects for select to authenticated using (public.is_staff_manager());
create policy discovery_manager_insert on public.discovery_prospects for insert to authenticated with check (public.is_staff_manager() and created_by = auth.uid() and status = 'research' and version = 1);
revoke all on public.discovery_prospects from anon, authenticated;
grant select, insert on public.discovery_prospects to authenticated;
revoke update, delete on public.discovery_prospects from authenticated, anon;

-- Compare-and-set: a second editor cannot silently overwrite a reviewed record.
create function public.review_discovery_prospect(p_id uuid, p_version integer, p_status text, p_notes text, p_contact text, p_name text, p_region text, p_evidence text, p_page_review boolean)
returns public.discovery_prospects language plpgsql security definer set search_path = public as $$
declare result public.discovery_prospects;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_status not in ('research','qualified','not_fit','do_not_contact') or p_status is null then raise exception 'invalid_status'; end if;
  if length(coalesce(p_notes,'')) > 2000 or length(coalesce(p_contact,'')) > 240 then raise exception 'text_too_long'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 160 or length(coalesce(p_region,'')) > 120 or length(coalesce(p_evidence,'')) > 1500 then raise exception 'invalid_details'; end if;
  update public.discovery_prospects set name = trim(p_name), region = coalesce(p_region,''), evidence = coalesce(p_evidence,''), evidence_kind = case when p_page_review then 'page_review' else 'search_snippet' end, status = p_status, notes = coalesce(p_notes,''), contact = coalesce(p_contact,''), version = version + 1, updated_at = now()
    where id = p_id and version = p_version returning * into result;
  if not found then raise exception 'stale_prospect'; end if;
  return result;
end $$;
revoke all on function public.review_discovery_prospect(uuid,integer,text,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.review_discovery_prospect(uuid,integer,text,text,text,text,text,text,boolean) to authenticated;

create table public.discovery_search_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  query text not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.discovery_search_runs enable row level security;
create policy discovery_runs_read on public.discovery_search_runs for select to authenticated using (public.is_staff_manager());
revoke all on public.discovery_search_runs from anon, authenticated;
grant select on public.discovery_search_runs to authenticated;
revoke insert,update,delete on public.discovery_search_runs from authenticated,anon;

-- All managers share one daily allowance (Vietnam time). Charge attempts, even failures.
create function public.reserve_discovery_search(p_user uuid, p_query text, p_limit integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare run_id uuid;
begin
  if p_limit is null or p_limit < 1 or p_limit > 20 then raise exception 'invalid_limit'; end if;
  if not exists(select 1 from public.staff_roles where user_id = p_user and role in ('admin','manager')) then raise exception 'manager_required'; end if;
  perform pg_advisory_xact_lock(577301);
  if (select count(*) from public.discovery_search_runs where created_at >= (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh')) >= p_limit then
    raise exception 'daily_limit';
  end if;
  insert into public.discovery_search_runs(created_by,query) values(p_user,p_query) returning id into run_id;
  return run_id;
end $$;
revoke all on function public.reserve_discovery_search(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_discovery_search(uuid,text,integer) to service_role;

grant all on public.discovery_prospects, public.discovery_search_runs to service_role;
