#!/usr/bin/env bash
set -euo pipefail

# Disposable integration check using selected repository migrations, not a
# production schema clone. Starts its own local PostgreSQL cluster and never
# uses DATABASE_URL, a hosted service, or an existing server.
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
if ! command -v pg_config >/dev/null 2>&1; then
  echo 'NOT RUN: pg_config unavailable' >&2
  exit 3
fi
pg_bin="$(pg_config --bindir)"
for executable in initdb pg_ctl createdb psql; do
  if [[ ! -x "$pg_bin/$executable" ]]; then
    printf 'NOT RUN: missing PostgreSQL executable %s\n' "$executable" >&2
    exit 3
  fi
done

fixture_dir="$(mktemp -d "${TMPDIR:-/tmp}/hl-intel-jwtclaims.XXXXXXXX")"
started=0
cleanup() {
  if [[ "$started" == 1 ]]; then
    if ! "$pg_bin/pg_ctl" -D "$fixture_dir/cluster" -m immediate -w stop >/dev/null; then
      printf 'WARNING: could not stop disposable server; preserved %s\n' "$fixture_dir" >&2
      return
    fi
  fi
  python3 - "$fixture_dir" <<'PY'
import os, shutil, sys
path = sys.argv[1]
if os.path.basename(path).startswith('hl-intel-jwtclaims.'):
    shutil.rmtree(path)
PY
}
trap cleanup EXIT

# The new server listens only on loopback. If the selected port is stolen
# between selection and startup pg_ctl fails; never fall back to another server.
port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
test_user="$(id -un)"
"$pg_bin/initdb" -D "$fixture_dir/cluster" -A trust --no-locale -E UTF8 >"$fixture_dir/init.log"
"$pg_bin/pg_ctl" -D "$fixture_dir/cluster" -o "-h 127.0.0.1 -p $port -k $fixture_dir" \
  -l "$fixture_dir/postgres.log" -w start >/dev/null
started=1
"$pg_bin/createdb" -h 127.0.0.1 -p "$port" -U "$test_user" hl_intel_disposable_jwt_claims
connection=(-X -q -h 127.0.0.1 -p "$port" -U "$test_user" -d hl_intel_disposable_jwt_claims -v ON_ERROR_STOP=1)
"$pg_bin/psql" "${connection[@]}" \
  -f "$repo_root/tests/intelligence/repo-schema-bootstrap.sql" \
  -f "$repo_root/tests/intelligence/jwt-claims-auth.sql" \
  -f "$repo_root/supabase/migrations/0057_prospect_discovery.sql" \
  -f "$repo_root/supabase/migrations/0058_prospect_contacts_and_drafts.sql" \
  -f "$repo_root/supabase/migrations/0059_prospect_account_types.sql" \
  -f "$repo_root/supabase/migrations/0060_prospect_sales_followup.sql" \
  -f "$repo_root/docs/intelligence/gate0/candidate-source-attribution-patched.sql" \
  -f "$repo_root/tests/intelligence/repo-schema-assertions.sql" \
  -f "$repo_root/tests/intelligence/jwt-claims-assertions.sql" >"$fixture_dir/check.log" 2>&1 || {
    cat "$fixture_dir/check.log" >&2
    exit 1
  }
echo 'PASS: JWT claim GUC simulation with selected repository migrations and patched candidate'
echo 'PASS: manager, second manager, employee, anon, missing/legacy claims, service privileges and DNC checks'
"$pg_bin/psql" "${connection[@]}" -At -c 'SHOW server_version;'
echo 'LIMIT: SQL sets trusted fake claim values directly; no JWT signature verification, auth server, PostgREST, real Supabase RLS or live schema checks'
