# Disposable repository migration check

Run `bash tests/intelligence/repo-schema-check.sh`. It creates, starts and deletes a new local-only PostgreSQL cluster with fictitious data. It runs the actual repository migrations 0057–0060 and the unnumbered source-attribution candidate, then checks a manager research request, hidden worker tokens, suppression, worker completion and non-manager access using simulated roles.

This is more realistic than the minimal discovery fixture, but it is **not** a clone of the deployed schema or Supabase. `auth.users`, `auth.uid()`, `staff_roles`, `is_staff_manager()`, `tea_batches` and the `anon` / `authenticated` / `service_role` roles are simulated. It does not run migrations before 0057 or after 0060, verify the production migration ledger, check real Supabase JWTs, or permit any migration to production. The database candidate and worker remain unconnected to the application.
