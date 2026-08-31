#!/usr/bin/env bash
# Dark test for @vltpkg/cache compiled (the F43/F47 blocker). Compiles the
# real Cache class, runs it against a scratch cache dir, runs the same
# source under Node against its own dir, and diffs the JSON records.
# Exit 0 = the compiled cache stores, links, fetches, walks and deletes
# the way Node's does.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
WORK="${DARK_WORK:-$(mktemp -d)}"
trap '[ -n "${DARK_WORK:-}" ] || rm -rf "$WORK"' EXIT

"$ROOT/scripts/perry/compile.sh" "$HERE/entry.ts" "$WORK/cache-dark"

"$WORK/cache-dark" "$WORK/cachedir-compiled" >"$WORK/compiled.json"
node --experimental-strip-types "$HERE/entry.ts" \
  "$WORK/cachedir-node" >"$WORK/node.json"

node -e '
const fs = require("node:fs")
const [c, n] = ["compiled", "node"].map(f =>
  JSON.parse(fs.readFileSync(process.argv[1] + "/" + f + ".json", "utf8")))
let bad = 0
if (!c.compiled) { bad++; console.log("  FAIL the compiled run did not report perry") }
else console.log("  ok   ran compiled")
for (const k of Object.keys(n)) {
  if (k === "compiled") continue
  const ok = JSON.stringify(c[k]) === JSON.stringify(n[k])
  if (!ok) bad++
  console.log(`  ${ok ? "ok  " : "FAIL"} ${k}${ok ? "" : `\n    compiled ${JSON.stringify(c[k])}\n    node     ${JSON.stringify(n[k])}`}`)
}
process.exit(bad ? 1 : 0)
' "$WORK"
echo "cache dark test: pass"
