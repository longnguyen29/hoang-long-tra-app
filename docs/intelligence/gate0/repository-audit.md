# Gate 0 repository audit — 28 October 2026

This is an engineering work-in-progress, not a production release. Base: `origin/main` at `519e0154bfe4611c1a6308016771865a38d97458`; recheck before integration. Existing open PRs #8 (Meta Pixel), #48 (homepage), and #49 (AI bridge) were not modified. Existing uncommitted work in the separate `hoang-long-growth` checkout was preserved.

## Reuse and boundaries

- `/admin/discovery` and `components/staff/ProspectDiscovery.jsx` already provide manager access, saved prospects and manual review. `supabase/migrations/0057_prospect_discovery.sql` defines the saved prospect and version model; migrations 0058–0061 extend contacts, follow-ups and the existing pipeline bridge. Research should attach to these records, not create another CRM or promote prospects automatically.
- `app/api/staff/discovery/route.js` uses separately gated Brave search and existing quotas. The current contact extraction route and unsent-message features remain separate. Do not enable a new worker or interfere with current follow-ups.
- `lib/staff-api-auth.js` verifies staff identity but exposes `staff.admin`, a service-role client. Manager-owned functions depending on `auth.uid()` and RLS need a separately constructed server-side client with the actual manager JWT. Never substitute `staff.admin` or expose its credentials to the browser.
- Existing `website_conversion_events`, partner flows, orders, payment, batch and production records remain authoritative. The future project must not duplicate or overwrite them.
- The checkout contains migration files through `0096_product_development_foundation.sql`; names on disk do not prove which changes are deployed. A read-only check confirmed that the standard Supabase migration ledger is not present; repository filenames cannot establish what was applied. Some relevant live table and policy metadata has been inspected, but the complete current schema has not been cloned or verified. Do not assign a production migration number yet.
- Node and PostgreSQL 17.11 are available locally. Selected live schema metadata has been checked read-only, but full current-schema compatibility, deployed manager/non-manager JWTs and production Supabase RLS behavior have not been verified. Real JWTs and RLS were subsequently verified on a disposable local Supabase instance with fictional users and partial schema; PostgreSQL 16 remains untested. The project branch selector showed only the production branch; no staging branch was observed.

## Critical integration gap

The supplied SQL stores the saved prospect URL without checking the observed URL, so redirects can be misattributed. A separate unnumbered SQL research patch snapshots the requested URL and requires an exact observed match; the standalone runner refuses page redirects before following them. These two components are not connected to each other or the app. Exact matching also blocks harmless redirects and URL normalization. A reviewed end-to-end adapter, real-schema and staging tests are still required before activation; support for redirects requires a separate origin and attribution design.

## Gates still open

1. Reconcile applied migrations using available read-only metadata (the standard ledger is absent) and obtain an appropriately sanitized current schema in a nonproduction environment.
2. Prove SQL against that fuller schema. Real local Supabase role and signed JWT/RLS tests now pass on a partial schema; expand coverage against the fuller schema and validate PostgreSQL 16 compatibility if required.
3. Finish independent worker security review and safe network tests, including exact robots behavior, bounded DNS, redirect attribution, redaction, retries and cancellation. Do not treat mock-only tests as proof of safe real-world network behavior.
4. Only after those proofs: propose the smallest disabled-by-default Next.js/server integration, then staging UI and pilot. No scheduled worker, paid source, customer outreach, production migration or deployment is enabled by this branch.

`vercel.json` disables Git-triggered deployment **only for this branch**, retaining the existing cron definitions. The guard must be removed before an eventual merge; this draft must not be merged as-is.

## Local check results

- The isolated V6 fetch/worker prototype: 88 Node tests passed, including redirected robots-denied paths, encoded paths, deadlines, local transport and malformed HTML; these tests do not establish production security.
- Existing prospect unit and route tests: 7 passed.
- Current app production build passed with inert placeholder public Supabase environment values after an initial build without those values failed at prerender. This is a build-only check; it does not verify connection to the real database or the new feature.
- PostgreSQL 17 disposable tests and focused race checks passed. A separate test also applied repository migrations 0057–0060 and the patched candidate with simulated dependencies and fictional data; see [README](README.md) and [repository-migration test](../../../tests/intelligence/repo-schema-README.md) for scope and reproduction.
- Supabase native Auth and PostgREST on PostgreSQL 17.11 passed signed manager/staff JWT, invalid-signature, anonymous, RLS, worker-token isolation, service-only RPC, retry and suppression tests with fictional users. This used only selected repository migrations and simulated business dependencies, not a full schema clone or the deployed service. See [local Supabase test](../../../tests/intelligence/supabase-native/README.md).
- A standalone manager API prototype adds bounded observation listing, fail-closed feature switches, manager JWT-scoped adapter interfaces, idempotent retry support and explicit response projections. Its 77 tests use mocked authentication and database adapters; no real JWT, RLS, HTTP routes or app integration is verified *through that API prototype*. See [API prototype](../../../tools/intelligence-api/README.md).
- A standalone [visual prototype](../../../tools/intelligence-preview/README.md) uses fictional data and remains disconnected from the app and database.
