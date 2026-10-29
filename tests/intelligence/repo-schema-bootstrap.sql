-- Disposable local PostgreSQL only; dependencies emulate Supabase and the
-- earlier schema. The discovery migrations themselves are the real repo files.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.staff_roles(user_id uuid NOT NULL REFERENCES auth.users(id), role text NOT NULL);
CREATE FUNCTION public.is_staff_manager() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
 SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_roles WHERE user_id=auth.uid() AND role IN ('admin','manager')) $$;
CREATE TABLE public.tea_batches (id text PRIMARY KEY);
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
