begin;

alter table public.trade_opportunities
  add column is_b2b boolean not null default false,
  add column b2b_legal jsonb not null default '{}'::jsonb,
  add constraint trade_opportunity_b2b_legal_object
    check (jsonb_typeof(b2b_legal) = 'object' and octet_length(b2b_legal::text) <= 16000);

create index trade_opportunities_b2b_contact_key_idx
  on public.trade_opportunities(public.discovery_trade_contact_key(contact));

create table public.b2b_selling_entities (
  id text primary key,
  label text not null check (length(btrim(label)) between 1 and 200),
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 16000),
  updated_at timestamptz not null default now()
);

-- Only display names are seeded. Contract identities and payment details are
-- configured in the authenticated workspace.
insert into public.b2b_selling_entities(id,label) values
  ('hoang-long','Hoàng Long'), ('green-hill','Green Hill');

-- Document scope IDs deliberately outlive the source rows: the existing recycle
-- and restore flow must preserve signed evidence and be able to restore the links.
create table public.b2b_documents (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text,
  order_id text,
  seller_id text not null references public.b2b_selling_entities(id),
  kind text not null check (kind in ('framework','sales_contract','delivery_record','vat_invoice')),
  status text not null default 'draft' check (status in ('draft','complete')),
  draft jsonb not null default '{}'::jsonb
    check (jsonb_typeof(draft) = 'object' and octet_length(draft::text) <= 131072),
  document_ref text check (length(document_ref) <= 200),
  valid_from date,
  valid_until date,
  invoice_number text check (length(invoice_number) <= 200),
  invoice_date date,
  file_path text unique,
  file_name text check (length(file_name) <= 255),
  created_by uuid not null,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'framework' and opportunity_id is not null and order_id is null)
         or (kind <> 'framework' and order_id is not null)),
  check (valid_until is null or (valid_from is not null and valid_until >= valid_from)),
  check (status <> 'complete' or (nullif(btrim(file_path),'') is not null
         and nullif(btrim(file_name),'') is not null and completed_at is not null and completed_by is not null)),
  check (status <> 'complete' or kind <> 'framework' or valid_from is not null),
  check (status <> 'complete' or kind <> 'vat_invoice'
         or (nullif(btrim(invoice_number),'') is not null and invoice_date is not null))
);
create unique index b2b_documents_framework_draft_idx
  on public.b2b_documents(opportunity_id,seller_id) where kind = 'framework' and status = 'draft';
create unique index b2b_documents_order_draft_idx
  on public.b2b_documents(order_id,seller_id,kind,coalesce(opportunity_id,''))
  where order_id is not null and status = 'draft';
create index b2b_documents_customer_idx
  on public.b2b_documents(opportunity_id,seller_id,kind,completed_at desc) where order_id is null;
create index b2b_documents_order_idx
  on public.b2b_documents(order_id,seller_id,kind,completed_at desc) where order_id is not null;

-- Keep workflow settings stable through the seven-day recycle/restore window.
-- Public read paths never reference this table.
create table public.b2b_order_workflows (
  order_id text primary key,
  opportunity_id text,
  seller_id text references public.b2b_selling_entities(id),
  vat_percent numeric(5,2) check (vat_percent between 0 and 100),
  framework_id uuid references public.b2b_documents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index b2b_workflows_opportunity_idx on public.b2b_order_workflows(opportunity_id,updated_at desc);

alter table public.b2b_selling_entities enable row level security;
alter table public.b2b_order_workflows enable row level security;
alter table public.b2b_documents enable row level security;
revoke all on public.b2b_selling_entities, public.b2b_order_workflows, public.b2b_documents
  from public, anon, authenticated, service_role;
grant select on public.b2b_selling_entities, public.b2b_order_workflows, public.b2b_documents to authenticated;
grant select on public.b2b_order_workflows to service_role;
grant select, insert, update on public.b2b_selling_entities, public.b2b_documents to service_role;

create function public.b2b_verified_manager(p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.staff_roles r join auth.users u on u.id = r.user_id
    where r.user_id = p_actor and r.role in ('manager','admin')
      and u.email_confirmed_at is not null and nullif(u.email,'') is not null
      and not coalesce(u.is_anonymous,false)
  );
$$;
revoke execute on function public.b2b_verified_manager(uuid) from public, anon, authenticated;
-- The session policy only checks the caller and does not expose arbitrary user lookups.
create function public.b2b_current_document_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.b2b_verified_manager(auth.uid()) and exists (
    select 1 from public.staff_roles r where r.user_id = auth.uid()
      and (r.role = 'admin' or r.workspace_modules is null or 'documents' = any(r.workspace_modules))
  );
$$;
revoke execute on function public.b2b_current_document_manager() from public, anon;
grant execute on function public.b2b_current_document_manager() to authenticated;

create policy b2b_sellers_manager_read on public.b2b_selling_entities for select to authenticated using ((select public.b2b_current_document_manager()));
create policy b2b_workflows_manager_read on public.b2b_order_workflows for select to authenticated using ((select public.b2b_current_document_manager()));
create policy b2b_documents_manager_read on public.b2b_documents for select to authenticated using ((select public.b2b_current_document_manager()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('b2b-private-documents','b2b-private-documents',false,10485760,
  array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

create function public.b2b_order_opportunity(p_order public.orders)
returns text language plpgsql stable set search_path = '' as $$
declare v_manual text; v_quote text; v_partner text; v_key text; v_unique text;
begin
  select link.opportunity_id into v_manual
    from public.customer_directory_order_links link where link.order_id = p_order.id;
  if v_manual is not null then return v_manual; end if;

  if p_order.quote_id is not null or p_order.partner_account_id is not null then
    select q.opportunity_id into v_quote from public.trade_quotes q where q.id = p_order.quote_id;
    select w.opportunity_id into v_partner from public.wholesale_accounts w where w.id = p_order.partner_account_id;
    if v_quote is not null and v_partner is not null and v_quote <> v_partner then return null; end if;
    return coalesce(v_quote,v_partner);
  end if;

  v_key := public.discovery_trade_contact_key(p_order.contact);
  if v_key !~ '^([0-9]{8,15}|[^ @]+@[^ @]+[.][^ @]+)$' then return null; end if;
  select case when count(*) = 1 then min(o.id) end into v_unique
    from public.trade_opportunities o where public.discovery_trade_contact_key(o.contact) = v_key;
  return v_unique;
end;
$$;
revoke execute on function public.b2b_order_opportunity(public.orders) from public, anon, authenticated;

create function public.ensure_b2b_order_workflow(p_order_id text)
returns public.b2b_order_workflows language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_opportunity text; v_workflow public.b2b_order_workflows;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.status in ('cancelled','canceled','deleted','void','rejected')
    or v_order.stage in ('cancelled','canceled','deleted','void','rejected') then return null; end if;

  v_opportunity := public.b2b_order_opportunity(v_order);
  -- Explicitly wholesale orders and orders owned by a classified customer are
  -- eligible. Once the workflow exists, keep it accessible for its audit history.
  select * into v_workflow from public.b2b_order_workflows where order_id = p_order_id;
  if v_workflow.order_id is null and v_order.type <> 'wholesale' and not exists (
    select 1 from public.trade_opportunities where id = v_opportunity and is_b2b
  ) then return null; end if;

  insert into public.b2b_order_workflows(order_id,opportunity_id)
  values(p_order_id,v_opportunity)
  on conflict (order_id) do update
    set opportunity_id = excluded.opportunity_id, updated_at = now()
    where b2b_order_workflows.opportunity_id is distinct from excluded.opportunity_id
      and b2b_order_workflows.framework_id is null
      and not exists (
        select 1 from public.b2b_documents d where d.order_id = p_order_id and d.status = 'complete'
      );
  select * into v_workflow from public.b2b_order_workflows where order_id = p_order_id;
  return v_workflow;
end;
$$;
revoke execute on function public.ensure_b2b_order_workflow(text) from public, anon, authenticated;
grant execute on function public.ensure_b2b_order_workflow(text) to service_role;

create function public.b2b_order_workflow_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.ensure_b2b_order_workflow(new.id);
  return new;
end;
$$;
revoke execute on function public.b2b_order_workflow_trigger() from public, anon, authenticated;
create trigger b2b_order_workflow_initialize
  after insert or update of type,contact,quote_id,partner_account_id on public.orders
  for each row execute function public.b2b_order_workflow_trigger();

create function public.b2b_directory_link_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform public.ensure_b2b_order_workflow(old.order_id);
    return old;
  end if;
  perform public.ensure_b2b_order_workflow(new.order_id);
  return new;
end;
$$;
revoke execute on function public.b2b_directory_link_trigger() from public, anon, authenticated;
create trigger b2b_order_refresh_directory_link
  after insert or update or delete on public.customer_directory_order_links
  for each row execute function public.b2b_directory_link_trigger();

create function public.b2b_classification_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_b2b and (tg_op = 'INSERT' or not old.is_b2b) then
    perform public.ensure_b2b_order_workflow(o.id)
      from public.orders o
      where o.status not in ('completed','cancelled','canceled','deleted','void','rejected')
        and (o.stage is null or o.stage not in ('completed','cancelled','canceled','deleted','void','rejected'))
        and public.b2b_order_opportunity(o) = new.id
      order by o.id;
  end if;
  return new;
end;
$$;
revoke execute on function public.b2b_classification_trigger() from public, anon, authenticated;
create trigger b2b_customer_classification_activate
  after insert or update of is_b2b on public.trade_opportunities
  for each row execute function public.b2b_classification_trigger();

-- Populate the overview only for unfinished existing B2B orders. Historical
-- wholesale orders can be initialized on demand without marking past documents ready.
do $$
begin
  perform public.ensure_b2b_order_workflow(id) from public.orders
    where type = 'wholesale' and status not in ('completed','cancelled','canceled','deleted','void','rejected')
      and (stage is null or stage not in ('completed','cancelled','canceled','deleted','void','rejected'))
    order by id;
end;
$$;

create function public.b2b_preserve_completed_document()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' and old.status = 'complete' then
    raise exception 'b2b_completed_document_immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.status = 'complete' and current_user in ('service_role','authenticated','anon') then
    raise exception 'b2b_use_document_completion';
  end if;
  return new;
end;
$$;
revoke execute on function public.b2b_preserve_completed_document() from public, anon, authenticated;
create trigger b2b_document_immutable_archive
  before insert or update or delete on public.b2b_documents
  for each row execute function public.b2b_preserve_completed_document();

create function public.b2b_pin_complete_framework(p_order_id text)
returns void language sql set search_path = '' as $$
  update public.b2b_order_workflows w
     set framework_id = f.id, updated_at = now()
    from public.orders o cross join public.b2b_documents f
   where w.order_id = p_order_id and o.id = w.order_id and w.framework_id is null
     and f.id = (
       select eligible.id
       from public.b2b_documents eligible
       where eligible.kind = 'framework' and eligible.status = 'complete'
         and eligible.opportunity_id = w.opportunity_id and eligible.seller_id = w.seller_id
         and (
           (o.ts at time zone 'Asia/Ho_Chi_Minh')::date between eligible.valid_from and coalesce(eligible.valid_until,'infinity'::date)
           or (now() at time zone 'Asia/Ho_Chi_Minh')::date between eligible.valid_from and coalesce(eligible.valid_until,'infinity'::date)
         )
       order by eligible.valid_from desc, eligible.completed_at desc, eligible.id desc
       limit 1
     )
     and (select count(distinct d.kind) from public.b2b_documents d
           where d.order_id = w.order_id and d.seller_id = w.seller_id and d.status = 'complete'
             and d.opportunity_id is not distinct from w.opportunity_id) = 3;
$$;
revoke execute on function public.b2b_pin_complete_framework(text) from public, anon, authenticated;

create function public.b2b_update_order_workflow(
  p_order_id text, p_actor uuid, p_customer_id text default null,
  p_seller_id text default null, p_vat_percent numeric default null
)
returns public.b2b_order_workflows language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_workflow public.b2b_order_workflows;
begin
  if not public.b2b_verified_manager(p_actor) then raise exception 'b2b_manager_required'; end if;
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.status in ('cancelled','canceled','deleted','void','rejected')
    or v_order.stage in ('cancelled','canceled','deleted','void','rejected') then
    raise exception 'b2b_order_not_found';
  end if;
  if p_seller_id is not null and not exists (select 1 from public.b2b_selling_entities where id = p_seller_id) then
    raise exception 'b2b_invalid_seller';
  end if;
  if p_vat_percent is not null and (p_vat_percent < 0 or p_vat_percent > 100 or p_vat_percent <> round(p_vat_percent,2)) then
    raise exception 'b2b_invalid_vat';
  end if;

  if p_customer_id is not null then
    if not exists (select 1 from public.trade_opportunities where id = p_customer_id and is_b2b) then
      raise exception 'b2b_customer_not_classified';
    end if;
    -- Use the same link -> workflow lock order as the legacy directory action.
    -- A later identity check rolls the entire link replacement back if needed.
    insert into public.customer_directory_order_links(order_id,opportunity_id)
      values(p_order_id,p_customer_id)
      on conflict(order_id) do update set opportunity_id = excluded.opportunity_id, linked_at = now();
  end if;

  v_workflow := public.ensure_b2b_order_workflow(p_order_id);
  if v_workflow.order_id is null then raise exception 'b2b_ineligible_order'; end if;
  select * into v_workflow from public.b2b_order_workflows where order_id = p_order_id for update;
  if ((p_seller_id is not null and p_seller_id is distinct from v_workflow.seller_id)
    or (p_customer_id is not null and p_customer_id is distinct from v_workflow.opportunity_id))
    and exists (select 1 from public.b2b_documents d where d.order_id = p_order_id and d.status = 'complete') then
    raise exception 'b2b_order_identity_locked';
  end if;
  if p_vat_percent is not null and p_vat_percent is distinct from v_workflow.vat_percent
    and exists (select 1 from public.b2b_documents d
                where d.order_id = p_order_id and d.kind = 'vat_invoice' and d.status = 'complete') then
    raise exception 'b2b_issued_invoice_locked';
  end if;

  update public.b2b_order_workflows
     set seller_id = coalesce(p_seller_id,seller_id), vat_percent = coalesce(p_vat_percent,vat_percent), updated_at = now()
   where order_id = p_order_id;
  perform public.b2b_pin_complete_framework(p_order_id);
  select * into v_workflow from public.b2b_order_workflows where order_id = p_order_id;
  return v_workflow;
end;
$$;
revoke execute on function public.b2b_update_order_workflow(text,uuid,text,text,numeric) from public, anon, authenticated;
grant execute on function public.b2b_update_order_workflow(text,uuid,text,text,numeric) to service_role;

create function public.b2b_complete_document(
  p_id uuid, p_actor uuid, p_file_path text, p_file_name text,
  p_valid_from date default null, p_valid_until date default null,
  p_invoice_number text default null, p_invoice_date date default null,
  p_document_ref text default null
)
returns public.b2b_documents language plpgsql security definer set search_path = '' as $$
declare v_doc public.b2b_documents; v_workflow public.b2b_order_workflows; v_order public.orders;
begin
  if not public.b2b_verified_manager(p_actor) then raise exception 'b2b_manager_required'; end if;
  select * into v_doc from public.b2b_documents where id = p_id for update;
  if not found then raise exception 'b2b_document_not_found'; end if;
  if v_doc.status = 'complete' then
    if v_doc.file_path = p_file_path then return v_doc; end if;
    raise exception 'b2b_completed_document_immutable';
  end if;

  if p_file_path is null or p_file_path !~ (
    '^' || p_id::text || '/' || p_actor::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](pdf|jpg|jpeg|png|docx)$'
  ) or not exists (
    select 1 from storage.objects where bucket_id = 'b2b-private-documents' and name = p_file_path
  ) then raise exception 'b2b_document_file_missing'; end if;

  if v_doc.kind = 'framework' then
    if not exists (select 1 from public.trade_opportunities where id = v_doc.opportunity_id and is_b2b) then
      raise exception 'b2b_customer_not_classified';
    end if;
    if p_valid_from is null or (p_valid_until is not null and p_valid_until < p_valid_from) then
      raise exception 'b2b_framework_dates_required';
    end if;
  else
    select * into v_order from public.orders where id = v_doc.order_id for no key update;
    if not found or v_order.status in ('cancelled','canceled','deleted','void','rejected')
      or v_order.stage in ('cancelled','canceled','deleted','void','rejected') then
      raise exception 'b2b_order_not_found';
    end if;
    select * into v_workflow from public.b2b_order_workflows where order_id = v_doc.order_id for update;
    if not found or v_workflow.seller_id is distinct from v_doc.seller_id
      or v_workflow.opportunity_id is distinct from v_doc.opportunity_id then
      raise exception 'b2b_document_order_mismatch';
    end if;
    -- Completing an order document fixes its attribution. Never lock in an
    -- unlinked customer, since that would leave the framework step unreachable.
    if not exists (
      select 1 from public.trade_opportunities c
      where c.id = v_workflow.opportunity_id and c.is_b2b
    ) then raise exception 'b2b_customer_not_classified'; end if;
    if v_doc.kind = 'vat_invoice' and (
      nullif(btrim(p_invoice_number),'') is null or p_invoice_date is null
      or p_invoice_date > (now() at time zone 'Asia/Ho_Chi_Minh')::date
      or p_file_path like '%.docx'
      or v_workflow.vat_percent is null
    ) then raise exception 'b2b_issued_invoice_required'; end if;
  end if;

  update public.b2b_documents
    set status = 'complete', file_path = p_file_path, file_name = btrim(p_file_name),
        document_ref = coalesce(nullif(btrim(p_document_ref),''),document_ref),
        valid_from = case when kind = 'framework' then p_valid_from end,
        valid_until = case when kind = 'framework' then p_valid_until end,
        invoice_number = case when kind = 'vat_invoice' then btrim(p_invoice_number) end,
        invoice_date = case when kind = 'vat_invoice' then p_invoice_date end,
        completed_at = now(), completed_by = p_actor, updated_at = now()
    where id = p_id returning * into v_doc;

  if v_doc.kind = 'framework' then
    perform public.b2b_pin_complete_framework(w.order_id) from public.b2b_order_workflows w
      where w.opportunity_id = v_doc.opportunity_id and w.seller_id = v_doc.seller_id and w.framework_id is null
      order by w.order_id;
  else
    perform public.b2b_pin_complete_framework(v_doc.order_id);
  end if;
  return v_doc;
end;
$$;
revoke execute on function public.b2b_complete_document(uuid,uuid,text,text,date,date,text,date,text) from public, anon, authenticated;
grant execute on function public.b2b_complete_document(uuid,uuid,text,text,date,date,text,date,text) to service_role;

notify pgrst, 'reload schema';
commit;
