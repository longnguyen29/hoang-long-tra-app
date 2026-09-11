# Hoàng Long — Tìm quán mới

Own application code, inspired by Explee's publicly observable discovery → research → qualification workflow. No Explee subscription or proprietary dataset is used.

## Scope

Nationwide café and tea-shop research, optional city query, milk/fruit tea segments. The search adapter uses Brave Web Search, behind an explicit off-by-default flag. Manual sourced records work independently of that adapter. Four starter records are desk research from public business websites dated 11 September 2026, not existing customers or verified buying opportunities.

Routes: `/admin/discovery` (manager/admin) and development-only `/discovery-review` (in-memory, resets on reload; production returns 404). Existing site and order workflows are preserved.

Saved records are separate from customer/order tables. A unique source-page key strips tracking and prevents exact-source duplicates. Different pages belonging to one business are not automatically merged; shared hosts are deliberately not collapsed. No person lookup, scraping of private contact data, email sending, or SMS is implemented.

Menu matches are deterministic keyword cues, explicitly labelled hypotheses. Search snippets never become verified website evidence automatically. Managers can correct names/regions/evidence, mark a page reviewed, qualify a shop, and record business contact information. Unknown purchase volume and buyer identity remain unknown. Draft text is editable but not persisted and never sent. `do_not_contact` hides the draft; it is not an outreach permission system.

## Setup

1. Applied to production project `wwhrnbgvlfccriudvhqy` on 11 September 2026 through the authenticated Supabase SQL editor, in a transaction. Verified both tables exist with RLS enabled and no anonymous SELECT or authenticated TRUNCATE rights. No customer rows were modified. For another environment, apply additive migration `supabase/migrations/0057_prospect_discovery.sql` to the existing Supabase project. It creates two isolated tables, manager-only RLS, an optimistic version check for reviews, and an atomic search allowance shared across managers. It does not change orders or existing customers.
2. Existing public Supabase URL/anon key support authenticated records. Search additionally requires the existing server-only `SUPABASE_SERVICE_ROLE_KEY`.
3. To enable the optional Brave adapter, configure server-only `BRAVE_SEARCH_API_KEY` and explicitly set `DISCOVERY_SEARCH_ENABLED=true` after the owner approves the source/account budget. Never put a secret in a NEXT_PUBLIC variable. `DISCOVERY_DAILY_SEARCH_LIMIT` defaults to 5 and is clamped to 1–20. Each click makes one request, maximum 20 web results. Attempts consume the allowance even on failure. No background schedule or pagination is enabled.
4. If the provider is absent, the interface accurately says search is inactive; manual research and saved records are still usable once the database is ready. No paid requests were made during development.

Search is a data-source adapter, not a dependency on Explee. It may later be replaced by a licensed business-data provider or a maintained first-party source collector. A search index is still needed for broad discovery; owning UI/code alone does not recreate Explee's dataset.

## Validation

- `node --test lib/prospect-discovery.test.mjs tests/prospect-discovery-route.test.mjs`: unsafe URLs, source dedupe, uncertain results, nationwide query, draft suppression, auth/config/budget failure, provider failure and no automatic prospect inserts.
- Isolated PostgreSQL-compatible PGlite verification: manager insertion, worker isolation, duplicate rejection, stale update rejection, status update and service-only daily reservation. Run `PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/prospect-discovery-db.mjs supabase/migrations/0057_prospect_discovery.sql`.
- Production build and browser QA. Browser preview save → qualified → draft → do-not-contact → hidden draft verified. Run dev with `WATCHPACK_POLLING=true npm run dev -- --hostname 127.0.0.1 --port 3042` if file-watcher limits or local-origin restrictions arise.

## First pilot and measurement

Review a first batch of 30 distinct shops across multiple regions before increasing source volume. Measure proportion with an operating business/menu confirmed, duplicate rate, minutes spent per qualified shop, and source cost per qualified shop. Do not use search-result counts as customers acquired. After the owner authorizes actual contact, separately measure replies, sample acceptance, first orders and repeat orders in the existing sales process. There are no claimed conversion results yet.

Next gaps: automated menu-page extraction, business-level dedupe, buyer verification, saved outreach drafts, CRM handoff, multiple-region coverage strategy and source quality evaluation. No assertion that the current implementation equals Explee end to end.

## Public references

- Explee product workflow: https://explee.com/
- Explee public API: https://api.explee.com/public/api/docs
- Brave search API contract: https://api-dashboard.search.brave.com/api-reference/web/search/get
- Starter sources: https://mienmancafe.vn/menu/ ; https://thisthatcafe.com/en/ ; https://www.kimcafe.biz.vn/ ; https://felinecoffee.com/
