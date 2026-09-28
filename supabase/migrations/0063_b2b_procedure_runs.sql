-- One durable operating record per wholesale order. All mutations go through
-- authenticated server routes; employees cannot bypass verification via PostgREST.
begin;
create table public.procedure_runs (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique references public.orders(id) on delete restrict,
  template_key text not null check (template_key in ('domestic_b2b','export_b2b')),
  assigned_to uuid references public.staff_profiles(user_id),
  due_at timestamptz,
  loading_at timestamptz,
  delivery_due_at timestamptz,
  next_contact_at timestamptz,
  reorder_action text not null default '',
  next_action text not null default '',
  status text not null default 'active' check (status in ('active','completed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index procedure_runs_assignee_idx on public.procedure_runs(assigned_to,status,due_at);

create table public.procedure_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.procedure_runs(id) on delete restrict,
  stage_key text not null,
  item_key text not null,
  position integer not null,
  title text not null,
  guidance text not null default '',
  required boolean not null default true,
  critical boolean not null default false,
  evidence_required boolean not null default false,
  verification_required boolean not null default false,
  status text not null default 'not_started' check (status in ('not_started','in_progress','blocked','done','verified','not_required')),
  document_state text check (document_state in ('missing','draft','ready','checked','verified','issue_found','not_required')),
  assigned_to uuid references public.staff_profiles(user_id),
  escalation_contact text not null default '',
  secondary_contact text not null default '',
  worker_notes text not null default '',
  completed_by uuid references auth.users(id),
  completed_at timestamptz,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(run_id,item_key)
);
create index procedure_items_run_idx on public.procedure_items(run_id,position);
create index procedure_items_assignee_idx on public.procedure_items(assigned_to,status);

create table public.procedure_blockers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.procedure_runs(id) on delete restrict,
  item_id uuid not null references public.procedure_items(id) on delete restrict,
  status text not null default 'open' check (status in ('open','resolved','verified','overridden')),
  stop_work boolean not null default false,
  problem text not null,
  corrective_action text not null default '',
  responsible_to uuid references public.staff_profiles(user_id),
  escalation_contact text not null default '',
  secondary_contact text not null default '',
  due_at timestamptz,
  estimated_budget numeric(14,2) check (estimated_budget >= 0),
  approved_budget numeric(14,2) check (approved_budget >= 0),
  actual_spend numeric(14,2) check (actual_spend >= 0),
  approved_by uuid references auth.users(id),
  resolution_notes text not null default '',
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  override_reason text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index procedure_blockers_run_idx on public.procedure_blockers(run_id,status);

create table public.procedure_evidence (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.procedure_runs(id) on delete restrict,
  item_id uuid not null references public.procedure_items(id) on delete restrict,
  blocker_id uuid references public.procedure_blockers(id) on delete restrict,
  bucket text not null default 'procedure-evidence',
  storage_path text not null unique,
  archive_path text not null,
  file_name text not null,
  content_type text not null,
  expected_size bigint not null check (expected_size between 1 and 10485760),
  status text not null default 'pending' check (status in ('pending','ready')),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index procedure_evidence_run_idx on public.procedure_evidence(run_id,created_at);

create table public.procedure_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.procedure_runs(id) on delete restrict,
  item_id uuid references public.procedure_items(id) on delete restrict,
  blocker_id uuid references public.procedure_blockers(id) on delete restrict,
  actor_id uuid references auth.users(id),
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index procedure_events_run_idx on public.procedure_events(run_id,created_at desc);

alter table public.procedure_runs enable row level security;
alter table public.procedure_items enable row level security;
alter table public.procedure_blockers enable row level security;
alter table public.procedure_evidence enable row level security;
alter table public.procedure_events enable row level security;
-- No client mutation policies: the server validates worker assignment, proof and STOP.
-- Managers may read directly; assigned workers read through the server route,
-- which checks the run/item assignment before using the service role.
create policy "procedure runs manager read" on public.procedure_runs for select to authenticated using (public.is_staff());
create policy "procedure items manager read" on public.procedure_items for select to authenticated using (public.is_staff());
create policy "procedure blockers manager read" on public.procedure_blockers for select to authenticated using (public.is_staff());
create policy "procedure evidence manager read" on public.procedure_evidence for select to authenticated using (public.is_staff());
create policy "procedure history manager read" on public.procedure_events for select to authenticated using (public.is_staff());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('procedure-evidence','procedure-evidence',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict(id) do nothing;

-- Existing Order Flow must not mark a procedure shipment as shipped/completed
-- while a STOP is open or critical pre-dispatch proof/checks are missing.
create function public.guard_procedure_order_stage() returns trigger language plpgsql set search_path=public as $$
declare v_run uuid;
begin
  if (new.stage not in ('shipping','completed') and new.status not in ('shipped','completed'))
    or (new.stage is not distinct from old.stage and new.status is not distinct from old.status) then return new; end if;
  select id into v_run from public.procedure_runs where order_id=new.id;
  if v_run is null then return new; end if;
  if not exists(select 1 from public.procedure_items where run_id=v_run)
    or exists(select 1 from public.procedure_blockers where run_id=v_run and stop_work and status in ('open','resolved'))
    or exists(select 1 from public.procedure_items where run_id=v_run and required and critical
      and stage_key in ('order_confirmation','stock_production','logistics','documents_checked','vehicle_inspection','loading_dispatch')
      and status not in ('verified','not_required')) then
    raise exception 'procedure_stop_or_preflight_incomplete';
  end if;
  return new;
end $$;
create trigger guard_procedure_order_stage before update of stage,status on public.orders
for each row execute function public.guard_procedure_order_stage();
commit;
