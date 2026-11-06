#!/usr/bin/env bash
set -euo pipefail
# Experimental Supabase local native stack, never linked to a hosted project.
# Fresh isolated cache/state, fake users only; downloads verified official CLI and
# service binaries on first use. No production DB_URL or ambient credentials.
repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
for executable in npx python3 psql lsof ps; do
  command -v "$executable" >/dev/null 2>&1 || { echo "NOT RUN: $executable is unavailable" >&2; exit 3; }
done
# Do not let ambient hosted credentials or PostgreSQL connection overrides reach
# this disposable local CLI process. This only affects the script subprocess.
for variable in $(compgen -e); do
  case "$variable" in SUPABASE_*|PG*|DATABASE_URL) unset "$variable" ;; esac
done
umask 077
test_dir="$(mktemp -d /tmp/hl-intel-supabase-native.XXXXXXXX)"
export SUPABASE_HOME="$test_dir/isolated-home"
export SUPABASE_EXPERIMENTAL_STACK=1
mkdir -p "$SUPABASE_HOME"
created=0
cleanup() {
  if [[ "$created" == 1 ]]; then
    if ! (cd "$test_dir" && npx --yes supabase@2.122.0 stack destroy --stack hl-intel-disposable --yes >"$test_dir/destroy.log" 2>&1); then
      printf 'WARNING: could not destroy the isolated stack. Preserved %s for safe cleanup.\n' "$test_dir" >&2
      return
    fi
  fi
  python3 - "$test_dir" <<'PY'
import shutil, sys
from pathlib import Path
p=Path(sys.argv[1])
if p.parent == Path('/tmp') and p.name.startswith('hl-intel-supabase-native.'):
    shutil.rmtree(p)
else:
    raise SystemExit('REFUSED: unexpected temporary path')
PY
}
trap cleanup EXIT
cd "$test_dir"
npx --yes supabase@2.122.0 init >"$test_dir/init.log" 2>&1
# From this point cleanup attempts to destroy only the named stack in the
# dedicated SUPABASE_HOME, including after a partial start.
created=1
npx --yes supabase@2.122.0 start --runtime native --stack hl-intel-disposable \
  --exclude realtime,storage,functions,studio,mail,analytics,pooler --preparation on-demand --eager >"$test_dir/start.log" 2>&1
npx --yes supabase@2.122.0 status --stack hl-intel-disposable --env >"$test_dir/status.json" 2>"$test_dir/status-error.log"
python3 "$repo_root/tests/intelligence/supabase-native/check-loopback.py" "$SUPABASE_HOME" "$test_dir/status.json"
python3 "$repo_root/tests/intelligence/supabase-native/verify.py" "$test_dir/status.json"
