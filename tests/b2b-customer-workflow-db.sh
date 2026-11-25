#!/usr/bin/env bash
# Run against a fresh, socket-only local PostgreSQL cluster. No hosted DB URL is accepted.
set -euo pipefail
cd "$(dirname "$0")/.."
work=$(mktemp -d /tmp/hl-b2b-pg.XXXXXX)
cleanup() {
  pg_ctl -D "$work/db" stop -m immediate >/dev/null 2>&1 || true
  rm -r -- "$work"
}
trap cleanup EXIT
initdb -D "$work/db" --auth=trust --locale=C --encoding=UTF8 >/dev/null
pg_ctl -D "$work/db" -l "$work/server.log" -o "-c listen_addresses='' -c unix_socket_directories=$work" -w start >/dev/null
psql -Xq -v ON_ERROR_STOP=1 -h "$work" -U "$(id -un)" -d postgres \
  -f tests/sql/b2b-customer-workflow-fixture.sql \
  -f supabase/migrations/0111_b2b_customer_workflow.sql \
  -f tests/sql/b2b-customer-workflow.sql
