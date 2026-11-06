-- PATCHED COPY of the supplied V6 fixture; the sole semantic change is supplying
-- the observed source URL to the patched completion RPC. Disposable only.
-- This file runs ONLY on a newly provisioned database named hl_intel_disposable_*.
-- It tests real role separation, bounded idempotent request and terminal work.
SET ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('a',64));
    RAISE EXCEPTION 'anon request unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$ DECLARE receipt record; again record; BEGIN
 SELECT * INTO receipt FROM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('a',64));
 IF receipt.job_status <> 'pending' OR receipt.reused THEN RAISE EXCEPTION 'request invalid'; END IF;
 SELECT * INTO again FROM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('a',64));
 IF NOT again.reused OR again.job_id <> receipt.job_id THEN RAISE EXCEPTION 'idempotency invalid'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hl_intel_jobs'
   AND column_name='claim_token' AND has_column_privilege('authenticated','public.hl_intel_jobs','claim_token','select'))
   THEN RAISE EXCEPTION 'claim token visible to client'; END IF;
END $$;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.request_hl_intel_research('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,repeat('b',64));
  RAISE EXCEPTION 'suppressed prospect request unexpectedly allowed';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'prospect_suppressed' THEN RAISE; END IF;
 END;
END $$;
-- Manager cancellation is repeatable for queued jobs and cannot delete work.
DO $$ DECLARE queued uuid; once_result record; twice_result record; BEGIN
 SELECT job_id INTO queued FROM public.request_hl_intel_research(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('f',64));
 SELECT * INTO once_result FROM public.cancel_hl_intel_research(queued);
 IF once_result.job_status <> 'canceled' OR NOT once_result.canceled
   THEN RAISE EXCEPTION 'first cancellation invalid'; END IF;
 SELECT * INTO twice_result FROM public.cancel_hl_intel_research(queued);
 IF twice_result.job_status <> 'canceled' OR twice_result.canceled
   THEN RAISE EXCEPTION 'cancellation not idempotent'; END IF;
 IF (SELECT count(*) FROM public.hl_intel_audit WHERE job_id=queued AND event_type='research_canceled') <> 1
   THEN RAISE EXCEPTION 'duplicate cancellation audit'; END IF;
END $$;
RESET ROLE;
SET ROLE service_role;
DO $$ DECLARE claimed record; observation_id uuid; BEGIN
 SELECT * INTO claimed FROM public.claim_hl_intel_research('worker_test',1);
 IF claimed.id IS NULL OR claimed.attempt_count <> 1 THEN RAISE EXCEPTION 'claim invalid'; END IF;
 SELECT public.complete_hl_intel_research(claimed.id,claimed.claim_token,'https://example.org/products',repeat('c',64),'B2B tea supplier publicly mentioned') INTO observation_id;
 IF observation_id IS NULL THEN RAISE EXCEPTION 'completion failed'; END IF;
 IF (SELECT status FROM public.hl_intel_jobs WHERE id=claimed.id) <> 'succeeded' THEN RAISE EXCEPTION 'transition failed'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$ DECLARE obs record; reviewed record; BEGIN
 SELECT * INTO obs FROM public.hl_intel_observations LIMIT 1;
 SELECT * INTO reviewed FROM public.review_hl_intel_observation(obs.id,1,'approved','Reviewed source manually');
 IF reviewed.decision <> 'approved' THEN RAISE EXCEPTION 'review decision failed'; END IF;
END $$;
RESET ROLE;
-- An unprivileged user must not be able to browse manager evidence.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.cancel_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  RAISE EXCEPTION 'nonmanager cancellation unexpectedly allowed';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'manager_required' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM public.hl_intel_observations) <> 0 THEN RAISE EXCEPTION 'nonmanager evidence leak'; END IF;
 BEGIN
   PERFORM * FROM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,repeat('d',64));
   RAISE EXCEPTION 'non-manager request unexpectedly succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'manager_required' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;

-- V5 regression: a previously reviewed observation is immediately suppressed
-- from manager RLS once the prospect is marked do-not-contact.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.hl_intel_observations) <> 1 THEN
  RAISE EXCEPTION 'fixture evidence unexpectedly missing before suppression';
 END IF;
END $$;
-- Watch proposals are deliberately disabled; no worker schedule can activate them.
SELECT public.propose_hl_intel_watch('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Track published company updates');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.hl_intel_watches WHERE enabled) <> 0 THEN
  RAISE EXCEPTION 'watch unexpectedly enabled';
 END IF;
END $$;
RESET ROLE;
UPDATE public.discovery_prospects SET status='do_not_contact',version=2
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.hl_intel_observations) <> 0 THEN
  RAISE EXCEPTION 'DNC observation remains visible';
 END IF;
 IF (SELECT count(*) FROM public.hl_intel_watches) <> 0 THEN
  RAISE EXCEPTION 'DNC watch remains visible';
 END IF;
 BEGIN
  PERFORM * FROM public.request_hl_intel_research('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',2,repeat('e',64));
  RAISE EXCEPTION 'DNC prospect request unexpectedly allowed';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'prospect_suppressed' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;
