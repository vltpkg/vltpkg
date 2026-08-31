#!/usr/bin/env bash
# Dark test for the ×4 detached workers. Compiles the daemon dispatch
# with all four worker closures, drives each worker through VLT_INTERNAL_CMD + EOT-terminated
# stdin payloads — exactly how the compiled parent spawns them — and runs
# the same scenarios under Node, then diffs.
#
# security-archive-update only exercises the no-work path (empty expired
# list → exit 1): its API endpoint is hardcoded to socket.dev, so the
# fetch half is not hermetically testable. Payload parse + dispatch +
# clean exit are.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
WORK="${DARK_WORK:-$(mktemp -d)}"
mkdir -p "$WORK"
trap '[ -n "${DARK_WORK:-}" ] || rm -rf "$WORK"; [ -z "${SERVER_PID:-}" ] || kill "$SERVER_PID" 2>/dev/null || true' EXIT

# The graph pulls four packages' closures; guard the compile so an OOM
# kills it and not the shell around it (see Host limits in the WIP doc).
choom() { bash -c 'echo 1000 > /proc/self/oom_score_adj 2>/dev/null || true; exec "$@"' -- "$@"; }
choom "$ROOT/scripts/perry/compile.sh" "$HERE/entry.ts" "$WORK/daemons"

PORT_FILE="$WORK/port"
node "$ROOT/scripts/perry/dark/transport/server.mjs" >"$PORT_FILE" &
SERVER_PID=$!
for _ in $(seq 50); do [ -s "$PORT_FILE" ] && break; sleep 0.1; done
BASE="http://127.0.0.1:$(head -1 "$PORT_FILE")"

EOT=$'\x04'

# scenario <mode-dir> <runner...>: setup fixtures, drive all 4 workers,
# collect exit codes, verify → $WORK/<mode-dir>.json
scenario() {
  local mode="$1"; shift
  local W="$WORK/$mode"
  mkdir -p "$W"
  node --experimental-strip-types --no-warnings "$HERE/setup.ts" "$W" "$BASE" >/dev/null

  local unzip_rc=0 reval_rc=0 rm_rc=0 sa_rc=0
  printf 'gz1\0%s' "$EOT" |
    VLT_INTERNAL_CMD=cache-unzip "$@" "$W/unzip-cache" || unzip_rc=$?
  printf 'GET %s/conditional\0%s' "$BASE" "$EOT" |
    VLT_INTERNAL_CMD=cache-revalidate "$@" "$W/reval" || reval_rc=$?
  printf '%s\0%s\0%s' "$W/rm/a" "$W/rm/b" "$EOT" |
    VLT_INTERNAL_CMD=rollback-remove "$@" || rm_rc=$?
  printf '{"dbPath":"%s","retries":0,"ttl":1000,"expired":[]}%s' "$W/sa.db" "$EOT" |
    VLT_INTERNAL_CMD=security-archive-update "$@" || sa_rc=$?
  printf '{"unzip":%d,"revalidate":%d,"remove":%d,"securityArchive":%d}' \
    "$unzip_rc" "$reval_rc" "$rm_rc" "$sa_rc" >"$W/exits.json"

  curl -fsS "$BASE/hits" >"$W/hits.json"
  node --experimental-strip-types --no-warnings "$HERE/verify.ts" "$W" "$BASE" >"$WORK/$mode.json"
}

scenario compiled "$WORK/daemons"
scenario node node --experimental-strip-types --no-warnings "$HERE/entry.ts"

node -e '
const fs = require("node:fs")
const [c, n] = ["compiled", "node"].map(f =>
  JSON.parse(fs.readFileSync(process.argv[1] + "/" + f + ".json", "utf8")))
let bad = 0
for (const k of Object.keys(n)) {
  const ok = JSON.stringify(c[k]) === JSON.stringify(n[k])
  if (!ok) bad++
  console.log(`  ${ok ? "ok  " : "FAIL"} ${k}${ok ? "" : `\n    compiled ${JSON.stringify(c[k])}\n    node     ${JSON.stringify(n[k])}`}`)
}
process.exit(bad ? 1 : 0)
' "$WORK"
echo "daemons dark test: pass"
