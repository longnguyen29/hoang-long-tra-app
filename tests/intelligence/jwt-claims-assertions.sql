-- These statements run only in a newly initialized disposable cluster.
-- JSON claims and SET ROLE imitate already-verified PostgREST context, not
-- token validation or an HTTP API. All IDs and sources are fictitious.
INSERT INTO auth.users(id) VALUES ('33333333-3333-4333-8333-333333333333');
INSERT INTO public.staff_roles(user_id, role) VALUES
 ('22222222-2222-4222-8222-222222222222','employee'),
 ('33333333-3333-4333-8333-333333333333','manager');

-- Clear older individual-claim setting left by the upstream fixture.
SET "request.jwt.claim.sub"='';
SET "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
SET ROLE authenticated;
DO $$
DECLARE visible_count int;
BEGIN
 IF auth.uid() <> '11111111-1111-4111-8111-111111111111'::uuid THEN RAISE EXCEPTION 'json_claim_uid_failed'; END IF;
 SELECT count(*) INTO visible_count FROM public.hl_intel_observations;
 IF visible_count <> 1 THEN RAISE EXCEPTION 'manager_missing_observation'; END IF;
 BEGIN
  PERFORM claim_token FROM public.hl_intel_jobs;
  RAISE EXCEPTION 'manager_claim_token_exposed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Identity comes from staff_roles, not user-controlled app metadata.
SET "request.jwt.claims"='{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","app_metadata":{"role":"manager"}}';
SET ROLE authenticated;
DO $$
BEGIN
 IF auth.uid() <> '22222222-2222-4222-8222-222222222222'::uuid THEN RAISE EXCEPTION 'employee_uid_failed'; END IF;
 IF EXISTS (SELECT 1 FROM public.hl_intel_jobs) OR EXISTS (SELECT 1 FROM public.hl_intel_observations) THEN RAISE EXCEPTION 'employee_can_read'; END IF;
 BEGIN
  PERFORM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('e',64));
  RAISE EXCEPTION 'employee_can_request';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'manager_required' THEN RAISE; END IF; END;
 BEGIN
  PERFORM * FROM public.claim_hl_intel_research('fake_worker',1);
  RAISE EXCEPTION 'employee_can_claim';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Missing subject must not inherit a previous authenticated user's identity.
SET "request.jwt.claims"='{"role":"authenticated"}';
SET ROLE authenticated;
DO $$
BEGIN
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'missing_subject_not_null'; END IF;
 IF EXISTS (SELECT 1 FROM public.hl_intel_jobs) OR EXISTS (SELECT 1 FROM public.hl_intel_observations) THEN RAISE EXCEPTION 'no_subject_can_read'; END IF;
 BEGIN
  PERFORM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('f',64));
  RAISE EXCEPTION 'no_subject_can_request';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'manager_required' THEN RAISE; END IF; END;
END $$;
RESET ROLE;

-- A different manager cannot cancel a job created by the first manager.
SET "request.jwt.claims"='{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
SET ROLE authenticated;
DO $$
DECLARE target uuid;
BEGIN
 SELECT id INTO target FROM public.hl_intel_jobs LIMIT 1;
 IF target IS NULL THEN RAISE EXCEPTION 'manager_job_missing'; END IF;
 BEGIN
  PERFORM public.cancel_hl_intel_research(target);
  RAISE EXCEPTION 'other_manager_can_cancel';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'job_not_found' THEN RAISE; END IF; END;
END $$;
RESET ROLE;

-- Legacy per-claim setting takes precedence when present, as in Supabase auth.
SET "request.jwt.claim.sub"='22222222-2222-4222-8222-222222222222';
SET "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
SET ROLE authenticated;
DO $$
BEGIN
 IF auth.uid() <> '22222222-2222-4222-8222-222222222222'::uuid THEN RAISE EXCEPTION 'legacy_claim_precedence_wrong'; END IF;
 IF EXISTS (SELECT 1 FROM public.hl_intel_observations) THEN RAISE EXCEPTION 'legacy_non_manager_can_read'; END IF;
END $$;
RESET ROLE;
SET "request.jwt.claim.sub"='';

-- No anonymous select or RPC execute privilege, regardless of claims.
SET "request.jwt.claims"='{}';
SET ROLE anon;
DO $$
BEGIN
 BEGIN
  PERFORM 1 FROM public.hl_intel_observations;
  RAISE EXCEPTION 'anon_can_select';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('1',64));
  RAISE EXCEPTION 'anon_can_request';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- DNC must hide already-created evidence even from the manager.
UPDATE public.discovery_prospects SET status='do_not_contact' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
SET ROLE authenticated;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.hl_intel_observations) THEN RAISE EXCEPTION 'dnc_evidence_visible'; END IF;
END $$;
RESET ROLE;
