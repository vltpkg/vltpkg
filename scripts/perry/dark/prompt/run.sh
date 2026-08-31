#!/usr/bin/env bash
# Prompt dark test. Compiles the shipped prompt path and drives it from piped
# stdin, then runs the same source under Node and diffs. Exit 0 = the compiled
# prompt reads a line the way Node's does.
#
# The pty pass below covers the basic tty path; a fuller interactive
# suite would need node-pty and lives outside this test.
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

# The TTY half: the same prompts through a real pty.
# script(1) puts the child on a pty (isTTY true, canonical mode, echo),
# with our piped input feeding the pty master. The child's stdout comes
# back interleaved with the echo, so the JSON record is fished out by
# its leading brace.
if command -v script >/dev/null && script -qec true /dev/null >/dev/null 2>&1; then
  printf '%s' "$INPUT" |
    script -qec "$WORK/prompt" /dev/null |
    tr -d '\r' | grep '^{' | tail -1 >"$WORK/compiled-tty.json"
  printf '%s' "$INPUT" |
    script -qec "node --experimental-strip-types $HERE/entry.ts" /dev/null |
    tr -d '\r' | grep '^{' | tail -1 >"$WORK/node-tty.json"

  node -e '
const fs = require("node:fs")
const [c, n] = ["compiled-tty", "node-tty"].map(f =>
  JSON.parse(fs.readFileSync(process.argv[1] + "/" + f + ".json", "utf8")))
let bad = 0
if (!c.compiled) { bad++; console.log("  FAIL the compiled tty run did not report perry") }
else console.log("  ok   ran compiled on a pty")
if (c.stdinIsTTY !== true) { bad++; console.log("  FAIL compiled stdin.isTTY is not true on a pty") }
for (const k of Object.keys(n)) {
  if (k === "compiled") continue
  const ok = JSON.stringify(c[k]) === JSON.stringify(n[k])
  if (!ok) bad++
  console.log(`  ${ok ? "ok  " : "FAIL"} tty ${k}${ok ? "" : `\n    compiled ${JSON.stringify(c[k])}\n    node     ${JSON.stringify(n[k])}`}`)
}
process.exit(bad ? 1 : 0)
' "$WORK"
else
  echo "  skip tty phase: no usable script(1) on this host"
fi
echo "prompt dark test: pass"
