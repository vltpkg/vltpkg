#!/usr/bin/env bash
# 3g dark test. Compiles the shipped prompt path and drives it from piped
# stdin, then runs the same source under Node and diffs. Exit 0 = the compiled
# prompt reads a line the way Node's does.
#
# Not covered here: an interactive tty. That needs a pty and belongs with the
# node-pty smoke suite (Phase 4).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
WORK="${DARK_WORK:-$(mktemp -d)}"
trap '[ -n "${DARK_WORK:-}" ] || rm -rf "$WORK"' EXIT

"$ROOT/scripts/perry/compile.sh" "$HERE/entry.ts" "$WORK/prompt"

# answer1, answer2, then the registry choice
INPUT=$'yes\nsecond line\n1\n'

printf '%s' "$INPUT" | "$WORK/prompt" >"$WORK/compiled.json"
printf '%s' "$INPUT" |
  node --experimental-strip-types "$HERE/entry.ts" >"$WORK/node.json"

node -e '
const fs = require("node:fs")
const [c, n] = ["compiled", "node"].map(f =>
  JSON.parse(fs.readFileSync(process.argv[1] + "/" + f + ".json", "utf8")))
let bad = 0
if (!c.compiled) { bad++; console.log("  FAIL the compiled run did not report perry") }
else console.log("  ok   ran compiled")
for (const k of Object.keys(n)) {
  if (k === "compiled") continue
  // isTTY is undefined under Node and false compiled — a known, cosmetic
  // divergence; assert falsiness rather than identity.
  const ok = k === "stdinIsTTY" ? !c[k] === !n[k]
    : JSON.stringify(c[k]) === JSON.stringify(n[k])
  if (!ok) bad++
  console.log(`  ${ok ? "ok  " : "FAIL"} ${k}${ok ? "" : `\n    compiled ${JSON.stringify(c[k])}\n    node     ${JSON.stringify(n[k])}`}`)
}
process.exit(bad ? 1 : 0)
' "$WORK"
echo "3g dark test: pass"
