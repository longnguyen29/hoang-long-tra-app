# Gate 0 repository audit — 28 October 2026

This is an engineering work-in-progress, not a production release. Base: `origin/main` at `519e0154bfe4611c1a6308016771865a38d97458`; recheck before integration. Existing open PRs #8 (Meta Pixel), #48 (homepage), and #49 (AI bridge) were not modified. Existing uncommitted work in the separate `hoang-long-growth` checkout was preserved.

## Reuse and boundaries

- `/admin/discovery` and `components/staff/ProspectDiscovery.jsx` already provide manager access, saved prospects and manual review. `supabase/migrations/0057_prospect_discovery.sql` defines the saved prospect and version model; migrations 0058–0061 extend contacts, follow-ups and the existing pipeline bridge. Research should attach to these records, not create another CRM or promote prospects automatically.
- `app/api/staff/discovery/route.js` uses separately gated Brave search and existing quotas. The current contact extraction route and unsent-message features remain separate. Do not enable a new worker or interfere with current follow-ups.
- `lib/staff-api-auth.js` verifies staff identity but exposes `staff.admin`, a service-role client. Manager-owned functions depending on `auth.uid()` and RLS need a separately constructed server-side client with the actual manager JWT. Never substitute `staff.admin` or expose its credentials to the browser.
- Existing `website_conversion_events`, partner flows, orders, payment, batch and production records remain authoritative. The future project must not duplicate or overwrite them.
- The checkout contains migration files through `0096_product_development_foundation.sql`; names on disk do not prove which changes are deployed. The real Supabase migration ledger and current schema have not been independently verified. Do not assign a production migration number yet.
- Node and PostgreSQL 17.11 are available locally. Production and staging connectivity, current schema, real manager/non-manager JWTs, Supabase RLS and PostgreSQL 16 have not been verified.

## Critical integration gap

The supplied SQL stores the saved prospect URL as the evidence URL and compares that value when reviewing. For a same-origin redirect, the actual evidence page may be different. A safe contract must keep both the originally saved URL and final observed URL, retain original-source/version checks to reject stale research, and validate the final URL server-side before accepting evidence. The isolated fetch prototype passes the final URL to a mock repository but does not modify the supplied candidate SQL. This gap must be resolved and tested before a real adapter or worker runs.

## Gates still open

1. Inspect the actual read-only migration ledger and obtain an appropriately sanitized schema in a nonproduction environment.
2. Prove SQL on that schema, including actual Supabase role and JWT/RLS tests. Add race, lease, suppression and version-change tests, and validate PostgreSQL 16 compatibility.
3. Finish independent worker security review and safe network tests, including exact robots behavior, bounded DNS, redirect attribution, redaction, retries and cancellation. Do not treat mock-only tests as proof of safe real-world network behavior.
4. Only after those proofs: propose the smallest disabled-by-default Next.js/server integration, then staging UI and pilot. No scheduled worker, paid source, customer outreach, production migration or deployment is enabled by this branch.

`vercel.json` disables Git-triggered deployment **only for this branch**, retaining the existing cron definitions. The guard must be removed before an eventual merge; this draft must not be merged as-is.

## Local check results

- The isolated V6 fetch/worker prototype: 86 Node tests passed, including redirected robots-denied paths, encoded paths, deadlines, local transport and malformed HTML; these tests do not establish production security.
- Existing prospect unit and route tests: 7 passed.
- Current app production build passed with inert placeholder public Supabase environment values after an initial build without those values failed at prerender. This is a build-only check; it does not verify connection to the real database or the new feature.
- PostgreSQL 17 disposable tests and focused race checks passed; see [README](README.md) for scope and reproduction.
