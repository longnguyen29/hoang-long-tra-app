-- Disposable-only auth.uid() compatibility approximation: PostgREST sets the
-- verified claim object in request.jwt.claims, while older deployments may use
-- request.jwt.claim.sub. No JWT is generated or verified by this fixture.
-- Source: supabase/auth 20220224000811_update_auth_functions.up.sql.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT coalesce(
   nullif(current_setting('request.jwt.claim.sub', true), ''),
   (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
 )::uuid
$$;
