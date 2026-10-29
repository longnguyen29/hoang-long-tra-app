-- Fictional records only; this file runs in the throwaway cluster.
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.staff_roles VALUES ('11111111-1111-4111-8111-111111111111','manager');
INSERT INTO public.discovery_prospects(id,name,source_url,source_key,evidence_kind,created_by,status,version) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Fixture prospect','https://example.org/products','fake-source','search_snippet','11111111-1111-4111-8111-111111111111','research',1),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Fixture blocked','https://example.org/stop','fake-blocked','search_snippet','11111111-1111-4111-8111-111111111111','do_not_contact',1);

SET ROLE authenticated;
SET "request.jwt.claim.sub"='11111111-1111-4111-8111-111111111111';
DO $$
DECLARE requested record; exposed int;
BEGIN
 SELECT * INTO requested FROM public.request_hl_intel_research(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('a',64));
 IF requested.job_status <> 'pending' THEN RAISE EXCEPTION 'unexpected_job_status'; END IF;
 SELECT count(*) INTO exposed FROM public.hl_intel_jobs WHERE id=requested.job_id;
 IF exposed <> 1 THEN RAISE EXCEPTION 'manager_cannot_read_job'; END IF;
 BEGIN
   PERFORM claim_token FROM public.hl_intel_jobs WHERE id=requested.job_id;
   RAISE EXCEPTION 'worker_claim_token_exposed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   PERFORM public.request_hl_intel_research('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,repeat('b',64));
   RAISE EXCEPTION 'suppressed_prospect_was_accepted';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'prospect_suppressed' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;

SET ROLE service_role;
DO $$
DECLARE claim public.hl_intel_jobs; observation uuid;
BEGIN
 SELECT * INTO claim FROM public.claim_hl_intel_research('repo_schema_worker',1);
 IF claim.id IS NULL OR claim.requested_source_url <> 'https://example.org/products' THEN
   RAISE EXCEPTION 'wrong_claim';
 END IF;
 observation := public.complete_hl_intel_research(claim.id,claim.claim_token,
   'https://example.org/products',repeat('c',64),'Fictional source evidence');
 IF observation IS NULL OR NOT EXISTS(SELECT 1 FROM public.hl_intel_observations
    WHERE id=observation AND source_url='https://example.org/products') THEN
   RAISE EXCEPTION 'evidence_missing_or_misattributed';
 END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='22222222-2222-4222-8222-222222222222';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.hl_intel_observations) THEN RAISE EXCEPTION 'non_manager_can_read_evidence'; END IF;
 BEGIN
   PERFORM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('d',64));
   RAISE EXCEPTION 'non_manager_can_request_research';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'manager_required' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;
