#!/usr/bin/env bash
set -euo pipefail

# Starts its own fresh, localhost-only cluster; never connects to Supabase or an
# existing PostgreSQL server. The cluster, database and data are disposable.
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
if ! command -v pg_config >/dev/null 2>&1; then
  echo 'NOT RUN: pg_config unavailable; install a local PostgreSQL distribution' >&2
  exit 3
fi
pg_bin="$(pg_config --bindir)"
for executable in initdb pg_ctl createdb psql; do
  if [[ ! -x "$pg_bin/$executable" ]]; then
    printf 'NOT RUN: PostgreSQL executable missing: %s\n' "$executable" >&2
    exit 3
  fi
done

test_dir="$(mktemp -d "${TMPDIR:-/tmp}/hl-intel-disposable.XXXXXXXX")"
started=0
cleanup() {
  if [[ "$started" == 1 ]]; then
    if ! "$pg_bin/pg_ctl" -D "$test_dir/cluster" -m immediate -w stop >/dev/null; then
      printf 'WARNING: could not stop disposable cluster; preserved %s\n' "$test_dir" >&2
      return
    fi
  fi
  # Only delete the exact directory created above, after stopping its server.
  python3 - "$test_dir" <<'PY'
import os, shutil, sys
path = sys.argv[1]
if os.path.basename(path).startswith('hl-intel-disposable.'):
    shutil.rmtree(path)
PY
}
trap cleanup EXIT

# A local ephemeral port; pg_ctl fails safely if another server claims it first.
test_port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
test_user="$(id -un)"
"$pg_bin/initdb" -D "$test_dir/cluster" -A trust --no-locale -E UTF8 >"$test_dir/initdb.log"
"$pg_bin/pg_ctl" -D "$test_dir/cluster" -o "-h 127.0.0.1 -p $test_port -k $test_dir" \
  -l "$test_dir/postgres.log" -w start >/dev/null
started=1

candidate="$repo_root/docs/intelligence/gate0/candidate.sql"
bootstrap="$repo_root/tests/intelligence/00_bootstrap_disposable.sql"
assertions="$repo_root/tests/intelligence/20_assert_disposable.sql"
normalized="$test_dir/candidate-transactionless.sql"
# The upstream candidate has its own BEGIN/COMMIT. Remove exactly those two
# top-level lines only in the temp copy; otherwise they break psql -1 atomicity.
python3 - "$candidate" "$normalized" <<'PY'
import sys
from pathlib import Path
source = Path(sys.argv[1]).read_text()
lines = source.splitlines(keepends=True)
if sum(line.strip() == 'BEGIN;' for line in lines) != 1 or sum(line.strip() == 'COMMIT;' for line in lines) != 1:
    raise SystemExit('REFUSED: candidate has unexpected transaction boundaries')
Path(sys.argv[2]).write_text(''.join(line for line in lines if line.strip() not in ('BEGIN;', 'COMMIT;')))
PY

connection=(-X -h 127.0.0.1 -p "$test_port" -U "$test_user")
"$pg_bin/createdb" -h 127.0.0.1 -p "$test_port" -U "$test_user" hl_intel_disposable_rollback
printf 'SELECT 1/0;\n' > "$test_dir/injected_failure.sql"
if "$pg_bin/psql" "${connection[@]}" -d hl_intel_disposable_rollback --single-transaction -v ON_ERROR_STOP=1 \
  -f "$bootstrap" -f "$normalized" -f "$test_dir/injected_failure.sql" >"$test_dir/rollback.log" 2>&1; then
  echo 'FAIL: deliberately failing transaction unexpectedly succeeded' >&2
  exit 1
fi
rollback_result="$("$pg_bin/psql" "${connection[@]}" -d hl_intel_disposable_rollback -At -v ON_ERROR_STOP=1 \
  -c "SELECT to_regclass('public.hl_intel_jobs') IS NULL AND to_regclass('public.discovery_prospects') IS NULL AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')); ")"
if [[ "$rollback_result" != 't' ]]; then
  echo 'FAIL: failing transaction left fixture or candidate objects behind' >&2
  exit 1
fi
echo 'PASS: injected failure rolled back fixture, candidate and roles'

"$pg_bin/createdb" -h 127.0.0.1 -p "$test_port" -U "$test_user" hl_intel_disposable_fixture
"$pg_bin/psql" "${connection[@]}" -d hl_intel_disposable_fixture --single-transaction -v ON_ERROR_STOP=1 \
  -f "$bootstrap" -f "$normalized" -f "$assertions" >"$test_dir/fixture.log" 2>&1 || {
    cat "$test_dir/fixture.log" >&2
    exit 1
  }
echo 'PASS: V6 candidate fixture on disposable PostgreSQL'
"$pg_bin/psql" "${connection[@]}" -d hl_intel_disposable_fixture -At -c 'SHOW server_version;'

# Roles created by the fixture are cluster-wide. Reuse only those disposable
# roles in a second empty DB to run multi-session checks against fresh data.
"$pg_bin/createdb" -h 127.0.0.1 -p "$test_port" -U "$test_user" hl_intel_disposable_races
sed '/^CREATE ROLE /d' "$bootstrap" > "$test_dir/bootstrap-reuse-test-roles.sql"
"$pg_bin/psql" "${connection[@]}" -d hl_intel_disposable_races --single-transaction -v ON_ERROR_STOP=1 \
  -f "$test_dir/bootstrap-reuse-test-roles.sql" -f "$normalized" >"$test_dir/races-bootstrap.log" 2>&1 || {
    cat "$test_dir/races-bootstrap.log" >&2
    exit 1
  }
python3 "$repo_root/tests/intelligence/test-postgres-races.py" "$pg_bin/psql" "$test_port" "$test_user"
echo 'LIMIT: fixture uses stub schema and simulated roles; no current-schema, staging JWT or production checks'
