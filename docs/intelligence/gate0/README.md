# Intelligence Gate 0 — candidate database proof

**Status: research prototype, not a migration; do not deploy or apply to a live database.**
This is the V6 candidate and fixture supplied in `HoangLong_Intelligence_System_V6.zip`, copied without modifying their contents. They do not create an application feature. No V3–V5 candidate is needed or should be applied alongside V6.

## Reproduce the isolated test

Run `bash tests/intelligence/run-disposable-postgres.sh` from this repository. It requires Python 3 and a local PostgreSQL installation with `pg_config`, `initdb`, `pg_ctl`, `createdb`, and `psql`. It creates its **own empty local cluster** listening on loopback, inserts only fictitious fixture data, then shuts down and removes the cluster. It never uses a production or staging connection.

The upstream candidate contains `BEGIN` and `COMMIT`. When combined with `psql --single-transaction`, that inner `COMMIT` ends the transaction before assertions. The harness checks that exactly one of each top-level boundary exists and removes them from a temporary copy, leaving the checked-in candidate unchanged. It first injects a SQL failure and verifies that the fixture tables, candidate table, and test roles all rolled back. It then runs the supplied assertions in one transaction in a separate clean database.

## Evidence on 2026-10-28

- Local PostgreSQL **17.11 (Homebrew)**: rollback check passed and supplied V6 disposable fixture passed.
- Additional checks on that disposable cluster passed: concurrent distinct requests enforce the 10-request cap; concurrent duplicate requests create one job; two workers do not claim the same job; one observed cancellation/claim race has one winner; an in-flight DNC or version change suppresses evidence; stale evidence cannot be approved; and an exhausted lease becomes dead letter. These are focused test cases, not a proof of all possible interleavings.
- `bash -n tests/intelligence/run-disposable-postgres.sh`: passed.
- This is a stub schema and simulated roles, not a sanitized current-schema clone or real Supabase JWT/RLS test. PostgreSQL 16, the actual migration ledger, staging authentication and integration with Next.js have **not** been verified by this fixture. A passing fixture is not permission to apply SQL to Supabase.
- The V6 fetcher and worker are isolated prototypes under `tools/intelligence-fetch/`; they are not integrated into the app or activated. The supplied V6 version fetched redirected pages before checking their robots rules and lacked complete network deadlines. The isolated prototype adds checks and targeted tests; it is not yet approved for production. Its runner passes the final evidence URL to a mock repository, but the unchanged SQL candidate still stores the original URL and must be revised and re-tested before integration.

## Upstream provenance

The user-provided ZIP has SHA-256 `42fc06ebb3e974f7fc35aeb21d48bf6329b7db45ce243cb76ae8aae2bdcb2209`.

| Repository file | V6 ZIP source | SHA-256 |
|---|---|---|
| `docs/intelligence/gate0/candidate.sql` | `sql/v6/XXXX_hl_intelligence_core_V6.CANDIDATE.sql` | `fec4ac767285989c8b895bd5b70608d4227793754872034d2409bc00dab70f07` |
| `tests/intelligence/00_bootstrap_disposable.sql` | `sql/v6/fixture/00_bootstrap_disposable.sql` | `4d34955153af691b7a8bd8dbd4b70939ba3abe4ef99acd7c567be3e517222b5f` |
| `tests/intelligence/20_assert_disposable.sql` | `sql/v6/fixture/20_assert_disposable.sql` | `4b1e90808579a0d6e4e244213be5feff4f8d5c4c02b2f012e9ff3d4fc58efa9c` |

## Next proof before a deployable proposal

Inspect the actual migration ledger and current database schema without writing to production. Run the candidate against a sanitized current-schema copy and PostgreSQL 16, test real staff-manager and non-manager JWT/RLS in isolated staging, and expand race and failure tests against the real schema. Security-review and test the public fetcher separately; reconcile results with actual application authentication. Allocate any eventual migration filename only after ledger review. Keep feature and worker flags off and do not contact prospects automatically.
