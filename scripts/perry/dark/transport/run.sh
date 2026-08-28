#!/usr/bin/env bash
# 3a dark test. Compiles the real RegistryClient and runs it against a Node
# fixture registry, then runs the same source under Node and diffs. Exit 0 =
# the compiled fetch transport behaves like the undici one.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
WORK="${DARK_WORK:-$(mktemp -d)}"
PORT="${DARK_PORT:-18401}"
trap 'kill "${SRV:-0}" 2>/dev/null || true; [ -n "${DARK_WORK:-}" ] || rm -rf "$WORK"' EXIT

node "$HERE/server.mjs" "$PORT" >"$WORK/port" 2>&1 &
SRV=$!
for _ in $(seq 1 40); do [ -s "$WORK/port" ] && break; sleep 0.1; done
BASE="http://127.0.0.1:$PORT"

"$ROOT/scripts/perry/compile.sh" "$HERE/entry.ts" "$WORK/transport"

"$WORK/transport" "$BASE" "$WORK/cache-compiled" >"$WORK/compiled.json"
node --experimental-strip-types "$HERE/entry.ts" "$BASE" "$WORK/cache-node" \
  >"$WORK/node.json"

node -e '
const fs = require("node:fs")
const [c, n] = ["compiled", "node"].map(f =>
  JSON.parse(fs.readFileSync(process.argv[1] + "/" + f + ".json", "utf8")))
let bad = 0
const eq = (k, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b)
  if (!ok) bad++
  console.log(`  ${ok ? "ok  " : "FAIL"} ${k}${ok ? "" : `\n    compiled ${JSON.stringify(a)}\n    node     ${JSON.stringify(b)}`}`)
}
if (c.backend === n.backend) { bad++; console.log(`  FAIL backends did not differ: both ${c.backend}`) }
else console.log(`  ok   backend compiled=${c.backend} node=${n.backend}`)
if (!c.compiled) { bad++; console.log("  FAIL the compiled run did not report perry") }
for (const k of Object.keys(n)) if (k !== "backend" && k !== "compiled") eq(k, c[k], n[k])
process.exit(bad ? 1 : 0)
' "$WORK"
echo "3a dark test: pass"
