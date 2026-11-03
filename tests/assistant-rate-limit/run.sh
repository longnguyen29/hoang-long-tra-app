#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
bin="$(pg_config --bindir)"
tmp="$(mktemp -d "${TMPDIR:-/tmp}/hl-assistant-db-test.XXXXXXXX")"
started=0
cleanup() {
  if [[ "$started" = 1 ]]; then
    "$bin/pg_ctl" -D "$tmp/db" -m immediate -w stop >/dev/null || { echo "Could not stop test server; preserved $tmp" >&2; return; }
  fi
  python3 - "$tmp" <<'PY'
import os, shutil, sys
p = sys.argv[1]
if os.path.basename(p).startswith('hl-assistant-db-test.'):
    shutil.rmtree(p)
PY
}
trap cleanup EXIT
port="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
"$bin/initdb" -D "$tmp/db" -A trust --no-locale -E UTF8 >"$tmp/init.log"
"$bin/pg_ctl" -D "$tmp/db" -o "-h 127.0.0.1 -p $port -k $tmp" -l "$tmp/postgres.log" -w start >/dev/null
started=1
"$bin/createdb" -h 127.0.0.1 -p "$port" assistant_test
"$bin/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$port" -d assistant_test \
  -f "$root/tests/assistant-rate-limit/bootstrap.sql" \
  -f "$root/supabase/migrations/0098_assistant_ai_rate_limit.sql"
python3 "$root/tests/assistant-rate-limit/verify.py" "$bin" "$port"
