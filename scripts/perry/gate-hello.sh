#!/usr/bin/env bash
# Compile gate: pinned Perry compiles the hello-world probe to a runnable binary.
# Same script runs locally and in CI (.github/workflows/perry.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PERRY_DIR="$("$ROOT/scripts/perry/setup-toolchain.sh")"
PERRY="$PERRY_DIR/perry"

# Perry's LLVM backend shells out to clang; it is not bundled.
if [ -z "${PERRY_LLVM_CLANG:-}" ] && ! command -v clang >/dev/null; then
  for c in /home/linuxbrew/.linuxbrew/opt/llvm*/bin/clang \
    /opt/homebrew/opt/llvm*/bin/clang /usr/lib/llvm-*/bin/clang /usr/bin/clang-*; do
    [ -x "$c" ] && { export PERRY_LLVM_CLANG="$c"; break; }
  done
fi
if [ -z "${PERRY_LLVM_CLANG:-}" ] && ! command -v clang >/dev/null; then
  echo "gate-hello: clang not found; install clang or set PERRY_LLVM_CLANG" >&2
  exit 1
fi

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

echo "== perry $("$PERRY" --version | awk '{print $2}') @ $PERRY_DIR"
"$PERRY" check "$ROOT/scripts/perry/hello.ts"
"$PERRY" compile "$ROOT/scripts/perry/hello.ts" -o "$OUT/perry-hello"

ACTUAL="$("$OUT/perry-hello")"
EXPECTED='hello from perry'
[ "$ACTUAL" = "$EXPECTED" ] || {
  echo "gate-hello: bad output: want '$EXPECTED', got '$ACTUAL'" >&2
  exit 1
}

SIZE="$(wc -c <"$OUT/perry-hello" | tr -d ' ')"
echo "== gate pass: binary ran, $((SIZE / 1024))KB"
