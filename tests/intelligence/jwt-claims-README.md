# Disposable claims and RLS simulation

Run `bash tests/intelligence/jwt-claims-check.sh`. It creates and destroys a new PostgreSQL cluster bound to loopback with fictional users and prospects. It applies the repository's discovery migrations 0057–0060 and the unnumbered source-attribution research candidate. It never connects to Supabase or another database.

The test replaces the minimal fixture `auth.uid()` with a local approximation of [Supabase Auth's legacy-and-JSON claims helper](https://github.com/supabase/auth/blob/master/migrations/20220224000811_update_auth_functions.up.sql). It simulates a gateway by setting `request.jwt.claims` and switching database roles. This checks RLS and functions when a verified gateway *would already have populated* claims; it does not generate, sign, validate or expire JWTs. It does not run GoTrue, PostgREST, real Supabase users, staging, the complete live schema, or a network service.

Checks cover manager/employee RLS and RPC behavior with JSON claims, missing subject, anonymous role, legacy per-claim precedence, refusal to trust an employee's claimed manager metadata, worker token and worker RPC privileges, one manager's inability to cancel another manager's job, and manager suppression of already-created evidence after DNC. The baseline worker completion is also tested with fixture service privileges.

A real authenticated Supabase/PostgREST integration test remains necessary before production; setting custom PostgreSQL configuration values in a test client is not proof that the gateway would authenticate a token or assign the correct role. Do not expose direct PostgreSQL connections or let arbitrary clients set trusted claims.
