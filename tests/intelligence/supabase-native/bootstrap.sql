-- Isolated local Supabase fixture only. Auth roles, auth.users and auth.uid()
-- are provided by actual local Supabase. Only business dependencies are stubs.
CREATE TABLE public.staff_roles (
 user_id uuid NOT NULL REFERENCES auth.users(id), role text NOT NULL
);
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_self_read ON public.staff_roles FOR SELECT TO authenticated USING (user_id=auth.uid());
GRANT SELECT ON public.staff_roles TO authenticated;
CREATE FUNCTION public.is_staff_manager() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM staff_roles WHERE user_id=auth.uid() AND role IN ('admin','manager'))
 $$;
REVOKE ALL ON FUNCTION public.is_staff_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_manager() TO authenticated;
CREATE TABLE public.tea_batches (id text PRIMARY KEY);
