-- Curated partner teas; no existing SKUs, prices or inventory are altered.
-- Registered partner SKUs require an explicit, lot-specific manager decision.
begin;

alter table public.catalog_products add column curated_partner_required boolean not null default false;

create table public.curated_tea_reviews (
  id bigint generated always as identity primary key,
  product_id text not null references public.catalog_products(id) on delete restrict,
  batch_id text references public.tea_batches(id) on delete restrict,
  decision text not null check(decision in ('approved','withdrawn')),
  tasted_on date,
  tasting_attested boolean not null default false,
  publish_identity_attested boolean not null default false,
  supplier_name_snapshot text,
  producer_name_snapshot text,
  batch_code_snapshot text,
  public_note text not null default '' check(length(public_note)<=1000),
  reviewed_by uuid references auth.users(id) on delete restrict,
  system_reason text check(system_reason is null or system_reason in ('reference_changed','supplier_changed','product_changed')),
  reviewed_at timestamptz not null default now(),
  check(decision <> 'approved' or (batch_id is not null and tasted_on is not null and tasting_attested and publish_identity_attested and length(btrim(coalesce(supplier_name_snapshot,'')))>0 and length(btrim(coalesce(producer_name_snapshot,'')))>0 and length(btrim(coalesce(batch_code_snapshot,'')))>0 and length(btrim(public_note)) between 1 and 1000))
);
create index curated_tea_reviews_product_latest_idx on public.curated_tea_reviews(product_id,id desc);
alter table public.curated_tea_reviews enable row level security;
revoke all on public.curated_tea_reviews from public,anon,authenticated;
grant select on public.curated_tea_reviews to authenticated;
create policy curated_tea_manager_read on public.curated_tea_reviews for select to authenticated using (public.is_staff_manager());

-- This predicate is private, takes no user-controlled evidence and checks the
-- latest decision. The product's batch is a tasting reference, not allocation.
create function public.curated_tea_eligible(p_product_id text) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists (
   select 1 from public.catalog_products p
   join public.vendors v on v.id=p.vendor_id
   join lateral (select r.* from public.curated_tea_reviews r where r.product_id=p.id order by r.id desc limit 1) r on r.decision='approved'
   join public.tea_batches b on b.id=r.batch_id and b.product_id=p.id
   where p.id=p_product_id and p.curated_partner_required and p.kind='tea'
     and length(btrim(v.name))>0 and b.status='released'
     and b.code=p.batch and b.code=r.batch_code_snapshot and b.producer=r.producer_name_snapshot and v.name=r.supplier_name_snapshot and length(btrim(b.producer))>0
 );
$$;
revoke all on function public.curated_tea_eligible(text) from public,anon,authenticated;

-- Classification is irreversible through ordinary catalogue updates. Existing
-- unregistered SKUs keep their previous behavior. An unreviewed registered SKU
-- cannot be made available via any catalogue write path.
create function public.guard_curated_partner_product() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op='DELETE' then
   if old.curated_partner_required then raise exception 'curated_partner_delete_forbidden'; end if;
   return old;
 end if;
 if tg_op='UPDATE' and old.curated_partner_required and not new.curated_partner_required then
   raise exception 'curated_partner_classification_immutable';
 end if;
 if new.curated_partner_required and (tg_op='INSERT' or not old.curated_partner_required)
    and (auth.uid() is null or not public.is_staff_manager()) then
   raise exception 'manager_required';
 end if;
 if new.curated_partner_required then
   if tg_op='UPDATE' and old.curated_partner_required and
      (new.vendor_id is distinct from old.vendor_id or new.batch is distinct from old.batch or new.kind is distinct from old.kind) then
     new.available:=false;
     insert into public.curated_tea_reviews(product_id,decision,reviewed_by,system_reason)
       select old.id,'withdrawn',auth.uid(),'product_changed'
       where (select r.decision from public.curated_tea_reviews r where r.product_id=old.id order by r.id desc limit 1)='approved';
   end if;
   if new.available and (tg_op='INSERT' or not public.curated_tea_eligible(new.id)) then
     raise exception 'curated_partner_not_approved';
   end if;
 end if;
 return new;
end $$;
create trigger curated_product_guard before insert or update or delete on public.catalog_products
for each row execute function public.guard_curated_partner_product();

-- Invalidate a listed product when the approved reference batch or supplier
-- changes. This does not adjust stock, price or existing orders.
create function public.invalidate_curated_batch() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.status is distinct from old.status or new.code is distinct from old.code
    or new.product_id is distinct from old.product_id or new.producer is distinct from old.producer
    or new.origin is distinct from old.origin or new.process is distinct from old.process
    or new.cultivar is distinct from old.cultivar or new.harvest_date is distinct from old.harvest_date
    or new.season is distinct from old.season or new.grade is distinct from old.grade then
   -- Lock affected product rows before writing invalidations, including hidden
   -- products; a later re-enable must require a new tasting decision.
   update public.catalog_products p set available=false
    where p.curated_partner_required and exists
      (select 1 from public.curated_tea_reviews r where r.product_id=p.id and r.batch_id=old.id and r.id=(select max(r2.id) from public.curated_tea_reviews r2 where r2.product_id=p.id));
   insert into public.curated_tea_reviews(product_id,decision,reviewed_by,system_reason)
    select p.id,'withdrawn',auth.uid(),'reference_changed' from public.catalog_products p
     where p.curated_partner_required and exists
       (select 1 from public.curated_tea_reviews r where r.product_id=p.id and r.batch_id=old.id and r.decision='approved' and r.id=(select max(r2.id) from public.curated_tea_reviews r2 where r2.product_id=p.id));
 end if;
 return new;
end $$;
create trigger curated_batch_invalidate after update on public.tea_batches
for each row execute function public.invalidate_curated_batch();

create function public.invalidate_curated_vendor() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if (old.active and not new.active) or new.name is distinct from old.name then
   update public.catalog_products p set available=false where p.curated_partner_required and p.vendor_id=old.id;
   insert into public.curated_tea_reviews(product_id,decision,reviewed_by,system_reason)
    select p.id,'withdrawn',auth.uid(),'supplier_changed' from public.catalog_products p
     where p.curated_partner_required and p.vendor_id=old.id and
       (select r.decision from public.curated_tea_reviews r where r.product_id=p.id order by r.id desc limit 1)='approved';
 end if;
 return new;
end $$;
create trigger curated_vendor_invalidate after update on public.vendors
for each row execute function public.invalidate_curated_vendor();

create function public.register_curated_tea_product(p_product_id text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.catalog_products;
begin
 if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
 select * into p from public.catalog_products where id=p_product_id for update;
 if not found then raise exception 'product_not_found'; end if;
 if p.curated_partner_required then return; end if;
 if p.kind<>'tea' or p.vendor_id is null then raise exception 'partner_tea_requires_supplier'; end if;
 update public.catalog_products set available=false,curated_partner_required=true where id=p.id;
end $$;
revoke all on function public.register_curated_tea_product(text) from public,anon;
grant execute on function public.register_curated_tea_product(text) to authenticated;

create function public.set_curated_tea_review(p_product_id text,p_batch_id text,p_decision text,p_tasted_on date,p_public_note text,p_attested boolean,p_publish_identity boolean,p_expected_supplier_name text,p_expected_producer_name text,p_expected_batch_code text,p_expected_latest_review_id bigint) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.catalog_products; b public.tea_batches; v public.vendors; v_latest_id bigint;
begin
 if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
 if p_decision is null or p_decision not in ('approved','withdrawn') then raise exception 'invalid_decision'; end if;
 select * into p from public.catalog_products where id=p_product_id for update;
 if not found or not p.curated_partner_required then raise exception 'partner_tea_not_registered'; end if;
 select id into v_latest_id from public.curated_tea_reviews where product_id=p.id order by id desc limit 1;
 if v_latest_id is distinct from p_expected_latest_review_id then raise exception 'stale_curation_decision'; end if;
 if p_decision='approved' then
   if p_attested is distinct from true or p_publish_identity is distinct from true or p_tasted_on is null or p_tasted_on>(now() at time zone 'Asia/Ho_Chi_Minh')::date or
      length(btrim(coalesce(p_public_note,''))) not between 1 and 1000 then raise exception 'tasting_attestation_required'; end if;
   -- Lock reference rows until the decision commits. Concurrent source edits
   -- may deadlock with their invalidation trigger; PostgreSQL then aborts
   -- one transaction safely, and the caller can reload and retry.
   select * into b from public.tea_batches where id=p_batch_id for share;
   select * into v from public.vendors where id=p.vendor_id for share;
   if b.id is null or b.product_id is distinct from p.id or b.status<>'released' or b.code is distinct from p.batch
      or length(btrim(coalesce(b.producer,'')))=0 or v.id is null or length(btrim(v.name))=0 then
      raise exception 'reference_batch_not_ready'; end if;
   if v.name is distinct from p_expected_supplier_name or b.producer is distinct from p_expected_producer_name or b.code is distinct from p_expected_batch_code then
      raise exception 'reference_changed_reload'; end if;
   insert into public.curated_tea_reviews(product_id,batch_id,decision,tasted_on,tasting_attested,publish_identity_attested,supplier_name_snapshot,producer_name_snapshot,batch_code_snapshot,public_note,reviewed_by)
    values(p.id,b.id,'approved',p_tasted_on,true,true,v.name,b.producer,b.code,btrim(p_public_note),auth.uid());
 else
   insert into public.curated_tea_reviews(product_id,decision,reviewed_by) values(p.id,'withdrawn',auth.uid());
   update public.catalog_products set available=false where id=p.id and available;
 end if;
end $$;
revoke all on function public.set_curated_tea_review(text,text,text,date,text,boolean,boolean,text,text,text,bigint) from public,anon;
grant execute on function public.set_curated_tea_review(text,text,text,date,text,boolean,boolean,text,text,text,bigint) to authenticated;

create function public.list_curated_tea_admin() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
 return jsonb_build_object(
   'products',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'supplier_name',v.name,'batch',p.batch,'available',p.available,'curated_partner_required',p.curated_partner_required) order by p.id) from public.catalog_products p left join public.vendors v on v.id=p.vendor_id where p.kind='tea' and p.vendor_id is not null),'[]'::jsonb),
   'batches',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'product_id',b.product_id,'code',b.code,'status',b.status,'producer',b.producer) order by b.code) from public.tea_batches b where b.product_id is not null),'[]'::jsonb),
   'reviews',coalesce((select jsonb_agg(to_jsonb(q) order by q.id desc) from (select r.id,r.product_id,r.batch_id,r.decision,r.tasted_on,r.public_note,r.reviewed_at,r.system_reason from public.curated_tea_reviews r where r.id in (select recent.id from (select id from public.curated_tea_reviews order by id desc limit 200) recent union select latest.id from (select distinct on(product_id) id from public.curated_tea_reviews order by product_id,id desc) latest)) q),'[]'::jsonb)
 );
end $$;
revoke all on function public.list_curated_tea_admin() from public,anon;
grant execute on function public.list_curated_tea_admin() to authenticated;

create function public.list_public_curated_teas() returns table(product_id text,batch_code text,producer_name text,supplier_name text,tasted_on date,public_note text)
language sql stable security definer set search_path=pg_catalog,public as $$
 select p.id,r.batch_code_snapshot,r.producer_name_snapshot,r.supplier_name_snapshot,r.tasted_on,r.public_note
 from public.catalog_products p
 join public.vendors v on v.id=p.vendor_id
 join lateral (select x.* from public.curated_tea_reviews x where x.product_id=p.id order by x.id desc limit 1) r on r.decision='approved'
 join public.tea_batches b on b.id=r.batch_id and b.product_id=p.id
 where p.available and public.curated_tea_eligible(p.id)
 order by p.id;
$$;
revoke all on function public.list_public_curated_teas() from public;
grant execute on function public.list_public_curated_teas() to anon,authenticated;
commit;
