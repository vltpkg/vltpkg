#!/usr/bin/env bash
# Reporter dark test. Compiles the perry/tui install reporter and drives it with the
# same events an install emits, then checks the frames it painted.
#
# There is no Node side to diff against: the Ink reporter it replaces cannot
# compile, and this one cannot run under Node. So the assertions are on the
# text of the final frame, which is what matters to the user.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
WORK="${DARK_WORK:-$(mktemp -d)}"
trap '[ -n "${DARK_WORK:-}" ] || rm -rf "$WORK"' EXIT

"$ROOT/scripts/perry/compile.sh" "$HERE/entry.ts" "$WORK/reporter"
"$WORK/reporter" >"$WORK/out.txt" 2>&1 || {
  echo "  FAIL the reporter binary exited non-zero"; cat "$WORK/out.txt"; exit 1
}

# Strip ANSI, then strip whitespace. `render()` diffs against the previous
# frame and only emits the cells that changed — and a space is identical to
# the cleared cell behind it, so spaces never reach stdout at all. The bytes
# are the content, not the layout, so the assertions have to be too.
# ESC via $'…' — BSD sed does not interpret \x1b.
ESC=$'\x1b'
sed -e "s/$ESC\\[[0-9;?]*[a-zA-Z]//g" -e "s/$ESC[()][A-Z0-9]//g" \
  "$WORK/out.txt" | tr -d ' \t\r\n' >"$WORK/plain.txt"
echo >>"$WORK/plain.txt"

bad=0
want() {
  if grep -qF "$1" "$WORK/plain.txt"; then
    echo "  ok   $1"
  else
    echo "  FAIL missing: $1"
    bad=1
  fi
}
want 'resolvingdependencies'
want 'extractingfiles'
want '2requests'
want '1cachehit'
want 'Donein1234ms'
want '✓'
[ "$bad" = 0 ] || { echo; echo "--- painted output ---"; cat "$WORK/plain.txt"; exit 1; }

# The pty half: the same frames painted onto a real tty
# (isTTY true, real window size), via script(1).
if command -v script >/dev/null && script -qec true /dev/null >/dev/null 2>&1; then
  script -qec "$WORK/reporter" /dev/null >"$WORK/out-tty.txt" 2>&1 || {
    echo "  FAIL the reporter binary exited non-zero on a pty"
    cat "$WORK/out-tty.txt"; exit 1
  }
  sed -e "s/$ESC\\[[0-9;?]*[a-zA-Z]//g" -e "s/$ESC[()][A-Z0-9]//g" \
    "$WORK/out-tty.txt" | tr -d ' \t\r\n' >"$WORK/plain.txt"
  echo >>"$WORK/plain.txt"
  want() {
    if grep -qF "$1" "$WORK/plain.txt"; then
      echo "  ok   tty $1"
    else
      echo "  FAIL tty missing: $1"
      bad=1
    fi
  }
  want '2requests'
  want '1cachehit'
  want 'Donein1234ms'
  want '✓'
  [ "$bad" = 0 ] || { echo; echo "--- tty painted output ---"; cat "$WORK/plain.txt"; exit 1; }
else
  echo "  skip tty phase: no usable script(1) on this host"
fi
echo "reporter dark test: pass"
