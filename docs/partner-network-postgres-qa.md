# Partner Network — real PostgreSQL verification

Verified on 12 October 2026 with PostgreSQL 17.10 in a disposable, loopback-only cluster. Production Supabase was not contacted. No production accounts, customer data, connection strings, or credentials were used.

## Result

- All 69 `tests/sql/partner-network.sql` authorization and financial assertions passed against genuine PostgreSQL, including the immutable paid-order entitlement review when an older order collects money later.
- After applying `0086_partner_order_link_events.sql`, all 26 structural-attribution SQL assertions passed: immediate quote/account order links, later conversions/associations, exclusions, immutable origin, idempotent audit and private helper privileges.
- Twelve concurrency cases passed using separate PostgreSQL backend connections. Each case requires `pg_blocking_pids` to confirm the second transaction waits for the first before committing it; these are not serialized PGlite simulations.
- The cluster and its data directory are stopped and deleted automatically at completion. The test never accepts a pre-existing database URL.
- The PostgreSQL runtime is installed outside the repository. There is no new application dependency or production infrastructure requirement.

## Concurrent operations covered

1. Two simultaneous applications from the same verified user: one membership, explicit `application_exists` for the duplicate.
2. Two identical lead retries: one referral and the same request ID returned.
3. Two partners competing to accept the same normalized contact: one CRM opportunity and one accepted attribution; the other must choose the existing opportunity for explicit resolution.
4. Two different referrals explicitly linked to the same opportunity: only one accepted origin.
5. Two different referrals linked to one order: only one originating referral.
6. Two financial reviews of the same order: one commission record, serialized reviews and preserved audit history.
7. Two attempts to record the same approved commission payout: exactly one paid transition; the duplicate is rejected.
8. A redundant manual order-link retry overlapping a commission payout: consistent order-before-referral lock acquisition; no lock-inversion deadlock.
9. A customer payment reversal overlapping payout: the payout waits for the receivable change and is rejected as stale, without recording a commission payment.
10. A delayed quote conversion overlapping manual attribution: one originating link survives; the later automatic event preserves the explicit origin.
11. A two-order account association batch overlapping manual attribution on its second order: all order rows are locked before creating referral links; no order/referral FK inversion.
12. A manager's structural refresh of two legacy orders overlapping manual attribution on its second order: same safe batch ordering, preserving the explicit origin.

## Reproduce

Install the external test runtime in a disposable directory, following the package's [official README](https://github.com/leinelissen/embedded-postgres):

```sh
npm install --prefix /private/tmp/hl-partner-pg --no-save embedded-postgres@17.10.0-beta.17 pg@8
EMBEDDED_POSTGRES_MODULE=/private/tmp/hl-partner-pg/node_modules/embedded-postgres/dist/index.js node tests/partner-network-postgres.mjs
```

Embedded PostgreSQL's documented installation requires its platform package's symlink hydration postinstall script. If the package manager suppresses install scripts, enable that script for this temporary installation. The harness uses an ephemeral port, `127.0.0.1` only, SCRAM authentication and an automatically removed data directory.

The harness prints both migration SHA256 hashes alongside the result so the evidence identifies exactly which `0084_b2b_partner_network.sql` and `0086_partner_order_link_events.sql` were exercised. A failed assertion exits non-zero after cleanup.

## Scope and limits

This verifies the real PostgreSQL locking engine, RLS, RPC grants and the Partner Network migration against a representative existing-schema fixture. It does not prove hosted Supabase email deliverability, browser PKCE authentication, deployed configuration or that production schema matches the fixture. Those require separate staging/deployment checks. The Phase 1 payout operation only records an external payment; these tests do not transfer money or contact anyone.
