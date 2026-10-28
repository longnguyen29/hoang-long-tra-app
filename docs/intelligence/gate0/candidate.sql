-- Hoang Long Intelligence Gate-1 V6 CANDIDATE. NEVER APPLIED.
-- Supersedes V3/V4/V5 candidates; run ONLY the newest candidate.
-- Adds manager pending-job cancellation and improves safe worker handling.
-- Hoang Long Intelligence Gate-1 CANDIDATE. Do NOT apply without staging database tests,
-- confirming the current production migration ledger and allocating a new migration number.
-- Additive. No edits to the existing discovery, customer, quote, order, inventory,
-- sample, notification, and payment tables. First gate supports public-source research ONLY.
BEGIN;

CREATE TABLE public.hl_intel_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('source_extract','watch_diff','media_render','erp_shadow')),
  prospect_id uuid REFERENCES public.discovery_prospects(id) ON DELETE RESTRICT,
  requested_version integer CHECK (requested_version > 0),
  idempotency_key text NOT NULL UNIQUE CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','succeeded','failed','canceled','dead_letter')),
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 4),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claim_token uuid,
  claimed_by text CHECK (claimed_by IS NULL OR length(claimed_by) BETWEEN 1 AND 80),
  lease_until timestamptz,
  error_code text CHECK (error_code IS NULL OR (error_code ~ '^[a-z_]{1,60}$')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind IN ('source_extract','watch_diff') AND prospect_id IS NOT NULL AND requested_version IS NOT NULL)
         OR kind IN ('media_render','erp_shadow')),
  CHECK ((status = 'claimed' AND claim_token IS NOT NULL AND claimed_by IS NOT NULL AND lease_until IS NOT NULL)
         OR status <> 'claimed')
);
CREATE INDEX hl_intel_jobs_dispatch_idx ON public.hl_intel_jobs(next_attempt_at,created_at)
 WHERE status IN ('pending','failed','claimed');
CREATE INDEX hl_intel_jobs_prospect_idx ON public.hl_intel_jobs(prospect_id,created_at DESC)
 WHERE prospect_id IS NOT NULL;

CREATE TABLE public.hl_intel_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.hl_intel_jobs(id) ON DELETE RESTRICT,
  prospect_id uuid NOT NULL REFERENCES public.discovery_prospects(id) ON DELETE RESTRICT,
  source_url text NOT NULL CHECK (length(source_url) BETWEEN 8 AND 2000),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  excerpt text NOT NULL CHECK (length(btrim(excerpt)) BETWEEN 1 AND 500),
  observed_at timestamptz NOT NULL,
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  review_note text NOT NULL DEFAULT '' CHECK (length(review_note) <= 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((decision = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL)
      OR (decision <> 'pending' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL))
);
CREATE INDEX hl_intel_obs_prospect_idx ON public.hl_intel_observations(prospect_id,created_at DESC);

CREATE TABLE public.hl_intel_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.discovery_prospects(id) ON DELETE RESTRICT,
  source_url text NOT NULL CHECK (length(source_url) BETWEEN 8 AND 2000),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 300),
  enabled boolean NOT NULL DEFAULT false,
  cadence_hours smallint NOT NULL DEFAULT 168 CHECK (cadence_hours BETWEEN 24 AND 168),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prospect_id,source_url)
);

CREATE TABLE public.hl_intel_erp_shadow_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tea_batch_id text NOT NULL REFERENCES public.tea_batches(id) ON DELETE RESTRICT,
  erp_instance text NOT NULL CHECK (length(erp_instance) BETWEEN 1 AND 80),
  erp_doctype text NOT NULL CHECK (length(erp_doctype) BETWEEN 1 AND 100),
  erp_record_id text NOT NULL CHECK (length(erp_record_id) BETWEEN 1 AND 200),
  last_compared_at timestamptz,
  measured_difference_kg numeric(14,4),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  shadow_only boolean NOT NULL DEFAULT true CHECK (shadow_only),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tea_batch_id,erp_instance,erp_doctype,erp_record_id)
);

CREATE TABLE public.hl_intel_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type ~ '^[a-z_]{3,60}$'),
  job_id uuid REFERENCES public.hl_intel_jobs(id) ON DELETE RESTRICT,
  observation_id uuid REFERENCES public.hl_intel_observations(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(event_detail) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hl_intel_audit_time_idx ON public.hl_intel_audit(occurred_at DESC,id DESC);

-- All tables private by default. No direct mutation privileges for browser roles.
ALTER TABLE public.hl_intel_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hl_intel_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hl_intel_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hl_intel_erp_shadow_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hl_intel_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hl_intel_jobs,public.hl_intel_observations,public.hl_intel_watches,
  public.hl_intel_erp_shadow_links,public.hl_intel_audit FROM PUBLIC,anon,authenticated;
-- Hide worker claim tokens/lease internals from browser roles, including managers.
GRANT SELECT (id,kind,prospect_id,requested_version,correlation_id,status,attempt_count,
  next_attempt_at,error_code,created_by,created_at,updated_at)
 ON public.hl_intel_jobs TO authenticated;
GRANT SELECT ON public.hl_intel_observations,public.hl_intel_watches,
  public.hl_intel_erp_shadow_links,public.hl_intel_audit TO authenticated;
GRANT ALL ON public.hl_intel_jobs,public.hl_intel_observations,public.hl_intel_watches,
  public.hl_intel_erp_shadow_links,public.hl_intel_audit TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.hl_intel_audit_id_seq TO service_role;
CREATE POLICY hl_intel_jobs_manager_read ON public.hl_intel_jobs FOR SELECT TO authenticated USING(public.is_staff_manager());
-- A suppressed or not-fit prospect must not expose archived extracted evidence
-- through ordinary manager listings. Auditors retain separate immutable logs.
CREATE POLICY hl_intel_obs_manager_read ON public.hl_intel_observations FOR SELECT TO authenticated
 USING(public.is_staff_manager() AND EXISTS (
  SELECT 1 FROM public.discovery_prospects p
  WHERE p.id = prospect_id AND p.status NOT IN ('do_not_contact','not_fit')
 ));
CREATE POLICY hl_intel_watch_manager_read ON public.hl_intel_watches FOR SELECT TO authenticated
 USING(public.is_staff_manager() AND EXISTS (
  SELECT 1 FROM public.discovery_prospects p
  WHERE p.id = prospect_id AND p.status NOT IN ('do_not_contact','not_fit')
 ));
CREATE POLICY hl_intel_erp_manager_read ON public.hl_intel_erp_shadow_links FOR SELECT TO authenticated USING(public.is_staff_manager());
CREATE POLICY hl_intel_audit_manager_read ON public.hl_intel_audit FOR SELECT TO authenticated USING(public.is_staff_manager());

-- Manager explicitly requests source research for an already saved prospect.
-- No arbitrary URL and no public contact or outreach action.
CREATE FUNCTION public.request_hl_intel_research(p_prospect_id uuid,p_expected_version integer,p_idempotency_key text)
RETURNS TABLE (job_id uuid, job_status text, reused boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p public.discovery_prospects; j public.hl_intel_jobs;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff_manager() THEN RAISE EXCEPTION 'manager_required'; END IF;
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_idempotency_key'; END IF;
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN RAISE EXCEPTION 'invalid_expected_version'; END IF;
  PERFORM pg_advisory_xact_lock(93510016); -- serialize shared daily allowance
  SELECT * INTO p FROM public.discovery_prospects WHERE id=p_prospect_id FOR UPDATE;
  IF NOT FOUND OR p.status IN ('do_not_contact','not_fit') THEN RAISE EXCEPTION 'prospect_suppressed'; END IF;
  IF p.version<>p_expected_version THEN RAISE EXCEPTION 'stale_prospect'; END IF;
  IF length(p.source_url)>2000 OR p.source_url !~ '^https?://' THEN RAISE EXCEPTION 'invalid_public_source'; END IF;
  -- Exact same key is safely repeatable. Reuse for different input is rejected.
  SELECT * INTO j FROM public.hl_intel_jobs WHERE idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF j.kind<>'source_extract' OR j.prospect_id<>p_prospect_id OR j.requested_version<>p_expected_version
       OR j.created_by<>auth.uid() THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
    RETURN QUERY SELECT j.id,j.status,true;
    RETURN;
  END IF;
  IF (SELECT count(*) FROM public.hl_intel_jobs
      WHERE kind='source_extract' AND (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date =
        (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) >= 10 THEN
    RAISE EXCEPTION 'intel_daily_limit';
  END IF;
  INSERT INTO public.hl_intel_jobs(kind,prospect_id,requested_version,idempotency_key,created_by)
   VALUES('source_extract',p_prospect_id,p_expected_version,p_idempotency_key,auth.uid()) RETURNING * INTO j;
  INSERT INTO public.hl_intel_audit(event_type,job_id,actor_id,event_detail)
   VALUES('research_requested',j.id,auth.uid(),jsonb_build_object('kind','source_extract'));
  RETURN QUERY SELECT j.id,j.status,false;
END $$;
REVOKE ALL ON FUNCTION public.request_hl_intel_research(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_hl_intel_research(uuid,integer,text) TO authenticated;


-- Explicit manager cancellation ONLY for queued/unclaimed research jobs. A
-- claimed job must complete/fail through the worker's token-guarded path.
-- Idempotent cancellation does not modify any prospect/customer data.
CREATE FUNCTION public.cancel_hl_intel_research(p_job_id uuid)
RETURNS TABLE (job_id uuid, job_status text, canceled boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.hl_intel_jobs;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff_manager() THEN RAISE EXCEPTION 'manager_required'; END IF;
  SELECT * INTO j FROM public.hl_intel_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR j.kind<>'source_extract' OR j.created_by<>auth.uid() THEN
    RAISE EXCEPTION 'job_not_found'; END IF;
  IF j.status='canceled' THEN
    RETURN QUERY SELECT j.id,j.status,false; RETURN;
  END IF;
  IF j.status='claimed' THEN RAISE EXCEPTION 'job_already_claimed'; END IF;
  IF j.status NOT IN ('pending','failed') THEN RAISE EXCEPTION 'job_terminal'; END IF;
  UPDATE public.hl_intel_jobs SET status='canceled',error_code='manager_canceled',
      claim_token=NULL,claimed_by=NULL,lease_until=NULL,updated_at=now()
    WHERE id=j.id RETURNING * INTO j;
  INSERT INTO public.hl_intel_audit(event_type,job_id,actor_id,event_detail)
    VALUES('research_canceled',j.id,auth.uid(),jsonb_build_object('reason','manager_canceled'));
  RETURN QUERY SELECT j.id,j.status,true;
END $$;
REVOKE ALL ON FUNCTION public.cancel_hl_intel_research(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_hl_intel_research(uuid) TO authenticated;

-- Gate-1 workers claim only source_extract (read-only jobs); other kinds are disabled.
CREATE FUNCTION public.claim_hl_intel_research(p_worker text,p_limit integer DEFAULT 3)
RETURNS SETOF public.hl_intel_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF p_worker IS NULL OR p_worker !~ '^[a-z0-9_-]{1,80}$' OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'invalid_claim'; END IF;
  -- Exhausted lease holders must not remain claimed forever. They cannot be
  -- re-claimed, so close them explicitly before selecting more work.
  WITH exhausted AS (
    UPDATE public.hl_intel_jobs j SET status='dead_letter',claimed_by=NULL,
      claim_token=NULL,lease_until=NULL,error_code='lease_exhausted',updated_at=now()
      WHERE j.kind='source_extract' AND j.status='claimed'
        AND j.attempt_count>=4 AND j.lease_until<=now()
      RETURNING j.id
  ) INSERT INTO public.hl_intel_audit(event_type,job_id,event_detail)
      SELECT 'research_failed',id,jsonb_build_object('reason','lease_exhausted','terminal',true)
      FROM exhausted;
  RETURN QUERY WITH selected AS (
    SELECT id FROM public.hl_intel_jobs
    WHERE kind='source_extract' AND attempt_count<4 AND next_attempt_at<=now()
      AND (status IN ('pending','failed') OR (status='claimed' AND lease_until<now()))
    ORDER BY created_at,id LIMIT p_limit FOR UPDATE SKIP LOCKED
  )
  UPDATE public.hl_intel_jobs j SET status='claimed',claimed_by=p_worker,
       claim_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',
       attempt_count=j.attempt_count+1,updated_at=now(),error_code=NULL
    FROM selected s WHERE j.id=s.id RETURNING j.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_hl_intel_research(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_hl_intel_research(text,integer) TO service_role;

-- Store bounded plain-text evidence, never harvested contacts/HTML. Cannot modify
-- the original prospect: an authorized manager must separately review it.
CREATE FUNCTION public.complete_hl_intel_research(p_job_id uuid,p_claim_token uuid,p_sha256 text,p_excerpt text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.hl_intel_jobs; p public.discovery_prospects; v_observation_id uuid;
BEGIN
  SELECT * INTO j FROM public.hl_intel_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR j.kind<>'source_extract' OR j.claim_token IS DISTINCT FROM p_claim_token
    THEN RAISE EXCEPTION 'invalid_claim_token'; END IF;
  IF j.status='succeeded' THEN
    SELECT id INTO v_observation_id FROM public.hl_intel_observations WHERE job_id=j.id;
    RETURN v_observation_id;
  END IF;
  IF j.status<>'claimed' OR j.lease_until<=now() THEN RAISE EXCEPTION 'expired_claim'; END IF;
  IF p_sha256 IS NULL OR p_sha256 !~ '^[a-f0-9]{64}$' OR
     length(btrim(coalesce(p_excerpt,''))) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid_evidence'; END IF;
  SELECT * INTO p FROM public.discovery_prospects WHERE id=j.prospect_id FOR UPDATE;
  IF NOT FOUND OR p.status IN ('do_not_contact','not_fit') OR p.version<>j.requested_version THEN
    UPDATE public.hl_intel_jobs SET status='canceled',claim_token=NULL,claimed_by=NULL,
      lease_until=NULL,error_code='prospect_changed',updated_at=now() WHERE id=j.id;
    INSERT INTO public.hl_intel_audit(event_type,job_id,event_detail)
      VALUES('research_canceled',j.id,jsonb_build_object('reason','prospect_changed'));
    RETURN NULL;
  END IF;
  INSERT INTO public.hl_intel_observations(job_id,prospect_id,source_url,content_hash,excerpt,observed_at)
    VALUES(j.id,p.id,p.source_url,p_sha256,btrim(p_excerpt),now()) RETURNING id INTO v_observation_id;
  UPDATE public.hl_intel_jobs SET status='succeeded',lease_until=NULL,updated_at=now()
    WHERE id=j.id;
  INSERT INTO public.hl_intel_audit(event_type,job_id,observation_id,event_detail)
    VALUES('research_completed',j.id,v_observation_id,jsonb_build_object('source','saved_prospect_url'));
  RETURN v_observation_id;
END $$;
REVOKE ALL ON FUNCTION public.complete_hl_intel_research(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_hl_intel_research(uuid,uuid,text,text) TO service_role;

CREATE FUNCTION public.fail_hl_intel_research(p_job_id uuid,p_claim_token uuid,p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.hl_intel_jobs; v_status text;
BEGIN
  IF p_reason IS NULL OR p_reason !~ '^[a-z_]{1,60}$' THEN RAISE EXCEPTION 'invalid_failure_code'; END IF;
  SELECT * INTO j FROM public.hl_intel_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR j.kind<>'source_extract' OR j.status<>'claimed' OR j.claim_token IS DISTINCT FROM p_claim_token
     OR j.lease_until<=now() THEN RAISE EXCEPTION 'invalid_claim_token'; END IF;
  v_status := CASE WHEN j.attempt_count>=4 OR p_reason IN ('robots_denied','private_network','policy_blocked')
     THEN 'dead_letter' ELSE 'failed' END;
  UPDATE public.hl_intel_jobs SET status=v_status,error_code=p_reason,claimed_by=NULL,
   claim_token=NULL,lease_until=NULL,updated_at=now(),
   next_attempt_at=now()+make_interval(mins=>LEAST(120,5*(2^j.attempt_count)::integer))
   WHERE id=j.id;
  INSERT INTO public.hl_intel_audit(event_type,job_id,event_detail)
   VALUES('research_failed',j.id,jsonb_build_object('reason',p_reason,'terminal',v_status='dead_letter'));
  RETURN v_status;
END $$;
REVOKE ALL ON FUNCTION public.fail_hl_intel_research(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fail_hl_intel_research(uuid,uuid,text) TO service_role;

CREATE FUNCTION public.review_hl_intel_observation(
 p_observation_id uuid,p_expected_version integer,p_decision text,p_note text DEFAULT '')
RETURNS public.hl_intel_observations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.hl_intel_observations; p public.discovery_prospects;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff_manager() THEN RAISE EXCEPTION 'manager_required'; END IF;
  IF p_decision NOT IN ('approved','rejected') OR p_decision IS NULL OR
      length(coalesce(p_note,''))>1200 THEN RAISE EXCEPTION 'invalid_review'; END IF;
  SELECT * INTO o FROM public.hl_intel_observations WHERE id=p_observation_id FOR UPDATE;
  IF NOT FOUND OR p_expected_version IS NULL OR o.version<>p_expected_version OR o.decision<>'pending' THEN RAISE EXCEPTION 'stale_observation'; END IF;
  SELECT * INTO p FROM public.discovery_prospects WHERE id=o.prospect_id FOR UPDATE;
  IF NOT FOUND OR p.status IN ('do_not_contact','not_fit') THEN RAISE EXCEPTION 'prospect_suppressed'; END IF;
  IF p.source_url<>o.source_url OR p.version<>(SELECT requested_version FROM public.hl_intel_jobs WHERE id=o.job_id) THEN
    RAISE EXCEPTION 'stale_observation_source'; END IF;
  UPDATE public.hl_intel_observations SET decision=p_decision,reviewed_by=auth.uid(),
     reviewed_at=now(),review_note=btrim(coalesce(p_note,'')),version=version+1
    WHERE id=p_observation_id RETURNING * INTO o;
  INSERT INTO public.hl_intel_audit(event_type,job_id,observation_id,actor_id,event_detail)
    VALUES('observation_reviewed',o.job_id,o.id,auth.uid(),jsonb_build_object('decision',p_decision));
  RETURN o;
END $$;
REVOKE ALL ON FUNCTION public.review_hl_intel_observation(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_hl_intel_observation(uuid,integer,text,text) TO authenticated;

-- Watches start disabled. Activation/scheduling is intentionally absent at Gate-1.
CREATE FUNCTION public.propose_hl_intel_watch(p_prospect_id uuid,p_reason text)
RETURNS public.hl_intel_watches LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p public.discovery_prospects; w public.hl_intel_watches;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff_manager() THEN RAISE EXCEPTION 'manager_required'; END IF;
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'invalid_reason'; END IF;
 SELECT * INTO p FROM public.discovery_prospects WHERE id=p_prospect_id FOR UPDATE;
 IF NOT FOUND OR p.status IN ('do_not_contact','not_fit') THEN RAISE EXCEPTION 'prospect_suppressed'; END IF;
 INSERT INTO public.hl_intel_watches(prospect_id,source_url,reason,created_by)
 VALUES(p.id,p.source_url,btrim(p_reason),auth.uid())
 ON CONFLICT(prospect_id,source_url) DO NOTHING RETURNING * INTO w;
 IF w.id IS NULL THEN SELECT * INTO w FROM public.hl_intel_watches
   WHERE prospect_id=p.id AND source_url=p.source_url; END IF;
 RETURN w;
END $$;
REVOKE ALL ON FUNCTION public.propose_hl_intel_watch(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_hl_intel_watch(uuid,text) TO authenticated;

COMMIT;
