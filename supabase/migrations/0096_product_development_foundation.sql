-- Phase1 internal development only. Never creates sellable SKUs or changes stock.
-- 0095 belongs to a separate pending reward feature and is not a dependency.
begin;
alter table public.vendors add column supplier_only boolean not null default false;
-- A manufacturing lead cannot leak through the public grower projection even if
-- an older vendor screen accidentally enables its active flag.
create or replace function public.list_public_vendors() returns table(id text,name text,region text,photo text,crops text,story_vi text,story_en text,sort_order integer)
language sql stable security definer set search_path=pg_catalog,public as $$
 select v.id,v.name,v.region,v.photo,v.crops,v.story_vi,v.story_en,v.sort_order from public.vendors v
 where v.active and not v.supplier_only order by v.sort_order,v.name
$$;

create table public.product_development_projects(
 id uuid primary key default gen_random_uuid(),code text not null unique check(code ~ '^[A-Z0-9][A-Z0-9_.:-]{1,99}$'),
 name text not null check(length(btrim(name)) between 1 and 240),
 category_code text not null check(category_code in ('A','B','C','D','E','F','G','H','K','M','N')),
 division_id text not null check(division_id in ('everyday','professional','heritage','manufacturing_lab')),
 kind text not null default 'concept' check(kind in ('catalog_audit','format','concept','material_research','category_research','formulation','service')),
 lifecycle_stage text not null default 'idea' check(lifecycle_stage in ('idea','research','supplier_sourcing','sampling','testing','costing','approved_for_production','production','ready_for_sale','live','on_hold','rejected','discontinued')),
 public_availability text not null default 'hidden' check(public_availability in ('available','research','hidden')),
 priority text not null default 'medium' check(priority in ('high','medium','low','later')),
 description text not null default '' check(length(description)<=12000),specification text not null default '' check(length(specification)<=12000),
 format_spec text not null default '' check(length(format_spec)<=2000),process_route text not null default 'undecided' check(process_route in ('undecided','internal','outsourced','hybrid')),
 owner_id uuid references auth.users(id) on delete restrict,next_task text not null default '' check(length(next_task)<=3000),
 due_date date,blocker text not null default '' check(length(blocker)<=3000),workstream_code text not null default '',
 budget_estimate_min numeric(16,2) check(budget_estimate_min between 0 and 999999999999),
 budget_estimate_max numeric(16,2) check(budget_estimate_max between 0 and 999999999999),
 budget_source text check(budget_source in ('internal_estimate','scenario_assumption')),
 budget_note text not null default '' check(length(budget_note)<=3000),
 version integer not null default 1,created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(budget_estimate_min is null or budget_estimate_max is null or budget_estimate_min<=budget_estimate_max),
 check((budget_estimate_min is null and budget_estimate_max is null) or (budget_source is not null and length(btrim(budget_note))>=10)),
 -- Fail closed until actual evidence gates and public research intake ship.
 constraint development_phase1_no_launch check(public_availability='hidden' and lifecycle_stage not in ('approved_for_production','production','ready_for_sale','live'))
);
create table public.supplier_profiles(
 vendor_id text primary key references public.vendors(id) on delete restrict,
 website text,contact_person text not null default '',email text not null default '',
 status text not null default 'lead' check(status in ('lead','contacted','responded','sample_requested','sample_received','quoted','qualified','approved','rejected','inactive')),
 evidence_status text not null default 'unverified' check(evidence_status in ('unverified','brief_unverified')),
 accepts_customer_tea boolean,service_capabilities text[] not null default '{}',supported_formats text[] not null default '{}',
 minimum_order_quantity numeric,estimated_unit_cost numeric,sample_cost numeric,lead_time integer,
 notes text not null default '' check(length(notes)<=12000),next_task text not null default '' check(length(next_task)<=3000),
 last_contact_on date,next_followup_on date,version integer not null default 1,
 created_by uuid references auth.users(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint supplier_phase1_no_unverified_terms check(status in ('lead','contacted','responded','inactive','rejected') and minimum_order_quantity is null and estimated_unit_cost is null and sample_cost is null and lead_time is null),
 check(website is null or (website ~ '^https://[^[:space:]<>]+$' and length(website)<=2048)),
 check(length(contact_person)<=160 and length(email)<=240 and cardinality(service_capabilities)<=30 and cardinality(supported_formats)<=30)
);
create table public.product_development_catalog_links(
 project_id uuid references public.product_development_projects(id) on delete restrict,
 product_id text references public.catalog_products(id) on delete restrict,note text not null default '' check(length(note)<=3000),
 created_at timestamptz not null default now(),primary key(project_id,product_id)
);
create table public.product_development_suppliers(
 project_id uuid references public.product_development_projects(id) on delete restrict,
 vendor_id text references public.supplier_profiles(vendor_id) on delete restrict,note text not null default '' check(length(note)<=3000),
 created_at timestamptz not null default now(),primary key(project_id,vendor_id)
);
create table public.product_development_resources(
 project_id uuid references public.product_development_projects(id) on delete restrict,
 resource_type text not null check(resource_type in ('batch','material')),resource_id text not null,
 note text not null default '' check(length(note)<=3000),created_at timestamptz not null default now(),primary key(project_id,resource_type,resource_id)
);
create table public.product_development_events(
 id bigint generated always as identity primary key,project_id uuid references public.product_development_projects(id) on delete restrict,
 vendor_id text references public.vendors(id) on delete restrict,action text not null,note text not null default '',
 before_data jsonb,after_data jsonb,actor_id uuid references auth.users(id) on delete restrict,created_at timestamptz not null default now()
);
create index development_stage_idx on public.product_development_projects(lifecycle_stage,priority,due_date);
create index development_event_project_idx on public.product_development_events(project_id,created_at desc);
create index development_supplier_followup_idx on public.supplier_profiles(next_followup_on);

do $$declare n text;begin
 foreach n in array array['product_development_projects','supplier_profiles','product_development_catalog_links','product_development_suppliers','product_development_resources','product_development_events'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated',n);
  execute format('grant select on public.%I to authenticated',n);
  execute format('create policy development_manager_read on public.%I for select to authenticated using(public.is_staff_manager())',n);
 end loop;
end $$;

create function public.product_development_audit() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 insert into public.product_development_events(project_id,vendor_id,action,note,before_data,after_data,actor_id)
 values(case when TG_TABLE_NAME='product_development_projects' then (to_jsonb(new)->>'id')::uuid else (to_jsonb(new)->>'project_id')::uuid end,
 case when TG_TABLE_NAME in ('supplier_profiles','product_development_suppliers') then to_jsonb(new)->>'vendor_id' else null end,
 TG_TABLE_NAME||':'||lower(TG_OP),coalesce(current_setting('hl.development_reason',true),''),
 case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new),auth.uid());return new;
end $$;
do $$declare n text;begin
 foreach n in array array['product_development_projects','supplier_profiles','product_development_catalog_links','product_development_suppliers','product_development_resources'] loop
 execute format('create trigger development_audit after insert or update on public.%I for each row execute function public.product_development_audit()',n);
 end loop;
end $$;
create function public.product_development_fields(p_input jsonb,p_allowed text[],p_numbers text[] default '{}',p_arrays text[] default '{}',p_booleans text[] default '{}') returns void
language plpgsql set search_path=pg_catalog as $$
declare k text;v jsonb;t text;begin
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>60000 then raise exception 'invalid_development_input';end if;
 for k,v in select key,value from jsonb_each(p_input) loop
  if not(k=any(p_allowed)) then raise exception 'invalid_development_field';end if;t:=jsonb_typeof(v);
  if t='null' then continue;end if;
  if k=any(p_numbers) then if t<>'number' or v::text::numeric<0 or v::text::numeric>999999999999 then raise exception 'invalid_development_number';end if;
  elsif k=any(p_booleans) then if t<>'boolean' then raise exception 'invalid_development_boolean';end if;
  elsif k=any(p_arrays) then
   if t<>'array' or jsonb_array_length(v)>30 or exists(select 1 from jsonb_array_elements(v)x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>500) then raise exception 'invalid_development_list';end if;
  elsif t<>'string' then raise exception 'invalid_development_text';end if;
 end loop;
end $$;
create function public.product_development_save_project(p_id uuid,p_expected_version integer,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.product_development_projects;f public.product_development_projects;why text;
begin
 if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required';end if;
 perform public.product_development_fields(p_input,array['code','name','category_code','division_id','kind','lifecycle_stage','priority','description','specification','format_spec','process_route','owner_id','next_task','due_date','blocker','budget_estimate_min','budget_estimate_max','budget_source','budget_note','reason'],array['budget_estimate_min','budget_estimate_max']);
 why:=btrim(coalesce(p_input->>'reason',''));if length(why) not between 10 and 2000 then raise exception 'development_reason_required';end if;
 if p_id is null then
  if p_expected_version is distinct from 0 then raise exception 'development_version_conflict';end if;
  f:=jsonb_populate_record(null::public.product_development_projects,jsonb_build_object('kind','concept','lifecycle_stage','idea','priority','medium','description','','specification','','format_spec','','process_route','undecided','next_task','','blocker','','budget_note','')||(p_input-'reason'));
 else
  select * into r from public.product_development_projects where id=p_id for update;if not found then raise exception 'development_project_missing';end if;
  if p_expected_version is distinct from r.version then raise exception 'development_version_conflict';end if;
  f:=jsonb_populate_record(r,p_input-'reason');
 end if;
 if f.lifecycle_stage in ('approved_for_production','production','ready_for_sale','live') then raise exception 'development_launch_gates_required';end if;
 if f.owner_id is not null and not exists(select 1 from public.staff_roles where user_id=f.owner_id) then raise exception 'development_owner_invalid';end if;
 if f.category_code in ('D','H','K') and f.lifecycle_stage not in ('idea','research','on_hold','rejected','discontinued') then raise exception 'development_research_only';end if;
 perform set_config('hl.development_reason',why,true);
 if p_id is null then
 insert into public.product_development_projects(code,name,category_code,division_id,kind,lifecycle_stage,priority,description,specification,format_spec,process_route,owner_id,next_task,due_date,blocker,budget_estimate_min,budget_estimate_max,budget_source,budget_note,created_by)
 values(btrim(f.code),btrim(f.name),f.category_code,f.division_id,f.kind,f.lifecycle_stage,f.priority,f.description,f.specification,f.format_spec,f.process_route,f.owner_id,f.next_task,f.due_date,f.blocker,f.budget_estimate_min,f.budget_estimate_max,f.budget_source,f.budget_note,auth.uid()) returning * into r;
 else
 update public.product_development_projects set code=btrim(f.code),name=btrim(f.name),category_code=f.category_code,division_id=f.division_id,kind=f.kind,lifecycle_stage=f.lifecycle_stage,priority=f.priority,
 description=f.description,specification=f.specification,format_spec=f.format_spec,process_route=f.process_route,owner_id=f.owner_id,next_task=f.next_task,due_date=f.due_date,blocker=f.blocker,
 budget_estimate_min=f.budget_estimate_min,budget_estimate_max=f.budget_estimate_max,budget_source=f.budget_source,budget_note=f.budget_note,version=version+1,updated_at=now() where id=p_id returning * into r;
 end if;return to_jsonb(r);
end $$;

create function public.product_development_save_supplier(p_vendor_id text,p_expected_version integer,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.supplier_profiles;f public.supplier_profiles;v public.vendors;why text;vendor_key text;
begin
 if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required';end if;
 perform public.product_development_fields(p_input,array['name','region','phone','website','contact_person','email','status','accepts_customer_tea','service_capabilities','supported_formats','notes','next_task','last_contact_on','next_followup_on','reason'],'{}',array['service_capabilities','supported_formats'],array['accepts_customer_tea']);
 why:=btrim(coalesce(p_input->>'reason',''));if length(why) not between 10 and 2000 then raise exception 'development_reason_required';end if;
 if p_vendor_id is null then
  if p_expected_version is distinct from 0 then raise exception 'development_version_conflict';end if;
  vendor_key:='supplier-'||gen_random_uuid()::text;
  f:=jsonb_populate_record(null::public.supplier_profiles,jsonb_build_object('status','lead','contact_person','','email','','service_capabilities','[]'::jsonb,'supported_formats','[]'::jsonb,'notes','','next_task','')||(p_input-array['name','region','phone','reason']));
 else
  select * into r from public.supplier_profiles where vendor_id=p_vendor_id for update;if not found then raise exception 'development_supplier_missing';end if;
  if p_expected_version is distinct from r.version then raise exception 'development_version_conflict';end if;
  vendor_key:=p_vendor_id;select * into v from public.vendors where id=vendor_key for update;
  f:=jsonb_populate_record(r,p_input-array['name','region','phone','reason']);
 end if;
 if f.status not in ('lead','contacted','responded','inactive','rejected') then raise exception 'supplier_evidence_required';end if;
 if f.status in ('contacted','responded') and f.last_contact_on is null then raise exception 'supplier_contact_date_required';end if;
 if f.status='responded' and length(btrim(coalesce(f.notes,'')))<10 then raise exception 'supplier_response_required';end if;
 if length(btrim(coalesce(p_input->>'name',v.name,''))) not between 1 and 240 or length(coalesce(p_input->>'phone',v.phone,''))>80 or length(coalesce(p_input->>'region',v.region,''))>240 then raise exception 'invalid_supplier_identity';end if;
 perform set_config('hl.development_reason',why,true);
 if p_vendor_id is null then
 insert into public.vendors(id,name,region,phone,active,supplier_only) values(vendor_key,btrim(p_input->>'name'),coalesce(p_input->>'region',''),coalesce(p_input->>'phone',''),false,true);
 insert into public.supplier_profiles(vendor_id,website,contact_person,email,status,accepts_customer_tea,service_capabilities,supported_formats,notes,next_task,last_contact_on,next_followup_on,created_by)
 values(vendor_key,nullif(f.website,''),f.contact_person,f.email,f.status,f.accepts_customer_tea,f.service_capabilities,f.supported_formats,f.notes,f.next_task,f.last_contact_on,f.next_followup_on,auth.uid()) returning * into r;
 else
 update public.vendors set name=btrim(coalesce(p_input->>'name',name)),region=coalesce(p_input->>'region',region),phone=coalesce(p_input->>'phone',phone) where id=vendor_key;
 update public.supplier_profiles set website=nullif(f.website,''),contact_person=f.contact_person,email=f.email,status=f.status,accepts_customer_tea=f.accepts_customer_tea,
 service_capabilities=f.service_capabilities,supported_formats=f.supported_formats,notes=f.notes,next_task=f.next_task,last_contact_on=f.last_contact_on,next_followup_on=f.next_followup_on,
 version=version+1,updated_at=now() where vendor_id=vendor_key returning * into r;
 end if;
 insert into public.product_development_events(vendor_id,action,note,before_data,after_data,actor_id)
 values(vendor_key,'supplier_identity',why,case when p_vendor_id is not null then jsonb_build_object('name',v.name,'region',v.region,'phone',v.phone) else null end,
 (select jsonb_build_object('name',name,'region',region,'phone',phone) from public.vendors where id=vendor_key),auth.uid());
 return to_jsonb(r);
end $$;

create function public.product_development_link_catalog(p_project_id uuid,p_product_id text,p_note text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_staff_manager() or auth.uid() is null then raise exception 'manager_required';end if;
 if length(coalesce(p_note,''))>3000 then raise exception 'invalid_development_note';end if;
 if not exists(select 1 from public.catalog_products where id=p_product_id and kind='tea' and coalesce(line,'')<>'sample') then raise exception 'development_catalog_missing';end if;
 insert into public.product_development_catalog_links values(p_project_id,p_product_id,coalesce(p_note,''),now()) on conflict do nothing;
end $$;
create function public.product_development_link_supplier(p_project_id uuid,p_vendor_id text,p_note text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_staff_manager() or auth.uid() is null then raise exception 'manager_required';end if;
 if length(coalesce(p_note,''))>3000 then raise exception 'invalid_development_note';end if;
 insert into public.product_development_suppliers values(p_project_id,p_vendor_id,coalesce(p_note,''),now()) on conflict do nothing;
end $$;
create function public.product_development_link_resource(p_project_id uuid,p_resource_type text,p_resource_id text,p_note text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_staff_manager() or auth.uid() is null then raise exception 'manager_required';end if;
 if length(coalesce(p_note,''))>3000 then raise exception 'invalid_development_note';end if;
 if (p_resource_type='batch' and not exists(select 1 from public.tea_batches where id=p_resource_id)) or (p_resource_type='material' and not exists(select 1 from public.supply_items where id::text=p_resource_id))
 or p_resource_type is null or p_resource_type not in ('batch','material') then raise exception 'development_resource_missing';end if;
 insert into public.product_development_resources values(p_project_id,p_resource_type,p_resource_id,coalesce(p_note,''),now()) on conflict do nothing;
end $$;
create function public.product_development_add_note(p_project_id uuid,p_note text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_staff_manager() or auth.uid() is null then raise exception 'manager_required';end if;
 if length(btrim(coalesce(p_note,''))) not between 1 and 6000 then raise exception 'invalid_development_note';end if;
 insert into public.product_development_events(project_id,action,note,actor_id) values(p_project_id,'note',btrim(p_note),auth.uid());
end $$;

create function public.product_development_snapshot() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required';end if;
 return jsonb_build_object(
 'projects',coalesce((select jsonb_agg(to_jsonb(p) order by p.code) from public.product_development_projects p),'[]'::jsonb),
 'suppliers',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('name',v.name,'region',v.region,'phone',v.phone) order by v.name) from public.supplier_profiles s join public.vendors v on v.id=s.vendor_id),'[]'::jsonb),
 'project_suppliers',coalesce((select jsonb_agg(to_jsonb(l)) from public.product_development_suppliers l),'[]'::jsonb),
 'catalog_links',coalesce((select jsonb_agg(to_jsonb(l)) from public.product_development_catalog_links l),'[]'::jsonb),
 'resource_links',coalesce((select jsonb_agg(to_jsonb(l)) from public.product_development_resources l),'[]'::jsonb),
 'catalog',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'available',c.available,'pack_size',c.pack_size,'price',c.price,'batch',c.batch,'stock_ha_giang',c.stock_ha_giang,'stock_soc_son',c.stock_soc_son,
 'variants',coalesce((select jsonb_agg(jsonb_build_object('weight',v.weight,'price',v.price,'stock_ha_giang',v.stock_ha_giang,'stock_soc_son',v.stock_soc_son)) from public.catalog_variants v where v.product_id=c.id),'[]'::jsonb)) order by c.id) from public.catalog_products c where c.kind='tea' and coalesce(c.line,'')<>'sample'),'[]'::jsonb),
 'materials',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'code',s.code,'name',s.name,'unit',s.unit,'stock_on_hand',s.stock_on_hand,'unit_cost',s.unit_cost)) from public.supply_items s),'[]'::jsonb),
 'batches',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'code',b.code,'product_id',b.product_id,'status',b.status,'available_kg',b.available_kg,'reserved_kg',b.reserved_kg)) from public.tea_batches b),'[]'::jsonb),
 'staff',coalesce((select jsonb_agg(jsonb_build_object('user_id',s.user_id,'display_name',coalesce(nullif(p.display_name,''),s.user_id::text))) from public.staff_roles s left join public.staff_profiles p on p.user_id=s.user_id),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(to_jsonb(e)-'before_data'-'after_data' order by e.created_at desc,e.id desc) from (select * from public.product_development_events order by created_at desc,id desc limit 500)e),'[]'::jsonb));
end $$;

revoke all on function public.product_development_audit(),public.product_development_fields(jsonb,text[],text[],text[],text[]) from public,anon,authenticated;
revoke all on function public.product_development_snapshot(),public.product_development_save_project(uuid,integer,jsonb),public.product_development_save_supplier(text,integer,jsonb),public.product_development_link_catalog(uuid,text,text),public.product_development_link_supplier(uuid,text,text),public.product_development_link_resource(uuid,text,text,text),public.product_development_add_note(uuid,text) from public,anon;
grant execute on function public.product_development_snapshot(),public.product_development_save_project(uuid,integer,jsonb),public.product_development_save_supplier(text,integer,jsonb),public.product_development_link_catalog(uuid,text,text),public.product_development_link_supplier(uuid,text,text),public.product_development_link_resource(uuid,text,text,text),public.product_development_add_note(uuid,text) to authenticated;
-- Seed function appended below from versioned internal planning constants.
create function public.product_development_seed() returns void language plpgsql security definer set search_path=pg_catalog,public as $seedfn$
declare data_value jsonb:=$seeddata${"projects":[{"code":"A001","name":"Hồng Trà Shan Mật — rà soát sản phẩm hiện có","category_code":"A","division_id":"heritage","kind":"catalog_audit","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":["hong-tra-shan-mat"],"description":"Đối chiếu trà gốc, quy cách và lô hiện có; giữ nguyên sản phẩm thương mại đang vận hành.","next_task":"Xác nhận thông số và biến thể từ hồ sơ sản phẩm hiện có.","blocker":"","workstream_code":"WS01"},{"code":"A002","name":"Hồng Trà Shan Khói — rà soát sản phẩm hiện có","category_code":"A","division_id":"heritage","kind":"catalog_audit","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":["hong-tra-shan-khoi"],"description":"Đối chiếu trà gốc và dữ liệu hiện có trước khi dùng cho quy cách phát triển.","next_task":"Rà soát nguồn gốc, thông số và hướng dẫn pha của sản phẩm hiện có.","blocker":"","workstream_code":"WS01"},{"code":"A003","name":"Lục Trà Shan Mộc — rà soát sản phẩm hiện có","category_code":"A","division_id":"heritage","kind":"catalog_audit","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":["luc-tra-shan-moc"],"description":"Liên kết trà gốc hiện có; không suy ra số lượng tồn kho hay tình trạng bán từ ý tưởng này.","next_task":"Xác nhận thông số trà gốc và những quy cách thực sự đang có.","blocker":"","workstream_code":"WS01"},{"code":"A004","name":"Lục Trà Hoa Ngọc Lan — rà soát sản phẩm hiện có","category_code":"A","division_id":"heritage","kind":"catalog_audit","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":["luc-tra-ngoc-lan"],"description":"Dùng đúng mã trà ngọc lan hiện có, tránh tạo trùng sản phẩm.","next_task":"Đối chiếu hồ sơ trà và những thông tin chất lượng đã được xác nhận.","blocker":"","workstream_code":"WS01"},{"code":"A005","name":"Trà Nhài Shan Tuyết — xác minh danh tính trà","category_code":"A","division_id":"heritage","kind":"catalog_audit","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Tên trong brief chưa khớp chính xác các trà lài hiện có. Chưa gán mã sản phẩm.","next_task":"Xác minh tên, giống trà và nguồn gốc trước khi chọn bản ghi hiện có.","blocker":"Chưa xác nhận trà lài hiện có tương ứng với Trà Nhài Shan Tuyết.","workstream_code":"WS01"},{"code":"A006","name":"Trà Sen Shan Tuyết — xác minh danh tính trà","category_code":"A","division_id":"heritage","kind":"catalog_audit","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Tên trong brief chưa khớp chính xác Lục Trà Hoa Sen. Chưa gán mã sản phẩm.","next_task":"Xác minh danh tính trà sen và nguyên liệu trước khi liên kết.","blocker":"Chưa xác nhận trà sen hiện có tương ứng với Trà Sen Shan Tuyết.","workstream_code":"WS01"},{"code":"B003","name":"Quy cách trà đặc sản lá rời 100g","category_code":"B","division_id":"heritage","kind":"format","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Quy cách đóng gói dự kiến của trà gốc đã chọn; không phải công thức riêng.","next_task":"Kiểm tra quy cách 100g hiện có rồi lập yêu cầu bao bì cho phần còn thiếu.","blocker":"","workstream_code":"WS01"},{"code":"B006","name":"Quy cách trà lá bán sỉ 1kg","category_code":"B","division_id":"professional","kind":"format","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Quy cách bán sỉ dự kiến; liên kết trà gốc và biến thể thực tế sau khi kiểm kê.","next_task":"Đối chiếu bao bì, biến thể và yêu cầu B2B hiện có.","blocker":"","workstream_code":"WS01"},{"code":"C001","name":"Trà xanh túi lọc hằng ngày · 20 × 2g","category_code":"C","division_id":"everyday","kind":"concept","lifecycle_stage":"supplier_sourcing","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Thử mẫu OEM dùng trà Hoàng Long; nguyên liệu và thông số túi cần được xác minh.","next_task":"Xác minh đối tác nhận trà do Hoàng Long cung cấp và yêu cầu báo giá mẫu.","blocker":"","workstream_code":"WS03"},{"code":"C003","name":"Trà nhài túi tam giác cao cấp · 15 × 3g","category_code":"C","division_id":"heritage","kind":"concept","lifecycle_stage":"supplier_sourcing","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Nghiên cứu túi tam giác; chưa mặc định trà lài hiện có là nguyên liệu Shan Tuyết.","next_task":"Xác nhận trà đầu vào và yêu cầu đối tác báo thông số túi, mức tối thiểu và mẫu.","blocker":"","workstream_code":"WS03"},{"code":"C004","name":"Trà sen túi tam giác cao cấp · 15 × 3g","category_code":"C","division_id":"heritage","kind":"concept","lifecycle_stage":"supplier_sourcing","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Hoàng Long sở hữu trà và đặc tính sản phẩm; đối tác chỉ hoàn thiện khi phù hợp.","next_task":"Xác nhận trà sen đầu vào, khả năng giữ hương và chính sách nhận nguyên liệu.","blocker":"","workstream_code":"WS03"},{"code":"C006","name":"Trà nhài túi pha lạnh · 10 × 8g","category_code":"C","division_id":"everyday","kind":"concept","lifecycle_stage":"supplier_sourcing","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Thử chiết xuất lạnh có kiểm soát; chưa có hạn dùng hoặc tuyên bố an toàn cho sản phẩm mới.","next_task":"Lập yêu cầu thử pha, thời gian bảo quản mẫu và quy cách túi OEM.","blocker":"","workstream_code":"WS03"},{"code":"C007","name":"Túi trà pha cho nhà hàng · 10 × 20g","category_code":"C","division_id":"professional","kind":"concept","lifecycle_stage":"supplier_sourcing","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Dạng túi định lượng cho nhà hàng; đối chiếu G003 để tránh tạo hai công thức giống nhau.","next_task":"Thống nhất nhu cầu pha theo mẻ và yêu cầu mẫu túi 20g.","blocker":"","workstream_code":"WS03"},{"code":"E001","name":"Bánh trà Shan Tuyết nguyên liệu lưu niên · 200g","category_code":"E","division_id":"heritage","kind":"concept","lifecycle_stage":"supplier_sourcing","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Phải xác định quy trình từ lá tươi phù hợp. Không ép lục trà hấp thành phẩm rồi gọi là Phổ Nhĩ sống.","next_task":"Tìm và xác minh đối tác chỉ ép thuê bằng trà Hoàng Long; lập tiêu chí quy trình, độ ẩm và bảo quản.","blocker":"Chưa xác minh đối tác chỉ ép thuê nhận trà Hoàng Long và quy trình nguyên liệu phù hợp; nhiệm vụ vẫn mở.","workstream_code":"WS04"},{"code":"E003","name":"Bạch trà Shan Tuyết ép · 200g","category_code":"E","division_id":"heritage","kind":"concept","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Thử nghiệm nguyên liệu bạch trà, ép, sấy và hồ sơ lô; không khẳng định trà hiện có là nguyên liệu đã duyệt.","next_task":"Xác định trà đầu vào và tiêu chí đánh giá mẫu ép.","blocker":"Chưa duyệt trà đầu vào, phương pháp ép và tiêu chí bảo quản.","workstream_code":"WS04"},{"code":"E004","name":"Lục trà sen ép · 100g","category_code":"E","division_id":"heritage","kind":"concept","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Thử riêng dạng ép từ lục trà thành phẩm; không gắn với tuyên bố Phổ Nhĩ sống.","next_task":"Đánh giá giữ hương, độ ẩm, khả năng tách và điều kiện bảo quản mẫu.","blocker":"","workstream_code":"WS04"},{"code":"E007","name":"Bộ lưu trữ niên vụ Shan Tuyết · phiên bản giới hạn","category_code":"E","division_id":"heritage","kind":"concept","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Khái niệm lưu hồ sơ niên vụ, nguồn gốc và diễn biến cảm quan; chưa có số lượng hay niên vụ được cam kết.","next_task":"Xác định mẫu hồ sơ niên vụ và lịch kiểm tra bảo quản; không hứa tăng giá.","blocker":"","workstream_code":"WS04"},{"code":"F001","name":"Trà khô Shan Mật làm nền trà sữa","category_code":"F","division_id":"professional","kind":"concept","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Chuẩn hóa trà khô và công thức pha; trà đầu vào tham chiếu A001, không tạo SKU thương mại.","next_task":"Đối chiếu công thức hiện có, thử tỷ lệ chiết xuất và ghi định mức trà.","blocker":"","workstream_code":"WS05"},{"code":"F006","name":"Trà khô Shan Mộc làm nền đồ uống","category_code":"F","division_id":"professional","kind":"concept","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Chuẩn hóa trà khô và hướng dẫn pha; trà đầu vào tham chiếu A003.","next_task":"Đo định mức và đánh giá pha theo nhu cầu quán từ công thức hiện có.","blocker":"","workstream_code":"WS05"},{"code":"F008","name":"Phối trà khô theo yêu cầu quán","category_code":"F","division_id":"professional","kind":"concept","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Dịch vụ phát triển trà khô theo yêu cầu; công thức, chi phí và khả năng cung ứng cần được duyệt.","next_task":"Lập biểu mẫu yêu cầu vị, mục đích pha và tiêu chí mẫu, nối luồng báo giá hiện có.","blocker":"","workstream_code":"WS05"},{"code":"G001","name":"Trà phổ thông dùng hằng ngày · 1kg","category_code":"G","division_id":"everyday","kind":"concept","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Chỉ dùng trà đạt phân hạng thực phẩm; không coi mọi vụn trà là nguyên liệu uống được.","next_task":"Xác định phân hạng trà phù hợp, công thức pha và giá trị nguyên liệu thực tế.","blocker":"","workstream_code":"WS02"},{"code":"G002","name":"Trà đá nhà hàng · 1kg","category_code":"G","division_id":"professional","kind":"concept","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Thử trà đá theo nhu cầu nhà hàng; cần đánh giá cảm quan và chi phí nguyên liệu.","next_task":"Thử mẻ pha chuẩn và thu phản hồi từ nhu cầu khách đã xác nhận.","blocker":"","workstream_code":"WS02"},{"code":"G003","name":"Túi trà đá định lượng · 20g","category_code":"G","division_id":"professional","kind":"format","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Quy cách túi 20g cho trà đá; phối hợp C007 để tránh trùng hồ sơ công thức.","next_task":"Chọn trà gốc đã duyệt và so sánh hiệu quả chiết xuất của túi 20g.","blocker":"","workstream_code":"WS02"},{"code":"G004","name":"Túi trà pha theo mẻ lớn · 50g","category_code":"G","division_id":"professional","kind":"format","lifecycle_stage":"research","public_availability":"hidden","priority":"high","linked_product_ids":[],"description":"Quy cách túi định lượng 50g; chưa có sản lượng pha hay mức đặt hàng được xác nhận.","next_task":"Xác định thể tích pha mục tiêu và thử mẫu túi 50g.","blocker":"","workstream_code":"WS02"},{"code":"M001","name":"Phân đoạn trà mịn đạt chuẩn thực phẩm","category_code":"M","division_id":"manufacturing_lab","kind":"material_research","lifecycle_stage":"research","public_availability":"hidden","priority":"medium","linked_product_ids":[],"description":"Cần duyệt mục đích sử dụng theo từng lô; tách riêng thực phẩm, chiết xuất, phi thực phẩm và loại bỏ.","next_task":"Kiểm kê phân đoạn, đo khối lượng và yêu cầu chất lượng trước khi gán mục đích.","blocker":"","workstream_code":"WS06"},{"code":"M002","name":"Phối trà lá gãy đạt chuẩn thực phẩm","category_code":"M","division_id":"manufacturing_lab","kind":"material_research","lifecycle_stage":"research","public_availability":"hidden","priority":"medium","linked_product_ids":[],"description":"Chỉ dùng lá gãy đã được duyệt cho thực phẩm; không chuyển lô mốc, nhiễm bẩn hoặc bị loại sang đồ uống.","next_task":"Ghi nguồn lô, phân hạng và quy tắc duyệt nguyên liệu lá gãy.","blocker":"","workstream_code":"WS06"},{"code":"M003","name":"Sản phẩm từ cuộng trà","category_code":"M","division_id":"manufacturing_lab","kind":"material_research","lifecycle_stage":"research","public_availability":"hidden","priority":"medium","linked_product_ids":[],"description":"Đánh giá phân hạng và mục đích; chưa mặc định cuộng trà là thực phẩm.","next_task":"Xác nhận phân hạng, chất lượng và mục đích được phép cho từng lô.","blocker":"","workstream_code":"WS06"},{"code":"D-RESEARCH","name":"Nghiên cứu nhóm trà phối trộn và tạo hương","category_code":"D","division_id":"manufacturing_lab","kind":"category_research","lifecycle_stage":"research","public_availability":"hidden","priority":"later","linked_product_ids":[],"description":"Lưu ý tưởng trà trái cây, citrus, gừng, hoa, gia vị và phối trà riêng; chưa cam kết sản xuất.","next_task":"Ghi yêu cầu kỹ thuật và câu hỏi nghiên cứu cho từng ý tưởng.","blocker":"","workstream_code":"WS08"},{"code":"H-RESEARCH","name":"Nghiên cứu nhóm trà pha sẵn và đóng chai","category_code":"H","division_id":"manufacturing_lab","kind":"category_research","lifecycle_stage":"research","public_availability":"hidden","priority":"later","linked_product_ids":[],"description":"Lưu các ý tưởng trà đen, xanh, nhài, sen đóng chai, pha lạnh, trà sữa và cốt trà; chưa cam kết sản xuất.","next_task":"Ghi yêu cầu chế biến, bao bì, an toàn và thẩm định hạn dùng.","blocker":"","workstream_code":"WS08"},{"code":"K-RESEARCH","name":"Nghiên cứu nhóm bột trà và chiết xuất","category_code":"K","division_id":"manufacturing_lab","kind":"category_research","lifecycle_stage":"research","public_availability":"hidden","priority":"later","linked_product_ids":[],"description":"Lưu các ý tưởng nghiền, hòa tan, cô đặc, cao trà, sấy thăng hoa và chiết xuất; chưa cam kết sản xuất.","next_task":"Ghi yêu cầu công nghệ, quyền sở hữu nguyên liệu và tiêu chí chất lượng.","blocker":"","workstream_code":"WS08"}],"suppliers":[{"id":"an-viet-tra","name":"An Việt Trà","region":"Đông Anh, Hà Nội — theo brief, chưa xác minh","website":"https://anviettra.vn/","service_capabilities":["Gia công trà túi lọc — cần xác minh"],"supported_formats":["Túi lọc — cần xác minh"],"status":"lead","evidence_status":"brief_unverified","accepts_customer_tea":null,"minimum_order_quantity":null,"estimated_unit_cost":null,"sample_cost":null,"lead_time":null,"notes":"Đầu mối do brief ngày 19/10/2026 cung cấp, chưa xác minh website, pháp nhân, dịch vụ, chứng nhận hoặc báo giá. Chưa phải đối tác được duyệt.","next_task":"Xác minh đầu mối và việc nhận trà Hoàng Long; hỏi mức tối thiểu, thử mẫu, truy xuất lô."},{"id":"hcn-pharma","name":"HCN Pharma / Giacong.vn","region":"Ninh Bình — theo brief, chưa xác minh","website":"https://giacong.vn/gia-cong-tra-tui-loc/","service_capabilities":["Gia công túi lọc","Phối trộn","Nghiền","Gia công từng công đoạn"],"supported_formats":["Túi lọc — cần xác minh"],"status":"lead","evidence_status":"brief_unverified","accepts_customer_tea":null,"minimum_order_quantity":null,"estimated_unit_cost":null,"sample_cost":null,"lead_time":null,"notes":"Đầu mối do brief ngày 19/10/2026 cung cấp, chưa xác minh website, pháp nhân, dịch vụ, chứng nhận hoặc báo giá. Chưa phải đối tác được duyệt.","next_task":"Xác minh từng công đoạn thực nhận, nguyên liệu do khách cung cấp và yêu cầu kỹ thuật."},{"id":"nuky-nguyen-ky","name":"NUKY / Nguyên Ký","region":"TP. Hồ Chí Minh — theo brief, chưa xác minh","website":"https://www.nuky.vn/trang/gia-cong-oem","service_capabilities":["Gia công túi lọc","Đóng gói nhãn riêng"],"supported_formats":["Túi vuông — cần xác minh","Túi tam giác — cần xác minh"],"status":"lead","evidence_status":"brief_unverified","accepts_customer_tea":null,"minimum_order_quantity":null,"estimated_unit_cost":null,"sample_cost":null,"lead_time":null,"notes":"Đầu mối do brief ngày 19/10/2026 cung cấp, chưa xác minh website, pháp nhân, dịch vụ, chứng nhận hoặc báo giá. Chưa phải đối tác được duyệt.","next_task":"Xác minh dịch vụ túi vuông/tam giác, sở hữu trà, phương án bao bì và điều kiện thử mẫu."},{"id":"vida-farm","name":"Vida Farm","region":"Việt Nam — theo brief, chưa xác minh","website":"https://vidafarm.vn/en/oem-private-label/","service_capabilities":["Nhãn riêng","Phối trộn","Đóng gói"],"supported_formats":["Túi lọc — cần xác minh","Túi tam giác — cần xác minh"],"status":"lead","evidence_status":"brief_unverified","accepts_customer_tea":null,"minimum_order_quantity":null,"estimated_unit_cost":null,"sample_cost":null,"lead_time":null,"notes":"Đầu mối do brief ngày 19/10/2026 cung cấp, chưa xác minh website, pháp nhân, dịch vụ, chứng nhận hoặc báo giá. Chưa phải đối tác được duyệt.","next_task":"Xác minh nhận trà khách cung cấp, mức tối thiểu và phạm vi báo giá mẫu; không dùng mức tối thiểu suy đoán."},{"id":"hvl-tea","name":"HVL TEA","region":"Long Biên, Hà Nội — theo brief, chưa xác minh","website":null,"service_capabilities":["Vật tư túi lọc","Túi và hộp bao bì"],"supported_formats":["Vật tư lọc và bao bì — cần xác minh"],"status":"lead","evidence_status":"brief_unverified","accepts_customer_tea":null,"minimum_order_quantity":null,"estimated_unit_cost":null,"sample_cost":null,"lead_time":null,"notes":"Đầu mối do brief ngày 19/10/2026 cung cấp, chưa xác minh website, pháp nhân, dịch vụ, chứng nhận hoặc báo giá. Chưa phải đối tác được duyệt.","next_task":"Xác minh đúng pháp nhân, website và đầu mối trước khi đánh giá vật tư tiếp xúc thực phẩm."},{"id":"eurofins-sac-ky-hai-dang","name":"Eurofins Sắc Ký Hải Đăng","region":"Việt Nam — theo brief, chưa xác minh","website":"https://www.eurofins.vn/","service_capabilities":["Kiểm nghiệm sản phẩm — cần xác minh phạm vi"],"supported_formats":["Mẫu kiểm nghiệm — thống nhất theo yêu cầu"],"status":"lead","evidence_status":"brief_unverified","accepts_customer_tea":null,"minimum_order_quantity":null,"estimated_unit_cost":null,"sample_cost":null,"lead_time":null,"notes":"Đầu mối do brief ngày 19/10/2026 cung cấp, chưa xác minh website, pháp nhân, dịch vụ, chứng nhận hoặc báo giá. Chưa phải đối tác được duyệt.","next_task":"Xác minh phòng thử nghiệm, phạm vi được công nhận, chỉ tiêu, mẫu yêu cầu và báo giá hiện hành."}]}$seeddata$::jsonb; p jsonb;s jsonb;project_key uuid;vendor_key text;product_key text;c record;
begin
 perform set_config('hl.development_reason','Bản đồ nghiên cứu từ brief19/10/2026; chưa duyệt sản xuất, giá hay đối tác',true);
 for p in select value from jsonb_array_elements(data_value->'projects') loop
  insert into public.product_development_projects(code,name,category_code,division_id,kind,lifecycle_stage,priority,description,next_task,blocker,workstream_code)
  values(p->>'code',p->>'name',p->>'category_code',p->>'division_id',p->>'kind',p->>'lifecycle_stage',p->>'priority',p->>'description',p->>'next_task',p->>'blocker',p->>'workstream_code') on conflict(code) do nothing;
  select id into project_key from public.product_development_projects where code=p->>'code';
  for product_key in select jsonb_array_elements_text(p->'linked_product_ids') loop
   if exists(select 1 from public.catalog_products where id=product_key and kind='tea') then
    insert into public.product_development_catalog_links(project_id,product_id,note) values(project_key,product_key,'Khớp mã hiện có; không đổi giá, tồn kho hoặc tình trạng bán.') on conflict do nothing;
   end if;
  end loop;
 end loop;
 -- Audit the actual remaining catalogue too; these are review tasks, never new SKUs.
 for c in select * from public.catalog_products where kind='tea' and coalesce(line,'')<>'sample' and not exists(select 1 from public.product_development_catalog_links l where l.product_id=catalog_products.id) loop
  insert into public.product_development_projects(code,name,category_code,division_id,kind,lifecycle_stage,priority,description,next_task)
  values('CAT-'||upper(substr(md5(c.id),1,16)),left('Rà soát catalog · '||coalesce(nullif(c.name->>'vi',''),c.name->>'en',c.id),240),'A','heritage','catalog_audit','research','medium','Bản ghi kiểm kê liên kết sản phẩm thật đang có trong catalog; không suy ra trạng thái phát triển từ tình trạng bán.','Đối chiếu tên, quy cách, nguồn gốc và lô hiện có.') on conflict(code) do nothing;
  select id into project_key from public.product_development_projects where code='CAT-'||upper(substr(md5(c.id),1,16));
  insert into public.product_development_catalog_links(project_id,product_id,note) values(project_key,c.id,'Liên kết kiểm kê sản phẩm hiện có; nguyên dữ liệu thương mại.') on conflict do nothing;
 end loop;
 for s in select value from jsonb_array_elements(data_value->'suppliers') loop
  vendor_key:=null;
  select id into vendor_key from public.vendors where id='mfg-'||(s->>'id') or lower(btrim(name))=lower(btrim(s->>'name')) order by (id='mfg-'||(s->>'id')) desc limit 1;
  if vendor_key is null then
   vendor_key:='mfg-'||(s->>'id');
   insert into public.vendors(id,name,region,active,supplier_only) values(vendor_key,s->>'name',s->>'region',false,true);
  end if;
  insert into public.supplier_profiles(vendor_id,website,evidence_status,service_capabilities,supported_formats,notes,next_task)
  values(vendor_key,s->>'website','brief_unverified',array(select jsonb_array_elements_text(s->'service_capabilities')),array(select jsonb_array_elements_text(s->'supported_formats')),s->>'notes',s->>'next_task') on conflict do nothing;
  -- Candidate associations are sourcing hypotheses, not approved capabilities.
  if s->>'id' in ('an-viet-tra','hcn-pharma','nuky-nguyen-ky','vida-farm','hvl-tea') then
   insert into public.product_development_suppliers(project_id,vendor_id,note)
   select id,vendor_key,'Ứng viên từ brief; chưa xác minh nhận trà Hoàng Long, dịch vụ, báo giá hoặc mức tối thiểu.' from public.product_development_projects where code in ('C001','C003','C004','C006','C007') on conflict do nothing;
  end if;
 end loop;
end $seedfn$;
revoke all on function public.product_development_seed() from public,anon,authenticated;
select public.product_development_seed();
commit;
