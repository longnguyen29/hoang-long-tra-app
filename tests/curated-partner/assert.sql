\set ON_ERROR_STOP on
-- No product is reclassified or hidden by installation.
do $$begin if not (select available and not curated_partner_required from public.catalog_products where id='house') then raise exception 'legacy changed'; end if; end$$;
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$begin
 begin insert into public.catalog_products(id,kind,vendor_id,batch,available,curated_partner_required) values ('direct-staff','tea','v','B01',false,true); raise exception 'unprivileged classification insert succeeded'; exception when others then if sqlerrm<>'manager_required' then raise; end if; end;
 begin update public.catalog_products set curated_partner_required=true where id='partner'; raise exception 'unprivileged classification succeeded'; exception when others then if sqlerrm<>'manager_required' then raise; end if; end;
 begin perform public.register_curated_tea_product('partner'); raise exception 'unprivileged register succeeded'; exception when others then if sqlerrm<>'manager_required' then raise; end if; end;
 begin insert into public.curated_tea_reviews(product_id,decision,reviewed_by) values ('partner','withdrawn',auth.uid()); raise exception 'direct write succeeded'; exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.catalog_products(id,kind,vendor_id,batch,available,curated_partner_required) values ('direct-manager','tea','v','B01',false,true);
select public.register_curated_tea_product('partner');
do $$begin
 if not (select curated_partner_required and not available from public.catalog_products where id='partner') then raise exception 'registration state wrong'; end if;
 begin update public.catalog_products set curated_partner_required=false where id='partner'; raise exception 'unregistration succeeded'; exception when others then if sqlerrm<>'curated_partner_classification_immutable' then raise; end if; end;
 begin update public.catalog_products set available=true where id='partner'; raise exception 'unapproved enable succeeded'; exception when others then if sqlerrm<>'curated_partner_not_approved' then raise; end if; end;
 begin perform public.set_curated_tea_review('partner','b1','approved',current_date,'Huong tra',false,true,'Nha lam tra','Nha san xuat','B01',(select max(id) from public.curated_tea_reviews where product_id='partner')); raise exception 'unattested approved'; exception when others then if sqlerrm<>'tasting_attestation_required' then raise; end if; end;
 begin perform public.set_curated_tea_review('partner','b1','approved',current_date,'Huong tra',true,false,'Nha lam tra','Nha san xuat','B01',(select max(id) from public.curated_tea_reviews where product_id='partner')); raise exception 'identity permission missing'; exception when others then if sqlerrm<>'tasting_attestation_required' then raise; end if; end;
 begin perform public.set_curated_tea_review('partner','b1','approved',current_date+1,'Huong tra',true,true,'Nha lam tra','Nha san xuat','B01',(select max(id) from public.curated_tea_reviews where product_id='partner')); raise exception 'future approved'; exception when others then if sqlerrm<>'tasting_attestation_required' then raise; end if; end;
end$$;
-- Supplier-only profiles can remain inactive in the existing public-vendor directory.
update public.vendors set active=false where id='v';
select public.set_curated_tea_review('partner','b1','approved',current_date,'Hương trà mẫu',true,true,'Nha lam tra','Nha san xuat','B01',(select max(id) from public.curated_tea_reviews where product_id='partner'));
update public.catalog_products set available=true where id='partner';
reset role;
set role anon;
do $$begin
 if (select count(*) from public.list_public_curated_teas())<>1 then raise exception 'public projection missing approved'; end if;
 if (select supplier_name from public.list_public_curated_teas() limit 1)<>'Nha lam tra' then raise exception 'supplier wrong'; end if;
 begin perform public.list_curated_tea_admin(); raise exception 'anon admin allowed'; exception when insufficient_privilege then null; end;
end$$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
-- A batch status change withdraws the tasting decision, including after release.
update public.tea_batches set status='held' where id='b1';
update public.tea_batches set status='released' where id='b1';
do $$begin
 if (select available from public.catalog_products where id='partner') then raise exception 'held batch remained available'; end if;
 begin update public.catalog_products set available=true where id='partner'; raise exception 'stale decision reenabled'; exception when others then if sqlerrm<>'curated_partner_not_approved' then raise; end if; end;
end$$;
select public.set_curated_tea_review('partner','b1','approved',current_date,'Huong tra',true,true,'Nha lam tra','Nha san xuat','B01',(select max(id) from public.curated_tea_reviews where product_id='partner'));
update public.catalog_products set available=true where id='partner';
update public.vendors set name='Nha doi ten' where id='v';
do $$begin
 if (select available from public.catalog_products where id='partner') then raise exception 'supplier change remained available'; end if;
 begin update public.catalog_products set available=true where id='partner'; raise exception 'supplier old approval reenabled'; exception when others then if sqlerrm<>'curated_partner_not_approved' then raise; end if; end;
end$$;
do $$begin
 begin perform public.set_curated_tea_review('partner','b1','approved',current_date,'Huong tra',true,true,'Nha lam tra','Nha san xuat','B01',(select max(id) from public.curated_tea_reviews where product_id='partner')); raise exception 'stale supplier accepted'; exception when others then if sqlerrm<>'reference_changed_reload' then raise; end if; end;
end$$;
select public.set_curated_tea_review('partner','b1','approved',current_date,'Huong tra',true,true,'Nha doi ten','Nha san xuat','B01',(select max(id) from public.curated_tea_reviews where product_id='partner'));
update public.catalog_products set available=true where id='partner';
select public.set_curated_tea_review('partner',null,'withdrawn',null,'',false,false,null,null,null,(select max(id) from public.curated_tea_reviews where product_id='partner'));
do $$begin
 begin perform public.set_curated_tea_review('partner','b1','approved',current_date,'old retry',true,true,'Nha doi ten','Nha san xuat','B01',null); raise exception 'stale retry accepted'; exception when others then if sqlerrm<>'stale_curation_decision' then raise; end if; end;
 if (select available from public.catalog_products where id='partner') then raise exception 'withdraw did not hide'; end if;
 if jsonb_array_length(public.list_curated_tea_admin()->'reviews')<6 then raise exception 'history missing'; end if;
end$$;
reset role;
-- Current decision for a quiet product remains visible even beyond the recent-history cap.
insert into public.curated_tea_reviews(product_id,decision,reviewed_by) select 'house','withdrawn','11111111-1111-4111-8111-111111111111'::uuid from generate_series(1,205);
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$begin if not exists(select 1 from jsonb_array_elements(public.list_curated_tea_admin()->'reviews') r where r->>'product_id'='partner') then raise exception 'quiet product current decision missing'; end if; end$$;
reset role;
select 'PASS: curation authorization, review, public projection, withdrawal and change invalidation' as result;
