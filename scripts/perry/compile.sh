#!/usr/bin/env bash
# The port's compile+link step. `perry compile <entry> -o <out>`, plus the
# workaround for the pin's broken "with stdlib" link path.
#
#   scripts/perry/compile.sh <entry.ts> <out> [perry compile args...]
#
# Prints the path it took (`driver` or `manual`) to stderr; PERRY_COMPILE_LOG
# keeps the driver output. Exit 0 = a runnable binary at <out>.
#
# Why the fallback exists: libperry_stdlib.a has undefined js_ext_* references
# to the per-extension archives, and the driver only puts an archive on the
# link line when it detects the matching import. Anything reaching the full
# stdlib without importing node:http -- fetch, node:sqlite, an inline
# process.stdin.on() -- fails to link. It also asks for -lssl/-lcrypto with no
# search path. Both are packaging bugs in the release tarball, and the pin is
# the newest published release, so there is no version to bump to. We re-run
# with --no-link and link the cached objects against every ext archive
# ourselves. --allow-multiple-definition is required: each archive carries its
# own copy of Rust core.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PERRY_DIR="${PERRY_DIR:-$("$ROOT/scripts/perry/setup-toolchain.sh")}"
PERRY="$PERRY_DIR/perry"

# The LLVM backend shells out to clang; it is not bundled.
if [ -z "${PERRY_LLVM_CLANG:-}" ] && ! command -v clang >/dev/null; then
  for c in /home/linuxbrew/.linuxbrew/opt/llvm*/bin/clang \
    /opt/homebrew/opt/llvm*/bin/clang /usr/lib/llvm-*/bin/clang /usr/bin/clang-*; do
    [ -x "$c" ] && { PERRY_LLVM_CLANG="$c"; break; }
  done
fi
export PERRY_LLVM_CLANG="${PERRY_LLVM_CLANG:-}"
[ -n "$PERRY_LLVM_CLANG" ] || unset PERRY_LLVM_CLANG

# Where -lssl/-lcrypto live, if not on the default search path.
if [ -z "${PERRY_OPENSSL_LIB:-}" ]; then
  for d in /home/linuxbrew/.linuxbrew/opt/openssl@3/lib \
    /home/linuxbrew/.linuxbrew/opt/openssl/lib /usr/lib/x86_64-linux-gnu; do
    [ -e "$d/libssl.so" ] && { PERRY_OPENSSL_LIB="$d"; break; }
  done
fi
[ -n "${PERRY_OPENSSL_LIB:-}" ] && export LIBRARY_PATH="${PERRY_OPENSSL_LIB}${LIBRARY_PATH:+:$LIBRARY_PATH}"

[ $# -ge 2 ] || { echo "usage: compile.sh <entry> <out> [args...]" >&2; exit 2; }
SRC="$1"; OUT="$2"; shift 2

LOG="${PERRY_COMPILE_LOG:-$(mktemp)}"
cleanup() { [ -n "${PERRY_COMPILE_LOG:-}" ] || rm -f "$LOG"; }
trap cleanup EXIT

if "$PERRY" compile "$SRC" -o "$OUT" "$@" >"$LOG" 2>&1; then
  echo "compile.sh: driver" >&2
  exit 0
fi

if ! grep -q 'Linking (with stdlib)' "$LOG"; then
  cat "$LOG" >&2
  exit 1
fi

"$PERRY" compile --no-link "$SRC" -o "$OUT.o" "$@" >"$LOG" 2>&1 || {
  cat "$LOG" >&2; exit 1
}
mapfile -t OBJS < <(sed -n 's/.*cached object: //p' "$LOG")
[ "${#OBJS[@]}" -gt 0 ] || { echo "compile.sh: --no-link reported no objects" >&2; exit 1; }

"${PERRY_LLVM_CLANG:-clang}" -o "$OUT" "${OBJS[@]}" \
  -Wl,--allow-multiple-definition -Wl,--start-group \
  "$PERRY_DIR"/libperry_stdlib.a "$PERRY_DIR"/libperry_runtime.a \
  "$PERRY_DIR"/libperry_ext_*.a -Wl,--end-group \
  ${PERRY_OPENSSL_LIB:+-L"$PERRY_OPENSSL_LIB"} -lssl -lcrypto -lm -lpthread -ldl
echo "compile.sh: manual (${#OBJS[@]} objects)" >&2
