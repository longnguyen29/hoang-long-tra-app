-- Run only after fixture + migration 0096 in a disposable PostgreSQL cluster.
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);

select public.test_assert((select count(*) between 20 and 35 from public.product_development_projects), 'initial concepts form the requested small milestone');
select public.test_assert((select bool_and(public_availability = 'hidden' and lifecycle_stage not in ('approved_for_production','production','ready_for_sale','live')) from public.product_development_projects), 'all seeded research stays hidden and uncommitted');
select public.test_assert((select count(*) = 3 from public.product_development_projects where category_code in ('D','H','K') and kind = 'category_research' and lifecycle_stage = 'research'), 'pending categories remain research records');
select public.test_assert((select count(*) = 6 and bool_and(status = 'lead' and accepts_customer_tea is null and minimum_order_quantity is null and estimated_unit_cost is null and sample_cost is null and lead_time is null) from public.supplier_profiles), 'six unqualified leads retain unknown supplier terms');
select public.test_assert((select count(*) = 4 from public.product_development_catalog_links l join public.product_development_projects p on p.id = l.project_id where (p.code,l.product_id) in (('A001','hong-tra-shan-mat'),('A002','hong-tra-shan-khoi'),('A003','luc-tra-shan-moc'),('A004','luc-tra-ngoc-lan'))), 'known products reuse four existing catalog identities');
select public.test_assert(not exists(select 1 from public.product_development_catalog_links l join public.product_development_projects p on p.id = l.project_id where p.code in ('A005','A006')), 'similar jasmine and lotus names are not assumed to prove Shan Tuyet identity');
select public.test_assert((select bool_and(budget_estimate_min is null and budget_estimate_max is null) from public.product_development_projects), 'unknown project budgets are not invented as zero or approved spend');
select public.test_assert(jsonb_array_length(public.product_development_snapshot()->'catalog') = 7, 'manager snapshot reuses all existing tea catalog rows including unavailable tea');
select public.test_assert(not has_function_privilege('authenticated', 'public.product_development_seed()', 'execute') and not has_function_privilege('anon', 'public.product_development_seed()', 'execute'), 'seed entry point is unavailable to browser principals');

select set_config('test.development_project', public.product_development_save_project(null, 0, '{"code":"TEST-ONLY","name":"Synthetic prototype","category_code":"C","division_id":"everyday","reason":"Create isolated research record"}'::jsonb)->>'id', false);
select public.test_assert((select public_availability = 'hidden' and lifecycle_stage = 'idea' and version = 1 and budget_estimate_min is null and budget_estimate_max is null from public.product_development_projects where id = current_setting('test.development_project')::uuid), 'new prototype defaults to hidden idea with unknown budget');
select public.product_development_save_project(current_setting('test.development_project')::uuid, 1, '{"name":"Reviewed synthetic prototype","lifecycle_stage":"sampling","reason":"Prototype scope reviewed by manager"}');
select public.test_error(format($q$select public.product_development_save_project(%L::uuid,1,'{"name":"Stale edit","reason":"Stale browser overwrite attempt"}')$q$, current_setting('test.development_project')), 'development_version_conflict');
select public.test_assert((select version = 2 and name = 'Reviewed synthetic prototype' from public.product_development_projects where id = current_setting('test.development_project')::uuid), 'stale browser save cannot overwrite a newer project');
select public.test_assert(exists(select 1 from public.product_development_events where project_id = current_setting('test.development_project')::uuid and before_data->>'version' = '1' and after_data->>'version' = '2' and actor_id = '00000000-0000-4000-8000-000000000001' and note = 'Prototype scope reviewed by manager'), 'versioned edit records actor, reason, and before/after evidence');
select public.test_error(format($q$select public.product_development_save_project(%L::uuid,2,'{"public_availability":"available","reason":"Attempt publishing a research concept"}')$q$, current_setting('test.development_project')), 'invalid_development_field');
select public.test_error(format($q$select public.product_development_save_project(%L::uuid,2,'{"lifecycle_stage":"production","reason":"Attempt a premature production commitment"}')$q$, current_setting('test.development_project')), 'development_launch_gates_required');
select public.test_error(format($q$select public.product_development_save_project(%L::uuid,2,'{"lifecycle_stage":"live","reason":"Attempt a premature commercial launch"}')$q$, current_setting('test.development_project')), 'development_launch_gates_required');
select public.test_error(format($q$select public.product_development_save_project(%L::uuid,2,'{"category_code":"H","lifecycle_stage":"sampling","reason":"Attempt manufacturing in pending category"}')$q$, current_setting('test.development_project')), 'development_research_only');
select public.test_error(format($q$select public.product_development_save_project(%L::uuid,2,'{"budget_estimate_min":1000,"reason":"Missing source for proposed research budget"}')$q$, current_setting('test.development_project')), 'check constraint');
select public.product_development_save_project(current_setting('test.development_project')::uuid, 2, '{"budget_estimate_min":1000,"budget_estimate_max":2000,"budget_source":"scenario_assumption","budget_note":"Synthetic planning range, not spending approval","reason":"Document a source-labelled planning range"}');

select public.product_development_link_catalog(current_setting('test.development_project')::uuid, 'hong-tra-shan-mat', 'Existing source tea, no commercial mutation');
select public.product_development_link_catalog(current_setting('test.development_project')::uuid, 'hong-tra-shan-mat', 'Retry same catalog attachment');
select public.product_development_link_resource(current_setting('test.development_project')::uuid, 'batch', 'existing-batch', 'Read-only batch reference, no allocation');
select public.product_development_link_resource(current_setting('test.development_project')::uuid, 'batch', 'existing-batch', 'Retry same batch attachment');
select public.product_development_link_resource(current_setting('test.development_project')::uuid, 'material', '00000000-0000-4000-8000-000000000010', 'Read-only material reference, no reservation');
select public.test_assert((select count(*) = 1 from public.product_development_catalog_links where project_id = current_setting('test.development_project')::uuid), 'catalog attachment is idempotent');
select public.test_assert((select count(*) = 2 from public.product_development_resources where project_id = current_setting('test.development_project')::uuid), 'batch and material references attach once');
select public.test_error(format($q$select public.product_development_link_resource(%L::uuid,'batch','missing-batch','Do not invent resources')$q$, current_setting('test.development_project')), 'development_resource_missing');
select public.test_error(format($q$select public.product_development_link_catalog(%L::uuid,'C001','A concept is not a commercial SKU')$q$, current_setting('test.development_project')), 'development_catalog_missing');

select set_config('test.development_supplier', public.product_development_save_supplier(null, 0, '{"name":"Synthetic processing lead","region":"Synthetic test region","reason":"Record an isolated unqualified supplier lead"}')->>'vendor_id', false);
select public.test_assert((select status = 'lead' and accepts_customer_tea is null and estimated_unit_cost is null from public.supplier_profiles where vendor_id = current_setting('test.development_supplier')), 'new supplier has no assumed partnership or commercial terms');
select public.product_development_save_supplier(current_setting('test.development_supplier'), 1, '{"status":"contacted","last_contact_on":"2026-10-19","reason":"Record that manager contacted this test lead"}');
select public.test_error(format($q$select public.product_development_save_supplier(%L,1,'{"notes":"Stale supplier edit","reason":"Stale supplier browser overwrite attempt"}')$q$, current_setting('test.development_supplier')), 'development_version_conflict');
select public.test_error(format($q$select public.product_development_save_supplier(%L,2,'{"status":"approved","reason":"Attempt unverified partnership approval"}')$q$, current_setting('test.development_supplier')), 'supplier_evidence_required');
select public.product_development_link_supplier(current_setting('test.development_project')::uuid, current_setting('test.development_supplier'), 'Candidate only; terms remain unknown');
select public.product_development_link_supplier(current_setting('test.development_project')::uuid, current_setting('test.development_supplier'), 'Retry same supplier attachment');
select public.test_assert((select count(*) = 1 from public.product_development_suppliers where project_id = current_setting('test.development_project')::uuid), 'supplier attachment is idempotent');
update public.vendors set active = true where supplier_only;
select public.test_assert((select count(*) = 1 from public.list_public_vendors()), 'legacy vendor active toggle cannot publish supplier-only leads');

select public.product_development_add_note(current_setting('test.development_project')::uuid, 'Synthetic prototype note, private to management');
select public.test_error($q$update public.product_development_events set note = 'Erased evidence'$q$, 'permission denied');
select public.test_error($q$delete from public.product_development_events$q$, 'permission denied');
select public.test_error(format($q$update public.product_development_projects set public_availability='available' where id=%L::uuid$q$, current_setting('test.development_project')), 'permission denied');
select public.test_error(format($q$update public.supplier_profiles set estimated_unit_cost=0 where vendor_id=%L$q$, current_setting('test.development_supplier')), 'permission denied');

-- Public visitors receive no private rows or manager-only RPC output.
reset role;
set role anon;
select set_config('request.jwt.claim.role', 'anon', false);
select set_config('request.jwt.claim.sub', '', false);
select public.test_assert(public.test_development_private(), 'anonymous visitors cannot read any private development table');
select public.test_error('select public.product_development_snapshot()', 'permission denied');
select public.test_assert((select count(*) = 7 from public.catalog_products), 'research concepts add no public catalog rows');
select public.test_assert((select count(*) = 1 from public.list_public_vendors()), 'public growers remain separate from unverified sourcing leads');

reset role;
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select public.test_assert(public.test_development_private(), 'employees cannot read supplier costs or private development evidence');
select public.test_error('select public.product_development_snapshot()', 'manager_required');
select public.test_error($q$select public.product_development_save_project(null,0,'{"code":"WORKER","name":"Denied","category_code":"C","division_id":"everyday","reason":"Employee must not bypass manager authorization"}')$q$, 'manager_required');
select public.test_error(format($q$select public.product_development_link_resource(%L::uuid,'batch','existing-batch','Unauthorized attachment')$q$, current_setting('test.development_project')), 'manager_required');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', false);
select public.test_assert(public.test_development_private(), 'authenticated customers cannot read private development tables');
select public.test_error('select public.product_development_snapshot()', 'manager_required');
select public.test_error($q$select public.product_development_save_supplier(null,0,'{"name":"Denied supplier","reason":"Customer cannot create internal supplier lead"}')$q$, 'manager_required');
select public.test_error(format($q$select public.product_development_add_note(%L::uuid,'Unauthorized note')$q$, current_setting('test.development_project')), 'manager_required');
reset role;

-- Database constraints remain a backstop even outside the application RPCs.
select public.test_error(format($q$update public.product_development_projects set lifecycle_stage='live',public_availability='available' where id=%L::uuid$q$, current_setting('test.development_project')), 'development_phase1_no_launch');
select public.test_error(format($q$update public.supplier_profiles set status='approved' where vendor_id=%L$q$, current_setting('test.development_supplier')), 'supplier_phase1_no_unverified_terms');
