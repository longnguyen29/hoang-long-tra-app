-- One follow-up seven days after a newly created sample is first sent.
-- Existing shipments are deliberately not enrolled. All delivery writes stay server-only.
begin;

create table public.sample_followup_settings (
  id integer primary key default 1 check (id=1),
  enabled boolean not null default true,
  starts_at timestamptz not null default now(),
  default_channel text not null default 'sms' check (default_channel in ('sms','telegram')),
  updated_at timestamptz not null default now()
);
insert into public.sample_followup_settings(id) values(1);
alter table public.sample_followup_settings enable row level security;
revoke all on public.sample_followup_settings from public,anon,authenticated;
grant select on public.sample_followup_settings to authenticated;
grant all on public.sample_followup_settings to service_role;
create policy sample_followup_settings_staff_read on public.sample_followup_settings
  for select to authenticated using(public.is_staff());

alter table public.sample_requests add column sent_at timestamptz;
alter table public.orders add column sample_request_id text references public.sample_requests(id) on delete set null;
create index orders_sample_request_idx on public.orders(sample_request_id) where sample_request_id is not null;

create table public.sample_followups (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('sample_request','order')),
  source_id text not null,
  sample_request_id text references public.sample_requests(id) on delete set null,
  order_id text references public.orders(id) on delete set null,
  opportunity_id text references public.trade_opportunities(id) on delete set null,
  sent_at timestamptz not null,
  due_at timestamptz not null,
  channel text not null default 'sms' check (channel in ('sms','telegram')),
  status text not null default 'pending' check (status in ('pending','sending','queued','failed','replied','contacted','cancelled')),
  customer_name text not null default '',
  phone text not null default '',
  attempts integer not null default 0 check (attempts>=0),
  claim_token uuid,
  claimed_at timestamptz,
  retry_at timestamptz,
  provider_message_id text not null default '',
  provider_state text not null default '',
  last_error text not null default '',
  sms_queued_at timestamptz,
  telegram_notified_at timestamptz,
  telegram_claimed_at timestamptz,
  telegram_error text not null default '',
  notes text not null default '' check (length(notes)<=3000),
  resolved_at timestamptz,
  resolved_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_kind,source_id),
  check (due_at=sent_at+interval '7 days')
);
create index sample_followups_due_idx on public.sample_followups(status,due_at,retry_at)
  where status in ('pending','sending','failed');
create index sample_followups_sample_idx on public.sample_followups(sample_request_id);
create index sample_followups_order_idx on public.sample_followups(order_id);
create index sample_followups_opportunity_idx on public.sample_followups(opportunity_id);
alter table public.sample_followups enable row level security;
revoke all on public.sample_followups from public,anon,authenticated;
grant select on public.sample_followups to authenticated;
grant all on public.sample_followups to service_role;
create policy sample_followups_staff_read on public.sample_followups
  for select to authenticated using(public.is_staff());

-- A complete mobile number is required. Names/notes containing some digits are
-- never interpreted as a phone, and +84 / 0084 / 0 share one contact identity.
create function public.sample_followup_phone_key(p_value text) returns text
language plpgsql immutable set search_path=pg_catalog,public as $$
declare digits text;
begin
  if coalesce(trim(p_value),'') !~ '^\+?[0-9 ().-]+$' then return null; end if;
  digits:=regexp_replace(trim(p_value),'[^0-9]','','g');
  if digits like '0084%' then digits:=substr(digits,3); end if;
  if digits ~ '^84[35789][0-9]{8}$' then digits:='0'||substr(digits,3); end if;
  if digits !~ '^0[35789][0-9]{8}$' then return null; end if;
  return digits;
end $$;
revoke all on function public.sample_followup_phone_key(text) from public,anon,authenticated;

create function public.sample_followup_pure_sample(p_lines jsonb) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if jsonb_typeof(p_lines) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_lines)=0 then return false; end if;
  return not exists(
    select 1 from jsonb_array_elements(p_lines) item
    left join public.catalog_products product on product.id=coalesce(nullif(item->>'productId',''),item->>'product_id')
    where product.id is null or product.line<>'sample'
  );
end $$;
revoke all on function public.sample_followup_pure_sample(jsonb) from public,anon,authenticated;

-- Internal eligibility checks read the current source, rather than trusting a
-- saved name/number, a stale UI or a previous cron scan. No source row is edited.
create function public.sample_followup_stop_reason(p_followup public.sample_followups) returns text
language plpgsql security definer set search_path=pg_catalog,public as $$
declare sample public.sample_requests; shipment public.orders; phone_key text; opportunity_key text;
begin
  if p_followup.source_kind='sample_request' then
    select * into sample from public.sample_requests where id=p_followup.sample_request_id and id=p_followup.source_id;
    if not found then return 'source_removed'; end if;
    if sample.status in ('declined','converted') then return 'sample_'||sample.status; end if;
    if sample.status<>'sent' then return 'sample_not_sent'; end if;
    phone_key:=public.sample_followup_phone_key(sample.phone);
    opportunity_key:=sample.opportunity_id;
    if p_followup.order_id is not null then
      select * into shipment from public.orders where id=p_followup.order_id;
      if not found or shipment.sample_request_id is distinct from sample.id then return 'sample_order_link_changed'; end if;
      if phone_key is null or phone_key is distinct from public.sample_followup_phone_key(shipment.contact) then return 'linked_contact_mismatch'; end if;
      if not public.sample_followup_pure_sample(shipment.lines) then return 'order_not_pure_sample'; end if;
      if shipment.stage not in ('shipping','completed') and shipment.status not in ('shipped','completed') then return 'shipment_not_sent'; end if;
      if shipment.health in ('blocked','waiting') and shipment.waiting_on='carrier' then return 'delivery_problem'; end if;
    end if;
  else
    select * into shipment from public.orders where id=p_followup.order_id and id=p_followup.source_id;
    if not found then return 'source_removed'; end if;
    if shipment.sample_request_id is not null then return 'sample_ownership_changed'; end if;
    if not public.sample_followup_pure_sample(shipment.lines) then return 'order_not_pure_sample'; end if;
    if shipment.stage not in ('shipping','completed') and shipment.status not in ('shipped','completed') then return 'shipment_not_sent'; end if;
    if shipment.health in ('blocked','waiting') and shipment.waiting_on='carrier' then return 'delivery_problem'; end if;
    phone_key:=public.sample_followup_phone_key(shipment.contact);
    opportunity_key:=p_followup.opportunity_id;
  end if;
  -- A missing/foreign number is a sending failure, not a completed follow-up.
  -- Keep it available for correction or a Telegram-only staff reminder; the
  -- SMS worker independently requires a complete VN mobile before submission.
  if exists(select 1 from public.trade_opportunities o join public.discovery_prospects p on p.id=o.discovery_prospect_id
    where p.status='do_not_contact' and (o.id=opportunity_key or public.sample_followup_phone_key(o.contact)=phone_key))
    or exists(select 1 from public.discovery_prospects p where p.status='do_not_contact' and public.sample_followup_phone_key(p.contact)=phone_key)
    or exists(select 1 from public.discovery_contacts c join public.discovery_prospects p on p.id=c.prospect_id
      where p.status='do_not_contact' and c.kind='phone' and public.sample_followup_phone_key(c.value)=phone_key)
  then return 'do_not_contact'; end if;
  if exists(select 1 from public.trade_opportunities o where (o.id=opportunity_key or public.sample_followup_phone_key(o.contact)=phone_key)
    and o.stage in ('feedback','won','active','lost')) then return 'relationship_progressed'; end if;
  if exists(select 1 from public.discovery_activities a join public.trade_opportunities o on o.discovery_prospect_id=a.prospect_id
    where a.kind='feedback' and a.occurred_at>=p_followup.sent_at
      and (o.id=opportunity_key or public.sample_followup_phone_key(o.contact)=phone_key))
    or exists(select 1 from public.discovery_activities a join public.discovery_contacts c on c.prospect_id=a.prospect_id
      where a.kind='feedback' and a.occurred_at>=p_followup.sent_at and c.kind='phone' and public.sample_followup_phone_key(c.value)=phone_key)
    or exists(select 1 from public.recipe_versions v join public.recipes r on r.id=v.recipe_id
      where nullif(trim(v.customer_feedback),'') is not null and v.created_at>=p_followup.sent_at
        and (r.sample_request_id=p_followup.sample_request_id or (opportunity_key is not null and r.opportunity_id=opportunity_key)))
  then return 'feedback_received'; end if;
  if exists(select 1 from public.orders o
    where o.id is distinct from p_followup.order_id and o.ts>=p_followup.sent_at
      and (p_followup.sample_request_id is null or o.sample_request_id is distinct from p_followup.sample_request_id)
      and public.sample_followup_phone_key(o.contact)=phone_key
      and (o.status in ('confirmed','shipped','completed') or o.stage in ('confirm_details','prepare_materials','production','packing','shipping','completed'))
      and not public.sample_followup_pure_sample(o.lines)
      and (o.type='wholesale' or exists(
        select 1 from jsonb_array_elements(case when jsonb_typeof(o.lines)='array' then o.lines else '[]'::jsonb end) item
        join public.catalog_products product on product.id=coalesce(nullif(item->>'productId',''),item->>'product_id') where product.line<>'sample'
      ))) then return 'commercial_order_received'; end if;
  return '';
end $$;
revoke all on function public.sample_followup_stop_reason(public.sample_followups) from public,anon,authenticated;

create function public.refresh_sample_followup(p_id uuid) returns public.sample_followups
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result public.sample_followups; reason text; source_name text; source_phone text; source_opportunity text;
begin
  select * into result from public.sample_followups where id=p_id for update;
  if not found then return null; end if;
  if result.status in ('replied','contacted','cancelled') then return result; end if;
  reason:=public.sample_followup_stop_reason(result);
  if reason<>'' then
    update public.sample_followups set status='cancelled',resolved_at=now(),resolved_by='system',
      last_error=reason,claim_token=null,claimed_at=null,updated_at=now() where id=p_id returning * into result;
    return result;
  end if;
  if result.source_kind='sample_request' then
    select coalesce(nullif(trim(contact_name),''),store_name),phone,opportunity_id into source_name,source_phone,source_opportunity
      from public.sample_requests where id=result.sample_request_id;
  else
    select customer_name,contact into source_name,source_phone from public.orders where id=result.order_id;
    source_opportunity:=result.opportunity_id;
  end if;
  if source_opportunity is null then
    select case when count(*)=1 then min(id) else null end into source_opportunity from public.trade_opportunities
      where public.sample_followup_phone_key(contact)=public.sample_followup_phone_key(source_phone);
  end if;
  update public.sample_followups set customer_name=source_name,phone=source_phone,opportunity_id=source_opportunity,updated_at=now()
    where id=p_id returning * into result;
  return result;
end $$;
revoke all on function public.refresh_sample_followup(uuid) from public,anon,authenticated;

create function public.enroll_sample_followup(p_kind text,p_source_id text,p_order_id text,p_sent_at timestamptz) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare sample public.sample_requests; shipment public.orders; settings public.sample_followup_settings;
  source_name text; source_phone text; source_ts timestamptz; opportunity_key text; sample_key text; phone_key text; duplicate boolean;
begin
  select * into settings from public.sample_followup_settings where id=1;
  if p_kind='sample_request' then
    select * into sample from public.sample_requests where id=p_source_id;
    if not found or sample.status<>'sent' then return; end if;
    source_ts:=sample.ts; sample_key:=sample.id; source_phone:=sample.phone;
    source_name:=coalesce(nullif(trim(sample.contact_name),''),sample.store_name); opportunity_key:=sample.opportunity_id;
  elsif p_kind='order' then
    select * into shipment from public.orders where id=p_source_id;
    if not found or shipment.sample_request_id is not null or not public.sample_followup_pure_sample(shipment.lines) then return; end if;
    source_ts:=shipment.ts; source_phone:=shipment.contact; source_name:=shipment.customer_name;
  else return;
  end if;
  if source_ts<settings.starts_at or p_sent_at is null then return; end if;
  phone_key:=public.sample_followup_phone_key(source_phone);
  if opportunity_key is null and phone_key is not null then
    select case when count(*)=1 then min(id) else null end into opportunity_key from public.trade_opportunities
      where public.sample_followup_phone_key(contact)=phone_key;
  end if;
  if opportunity_key is not null and not exists(select 1 from public.sample_followups where source_kind=p_kind and source_id=p_source_id) then
    -- Keep the established prospect -> opportunity lock order, before taking the
    -- enrollment/contact lock. Staff-authored next actions retain their content/date.
    perform p.id from public.discovery_prospects p join public.trade_opportunities o on o.discovery_prospect_id=p.id
      where o.id=opportunity_key for update of p;
    update public.trade_opportunities set stage='sample_sent',
      next_action=case when next_action in ('','Xác nhận và chuẩn bị bộ mẫu','Xác nhận và gửi mẫu','Liên hệ và xác nhận nhu cầu') then 'Hỏi phản hồi sau khi thử trà' else next_action end,
      next_action_at=case when next_action in ('','Xác nhận và chuẩn bị bộ mẫu','Xác nhận và gửi mẫu','Liên hệ và xác nhận nhu cầu') then p_sent_at+interval '7 days' else next_action_at end,
      updated_at=now() where id=opportunity_key and stage in ('lead','sample_requested');
  end if;
  -- Serialize same-contact enrollments. An explicit duplicate still gets a
  -- cancelled audit row, so moving its source backwards/forwards cannot enroll it later.
  if phone_key is not null then perform pg_advisory_xact_lock(hashtextextended('sample-followup:'||phone_key,0)); end if;
  duplicate:=phone_key is not null and exists(select 1 from public.sample_followups q
    where public.sample_followup_phone_key(q.phone)=phone_key and q.sent_at>=p_sent_at-interval '7 days'
      and q.sent_at<=p_sent_at and q.status in ('pending','sending','queued','failed')
      and (q.source_kind,q.source_id) is distinct from (p_kind,p_source_id));
  insert into public.sample_followups(source_kind,source_id,sample_request_id,order_id,opportunity_id,sent_at,due_at,
    channel,status,customer_name,phone,last_error,resolved_at,resolved_by)
  values(p_kind,p_source_id,sample_key,p_order_id,opportunity_key,p_sent_at,p_sent_at+interval '7 days',
    settings.default_channel,case when duplicate then 'cancelled' else 'pending' end,source_name,source_phone,
    case when duplicate then 'duplicate_active_contact' else '' end,case when duplicate then now() end,
    case when duplicate then 'system' else '' end)
  on conflict(source_kind,source_id) do nothing;
end $$;
revoke all on function public.enroll_sample_followup(text,text,text,timestamptz) from public,anon,authenticated;

create function public.stamp_sample_sent_at() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if TG_OP='INSERT' then
    new.sent_at:=case when new.status='sent' then now() else null end;
  elsif old.sent_at is not null then new.sent_at:=old.sent_at;
  elsif new.status='sent' and old.status is distinct from 'sent' then new.sent_at:=now();
  else new.sent_at:=null;
  end if;
  return new;
end $$;
create trigger stamp_sample_sent_at before insert or update on public.sample_requests
  for each row execute function public.stamp_sample_sent_at();

create function public.guard_sample_order_link() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare sample_phone text;
begin
  if TG_OP='UPDATE' and new.sample_request_id is distinct from old.sample_request_id
    and (old.stage in ('shipping','completed') or old.status in ('shipped','completed')
      or exists(select 1 from public.sample_followups where order_id=old.id))
    and (new.sample_request_id is not null or exists(select 1 from public.sample_requests where id=old.sample_request_id))
  then raise exception 'sample_link_immutable_after_shipping'; end if;
  if new.sample_request_id is not null then
    select phone into sample_phone from public.sample_requests where id=new.sample_request_id;
    if not found or public.sample_followup_phone_key(new.contact) is null
      or public.sample_followup_phone_key(new.contact) is distinct from public.sample_followup_phone_key(sample_phone)
    then raise exception 'sample_order_contact_mismatch'; end if;
  end if;
  return new;
end $$;
create trigger guard_sample_order_link before insert or update of sample_request_id,contact on public.orders
  for each row execute function public.guard_sample_order_link();

create function public.handle_sample_followup_source() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare followup_id uuid; shipment_sample public.sample_requests; settings public.sample_followup_settings;
  first_shipping boolean; sent_time timestamptz;
begin
  if TG_TABLE_NAME='sample_requests' then
    if new.status='sent' and new.sent_at is not null then
      if TG_OP='INSERT' or old.sent_at is null then
        perform public.enroll_sample_followup('sample_request',new.id,null,new.sent_at);
      end if;
    end if;
    for followup_id in select id from public.sample_followups where sample_request_id=new.id and status not in ('replied','contacted','cancelled') loop
      perform public.refresh_sample_followup(followup_id);
    end loop;
  else
    first_shipping:=new.stage='shipping' or new.status='shipped';
    if TG_OP='UPDATE' then first_shipping:=first_shipping and old.stage not in ('shipping','completed') and old.status not in ('shipped','completed'); end if;
    select * into settings from public.sample_followup_settings where id=1;
    if first_shipping and new.ts>=settings.starts_at and public.sample_followup_pure_sample(new.lines) then
      if new.sample_request_id is not null then
        select * into shipment_sample from public.sample_requests where id=new.sample_request_id;
        if shipment_sample.ts>=settings.starts_at and shipment_sample.status in ('new','sent') then
          if shipment_sample.status='new' then
            -- The existing sample DNC guard still applies to this first send.
            update public.sample_requests set status='sent',unread=false where id=shipment_sample.id returning * into shipment_sample;
          end if;
          sent_time:=shipment_sample.sent_at;
          if sent_time is not null then
            perform public.enroll_sample_followup('sample_request',shipment_sample.id,new.id,sent_time);
            update public.sample_followups set order_id=new.id,updated_at=now()
              where source_kind='sample_request' and source_id=shipment_sample.id and order_id is null;
          end if;
        end if;
      else perform public.enroll_sample_followup('order',new.id,new.id,now());
      end if;
    end if;
    for followup_id in select id from public.sample_followups
      where status not in ('replied','contacted','cancelled') and (order_id=new.id or public.sample_followup_phone_key(phone)=public.sample_followup_phone_key(new.contact)) loop
      perform public.refresh_sample_followup(followup_id);
    end loop;
  end if;
  return new;
end $$;
create trigger sample_followup_sample_source after insert or update on public.sample_requests
  for each row execute function public.handle_sample_followup_source();
create trigger sample_followup_order_source after insert or update on public.orders
  for each row execute function public.handle_sample_followup_source();

create function public.handle_sample_followup_relationship() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare followup_id uuid; recipe public.recipes;
begin
  if TG_TABLE_NAME='trade_opportunities' then
    for followup_id in select id from public.sample_followups where status not in ('replied','contacted','cancelled')
      and (opportunity_id=new.id or public.sample_followup_phone_key(phone)=public.sample_followup_phone_key(new.contact)) loop
      perform public.refresh_sample_followup(followup_id);
    end loop;
  elsif TG_TABLE_NAME='discovery_prospects' then
    for followup_id in select q.id from public.sample_followups q where q.status not in ('replied','contacted','cancelled') and (
      q.opportunity_id in (select id from public.trade_opportunities where discovery_prospect_id=new.id)
      or public.sample_followup_phone_key(q.phone)=public.sample_followup_phone_key(new.contact)
      or exists(select 1 from public.discovery_contacts c where c.prospect_id=new.id and c.kind='phone'
        and public.sample_followup_phone_key(c.value)=public.sample_followup_phone_key(q.phone))) loop
      perform public.refresh_sample_followup(followup_id);
    end loop;
  elsif TG_TABLE_NAME='discovery_contacts' then
    if new.kind<>'phone' then return new; end if;
    for followup_id in select id from public.sample_followups where status not in ('replied','contacted','cancelled')
      and public.sample_followup_phone_key(phone)=public.sample_followup_phone_key(new.value) loop
      perform public.refresh_sample_followup(followup_id);
    end loop;
  elsif TG_TABLE_NAME='discovery_activities' then
    if new.kind<>'feedback' then return new; end if;
    for followup_id in select q.id from public.sample_followups q where q.status not in ('replied','contacted','cancelled') and (
      q.opportunity_id in (select id from public.trade_opportunities where discovery_prospect_id=new.prospect_id)
      or exists(select 1 from public.discovery_contacts c where c.prospect_id=new.prospect_id and c.kind='phone'
        and public.sample_followup_phone_key(c.value)=public.sample_followup_phone_key(q.phone))) loop
      perform public.refresh_sample_followup(followup_id);
    end loop;
  elsif TG_TABLE_NAME='recipe_versions' then
    if nullif(trim(new.customer_feedback),'') is null then return new; end if;
    select * into recipe from public.recipes where id=new.recipe_id;
    for followup_id in select id from public.sample_followups where status not in ('replied','contacted','cancelled')
      and (sample_request_id=recipe.sample_request_id or opportunity_id=recipe.opportunity_id) loop
      perform public.refresh_sample_followup(followup_id);
    end loop;
  end if;
  return new;
end $$;
create trigger sample_followup_opportunity_stop after update of stage,contact,discovery_prospect_id on public.trade_opportunities
  for each row execute function public.handle_sample_followup_relationship();
create trigger sample_followup_prospect_stop after update of status,contact on public.discovery_prospects
  for each row execute function public.handle_sample_followup_relationship();
create trigger sample_followup_contact_stop after insert or update of kind,value on public.discovery_contacts
  for each row execute function public.handle_sample_followup_relationship();
create trigger sample_followup_feedback_stop after insert or update of kind,occurred_at on public.discovery_activities
  for each row execute function public.handle_sample_followup_relationship();
create trigger sample_followup_recipe_feedback_stop after insert or update of customer_feedback on public.recipe_versions
  for each row execute function public.handle_sample_followup_relationship();

create function public.update_sample_followup_settings(p_enabled boolean,p_default_channel text default null)
returns public.sample_followup_settings language plpgsql security definer set search_path=pg_catalog,public as $$
declare result public.sample_followup_settings;
begin
  if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
  if p_enabled is null or (p_default_channel is not null and p_default_channel not in ('sms','telegram')) then raise exception 'invalid_followup_settings'; end if;
  update public.sample_followup_settings set enabled=p_enabled,default_channel=coalesce(p_default_channel,default_channel),updated_at=now()
    where id=1 returning * into result;
  return result;
end $$;
revoke all on function public.update_sample_followup_settings(boolean,text) from public,anon;
grant execute on function public.update_sample_followup_settings(boolean,text) to authenticated;

create function public.update_sample_followup(p_id uuid,p_action text,p_note text default '',p_channel text default null)
returns public.sample_followups language plpgsql security definer set search_path=pg_catalog,public as $$
declare result public.sample_followups; new_notes text; prospect_key uuid; previous_status text;
begin
  if auth.uid() is null or not public.is_staff() then raise exception 'staff_required'; end if;
  if p_action is null or p_action not in ('replied','contacted','cancelled','channel','note','retry')
    or length(coalesce(p_note,''))>2000 or (p_channel is not null and p_channel not in ('sms','telegram')) then raise exception 'invalid_followup_action'; end if;
  if p_action='replied' then
    perform p.id from public.discovery_prospects p join public.trade_opportunities o on o.discovery_prospect_id=p.id
      join public.sample_followups q on q.opportunity_id=o.id where q.id=p_id for update of p;
  end if;
  result:=public.refresh_sample_followup(p_id);
  if result.id is null then raise exception 'followup_not_found'; end if;
  previous_status:=result.status;
  if result.status='sending' and p_action<>'note' and (
      result.claimed_at>now()-interval '20 minutes' or result.last_error not in ('receipt_unconfirmed','submission_uncertain'))
    then raise exception 'followup_sending_locked'; end if;
  new_notes:=result.notes;
  if nullif(trim(p_note),'') is not null then
    new_notes:=concat_ws(E'\n',nullif(new_notes,''),to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD HH24:MI')||' · '||trim(p_note));
  end if;
  if length(new_notes)>3000 then raise exception 'followup_notes_too_long'; end if;
  if p_action='note' and nullif(trim(p_note),'') is null then raise exception 'followup_note_required'; end if;
  if p_action='channel' then
    if p_channel is null or result.status not in ('pending','failed') then raise exception 'followup_channel_locked'; end if;
    if result.last_error in ('receipt_unconfirmed','submission_uncertain') or result.sms_queued_at is not null then raise exception 'followup_manual_check_required'; end if;
    update public.sample_followups set channel=p_channel,notes=new_notes,updated_at=now() where id=p_id returning * into result;
  elsif p_action='retry' then
    if result.status<>'failed' or result.sms_queued_at is not null or result.last_error in ('receipt_unconfirmed','submission_uncertain')
      then raise exception 'followup_retry_locked'; end if;
    update public.sample_followups set status='pending',attempts=0,retry_at=now(),claim_token=null,claimed_at=null,last_error='',notes=new_notes,updated_at=now()
      where id=p_id returning * into result;
  elsif p_action='note' then
    update public.sample_followups set notes=new_notes,updated_at=now() where id=p_id returning * into result;
  else
    if result.status in ('replied','contacted','cancelled') and result.status<>p_action then raise exception 'followup_already_resolved'; end if;
    update public.sample_followups set status=p_action,notes=new_notes,resolved_at=coalesce(resolved_at,now()),
      resolved_by=auth.uid()::text,claim_token=null,claimed_at=null,updated_at=now() where id=p_id returning * into result;
    if p_action='replied' and previous_status<>'replied' and result.opportunity_id is not null then
      update public.trade_opportunities set stage='feedback',
        next_action=case when next_action='Hỏi phản hồi sau khi thử trà' then '' else next_action end,
        next_action_at=case when next_action='Hỏi phản hồi sau khi thử trà' then null else next_action_at end,
        updated_at=now() where id=result.opportunity_id and stage='sample_sent';
      select discovery_prospect_id into prospect_key from public.trade_opportunities where id=result.opportunity_id;
      if prospect_key is not null then
        insert into public.discovery_activities(id,prospect_id,kind,body)
          values(gen_random_uuid(),prospect_key,'feedback',coalesce(nullif(trim(p_note),''),'Đã ghi nhận khách phản hồi mẫu: '||result.source_id));
      end if;
    end if;
  end if;
  return result;
end $$;
revoke all on function public.update_sample_followup(uuid,text,text,text) from public,anon;
grant execute on function public.update_sample_followup(uuid,text,text,text) to authenticated;

create function public.claim_sample_followup(p_id uuid,p_now timestamptz default now())
returns setof public.sample_followups language plpgsql security definer set search_path=pg_catalog,public as $$
declare result public.sample_followups;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  if p_now is null or not exists(select 1 from public.sample_followup_settings where id=1 and enabled) then return; end if;
  result:=public.refresh_sample_followup(p_id);
  if result.id is null or result.channel<>'sms' or result.due_at>p_now or result.attempts>=3
    or result.status not in ('pending','failed','sending') or result.sms_queued_at is not null
    or result.last_error in ('receipt_unconfirmed','submission_uncertain')
    or (result.retry_at is not null and result.retry_at>p_now)
    or (result.status='sending' and result.claimed_at is not null and result.claimed_at>p_now-interval '20 minutes') then return; end if;
  return query update public.sample_followups set status='sending',claim_token=gen_random_uuid(),claimed_at=p_now,
    retry_at=p_now+interval '3 hours',attempts=attempts+1,last_error='',updated_at=now() where id=p_id returning *;
end $$;
revoke all on function public.claim_sample_followup(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_sample_followup(uuid,timestamptz) to service_role;

create function public.validate_sample_followup(p_id uuid,p_claim_token uuid)
returns setof public.sample_followups language plpgsql security definer set search_path=pg_catalog,public as $$
declare result public.sample_followups;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  if not exists(select 1 from public.sample_followup_settings where id=1 and enabled) then return; end if;
  result:=public.refresh_sample_followup(p_id);
  if p_claim_token is not null and result.id is not null and result.claim_token=p_claim_token and result.status='sending'
    and result.channel='sms' and result.due_at<=now() and result.sms_queued_at is null
    and result.claimed_at>=now()-interval '20 minutes' and result.last_error not in ('receipt_unconfirmed','submission_uncertain')
  then return next result; end if;
end $$;
revoke all on function public.validate_sample_followup(uuid,uuid) from public,anon,authenticated;
grant execute on function public.validate_sample_followup(uuid,uuid) to service_role;

create function public.claim_sample_followup_telegram(p_id uuid,p_now timestamptz default now())
returns setof public.sample_followups language plpgsql security definer set search_path=pg_catalog,public as $$
declare result public.sample_followups;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  if p_now is null or not exists(select 1 from public.sample_followup_settings where id=1 and enabled) then return; end if;
  result:=public.refresh_sample_followup(p_id);
  if result.id is null or result.status in ('replied','contacted','cancelled') or result.due_at>p_now
    or result.telegram_notified_at is not null or result.telegram_claimed_at is not null
    or (result.status='sending' and result.claimed_at>p_now-interval '20 minutes') then return; end if;
  -- No automatic lease reclaim: an uncertain Telegram response must not create
  -- a second result notification. The worker retains this claim on uncertainty.
  return query update public.sample_followups set telegram_claimed_at=p_now,telegram_error='',updated_at=now()
    where id=p_id returning *;
end $$;
revoke all on function public.claim_sample_followup_telegram(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_sample_followup_telegram(uuid,timestamptz) to service_role;

-- Trigger functions and internal helpers must not become callable mutation APIs.
revoke all on function public.stamp_sample_sent_at(),public.guard_sample_order_link(),public.handle_sample_followup_source(),public.handle_sample_followup_relationship() from public,anon,authenticated;
commit;
