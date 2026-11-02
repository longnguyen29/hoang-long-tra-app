# Curated tea local Supabase Auth/PostgREST integration

Run `bash tests/curated-supabase/run.sh`. It creates a fresh disposable native Supabase stack with a private temporary SUPABASE_HOME; obtains verified official CLI/service artifacts and destroys only that stack and data on exit. It never connects to a hosted project or uses customer data. It checks loopback ownership of advertised API/DB endpoints before touching the database. Requires npm, internet, Python 3, psql, lsof and a Supabase-native supported Mac Apple Silicon or Linux.

The test signs in fictional manager/employee users via real local GoTrue; exercises signed JWT and invalid-signature rejection, manager registration, selection attestation and disclosure consent, unpublished and withdrawn guards, public whitelist, stale identity, HouseControl-style PostgREST upsert, batch invalidation and legacy product behavior through real PostgREST and RLS.

The local business tables and policies are minimal stubs, not a complete copy of production. This test does not prove deployed schema compatibility, real user permissions, checkout behavior, external networking, or production readiness. It does not use current Supabase secrets or run old migrations or cron schedules. A pass does not authorize applying a live migration.

An earlier run on 2026-11-02 passed on local native Supabase PostgreSQL 17.11/Auth/PostgREST, including the real PostgREST upsert; a further run is pending for the expanded batch-metadata invalidation checks. The temporary stack and its data were destroyed after the earlier run.
