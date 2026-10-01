# Production deployment — 2026-10-01

PR #23 was merged into main as `e7a74c0`. Vercel production deployment
`4bfZYDpWUQaHmWJssgyaN3mAPfJC` is Ready and serves www.hoanglongtra.com.

GitHub publishing was repaired with approved network access, Git Credential
Manager login stored in macOS Keychain, and repository-local credential helper
configuration. A real push and a separate ordinary `git push` both succeeded.
See `github-publishing.md`; no credentials are committed.

Live changes:
- Failed shipping SMS retries after three hours with stable provider IDs and
  atomic claims. Gateway-accepted messages are never resubmitted.
- Compact public tracking header, carrier/code/copy/official tracking link near
  the top, Zalo support, latest real order-event timestamp, neutral status until
  carrier evidence exists, tea/quantity summary and collapsed prior stages.
- Completed orders can prepare a repeat-order request with their tea list and
  quantities for Zalo. This does not create or charge a new order; staff confirm
  price, quantity and delivery using the existing reorder workflow.
- Customer phone, address and internal notes remain absent from the public page.

Scheduler:
- Migration 0072 was already applied. Do not reapply old migrations.
- Matching random secret provisioned in Vercel production and Supabase Vault.
  Values are not stored in Git, chat text or SQL queries.
- Job `hoang-long-shipping-sms-retry` is active, schedule `*/10 * * * *`.
- Unauthenticated production request returned HTTP 401.
- Authenticated pg_net connection returned HTTP 200, no timeout or HTTP error.
- Cron checks every ten minutes and invokes HTTP only when something has waited
  three hours. Retry delay is roughly three hours plus up to ten minutes, or
  longer if eligible records exceed the four-message batch.

Validation: 15 relevant tests and production build passed before deployment.
Live desktop 1280px and mobile 390px inspected with no horizontal overflow;
copy-code confirmation and expandable journey verified. Shipping order shows
its two tea types, 5 kg total and actual latest event timestamp; it does not
prematurely claim carrier receipt or delivery. Existing queued customer SMS was
not manually resubmitted. Completed-order reorder UI was not exercised against
real data because the inspected order is still shipping.
