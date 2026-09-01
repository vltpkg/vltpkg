#!/usr/bin/env bash
# Compile with the @perryts/perry version pinned in package.json.
#
#   scripts/perry/compile.sh <entry.ts> <out> [perry compile args...]
#
# Runs `vlxl perry compile`. `--` keeps perry flags from being parsed as
# vlt config. PERRY_COMPILE_LOG keeps the driver output. Exit 0 = a runnable
# binary at <out>.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PERRY=( "$ROOT/scripts/bins/vlxl" -- perry )

if [ ! -x "$ROOT/node_modules/.bin/perry" ]; then
  echo "compile.sh: @perryts/perry is not installed. Run: vlt install" >&2
  exit 1
fi

# The LLVM backend shells out to clang; it is not bundled.
if [ -z "${PERRY_LLVM_CLANG:-}" ] && ! command -v clang >/dev/null; then
  for c in /home/linuxbrew/.linuxbrew/opt/llvm*/bin/clang \
    /opt/homebrew/opt/llvm*/bin/clang /usr/lib/llvm-*/bin/clang /usr/bin/clang-*; do
    [ -x "$c" ] && { PERRY_LLVM_CLANG="$c"; break; }
  done
fi
export PERRY_LLVM_CLANG="${PERRY_LLVM_CLANG:-}"
[ -n "$PERRY_LLVM_CLANG" ] || unset PERRY_LLVM_CLANG

# Where -lssl/-lcrypto live, if not on the default search path. On macOS
# the system libssl is not linkable; homebrew openssl is required.
if [ -z "${PERRY_OPENSSL_LIB:-}" ]; then
  for d in /home/linuxbrew/.linuxbrew/opt/openssl@3/lib \
    /home/linuxbrew/.linuxbrew/opt/openssl/lib /usr/lib/x86_64-linux-gnu \
    /opt/homebrew/opt/openssl@3/lib /usr/local/opt/openssl@3/lib; do
    [ -e "$d/libssl.so" ] || [ -e "$d/libssl.dylib" ] &&
      { PERRY_OPENSSL_LIB="$d"; break; }
  done
fi
[ -n "${PERRY_OPENSSL_LIB:-}" ] && export LIBRARY_PATH="${PERRY_OPENSSL_LIB}${LIBRARY_PATH:+:$LIBRARY_PATH}"

[ $# -ge 2 ] || { echo "usage: compile.sh <entry> <out> [args...]" >&2; exit 2; }
SRC="$1"; OUT="$2"; shift 2

LOG="${PERRY_COMPILE_LOG:-$(mktemp)}"
cleanup() { [ -n "${PERRY_COMPILE_LOG:-}" ] || rm -f "$LOG"; }
trap cleanup EXIT

if "${PERRY[@]}" compile "$SRC" -o "$OUT" "$@" >"$LOG" 2>&1; then
  echo "compile.sh: perry" >&2
  exit 0
fi

cat "$LOG" >&2
exit 1
