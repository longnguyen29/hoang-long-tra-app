-- DISPOSABLE DATABASE ONLY. Creates stub roles/tables to compile V4 SQL without
-- importing any actual production records. Run on an empty throwaway database.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.staff_roles(user_id uuid NOT NULL REFERENCES auth.users(id),role text NOT NULL);
CREATE FUNCTION public.is_staff_manager() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
 SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_roles WHERE user_id=auth.uid() AND role IN ('admin','manager')) $$;
CREATE TABLE public.discovery_prospects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_url text NOT NULL, status text NOT NULL DEFAULT 'research', version integer NOT NULL DEFAULT 1);
CREATE TABLE public.tea_batches (id text PRIMARY KEY);
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO public.staff_roles VALUES ('11111111-1111-4111-8111-111111111111','manager');
INSERT INTO public.discovery_prospects(id,source_url,status,version) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','https://example.org/products','research',1),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','https://example.org/stop','do_not_contact',1);
INSERT INTO public.tea_batches(id) VALUES ('BATCH-FAKE-1');
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
-- The saved prospect table exposes only manager read via a normal RLS policy.
ALTER TABLE public.discovery_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_prospect_manager_read ON public.discovery_prospects
  FOR SELECT TO authenticated USING(public.is_staff_manager());
GRANT SELECT ON public.discovery_prospects TO authenticated;
