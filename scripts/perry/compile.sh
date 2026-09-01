#!/usr/bin/env bash
# Compile with the @perryts/perry version pinned in package.json.
#
#   scripts/perry/compile.sh <entry.ts> <out> [perry compile args...]
#
# Runs `vlxl perry compile`. `--` keeps perry flags from being parsed as
# vlt config. PERRY_COMPILE_LOG keeps the driver output. Exit 0 = a runnable
# binary at <out>.
set -euo pipefail

[ $# -ge 2 ] || { echo "usage: compile.sh <entry> <out> [args...]" >&2; exit 2; }
SRC="$1"; OUT="$2"; shift 2

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

# The "with stdlib" link needs perry-ext-http, which the npm toolchain does
# not ship (see ext-http-stub.c). Perry links through `cc` off PATH, so a shim
# appends the stub archive to that one link line and leaves everything else --
# lib order, frameworks, dead-strip, the runtime-only path -- to the driver.
SHIM="$ROOT/node_modules/.cache/perry/link-shim"
STUB="$SHIM/libperry_ext_http.a"
CC_REAL="$(command -v cc)" || { echo "compile.sh: cc not found" >&2; exit 1; }
mkdir -p "$SHIM"
if [ ! -e "$STUB" ] || [ "$ROOT/scripts/perry/ext-http-stub.c" -nt "$STUB" ]; then
  "$CC_REAL" -c -O2 -o "$SHIM/ext-http-stub.o" "$ROOT/scripts/perry/ext-http-stub.c"
  rm -f "$STUB"
  ar rcs "$STUB" "$SHIM/ext-http-stub.o"
fi
# The shim drops its own dir from PATH before handing off: a ccache/distcc `cc`
# re-resolves `cc` from PATH and would otherwise recurse back in here.
cat >"$SHIM/cc" <<SHIMEOF
#!/usr/bin/env bash
clean=; IFS=:
for p in \$PATH; do [ "\$p" = "$SHIM" ] || clean="\${clean:+\$clean:}\$p"; done
unset IFS
export PATH="\$clean"
for a in "\$@"; do
  case "\$a" in *libperry_stdlib.a) exec "$CC_REAL" "\$@" "$STUB" ;; esac
done
exec "$CC_REAL" "\$@"
SHIMEOF
chmod +x "$SHIM/cc"
export PATH="$SHIM:$PATH"

LOG="${PERRY_COMPILE_LOG:-$(mktemp)}"
cleanup() { [ -n "${PERRY_COMPILE_LOG:-}" ] || rm -f "$LOG"; }
trap cleanup EXIT

if "${PERRY[@]}" compile "$SRC" -o "$OUT" "$@" >"$LOG" 2>&1; then
  echo "compile.sh: perry" >&2
  exit 0
fi

cat "$LOG" >&2
exit 1
