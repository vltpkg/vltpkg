#!/usr/bin/env bash
# Build the vlt binary. One command, from a post-install checkout, no esbuild.
#
#   ./scripts/perry/build.sh [outdir]     default: .build-perry
#
# Produces the busybox binary plus one symlink per bin name (D4): name
# detection is `basename(argv[0])`, and an npm `.bin` shim only reports the
# right name when it targets a per-name path.
#
# The compile is wrapped so that if it outgrows the host it is the compile the
# kernel kills, not the shell that started it. A full build needs ≥8 GB.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${1:-$ROOT/.build-perry}"
ENTRY="$ROOT/scripts/perry/entry.ts"
BINS=(vlt vlr vlrx vlx vlxl)

# A full build peaked at 2.1 GB RSS and was still climbing when it was killed
# on a 3.9 GB host; the whole graph resolves, codegen is what needs the room.
# Refuse rather than march into an OOM: `oom_score_adj` decides who dies in
# one OOM event, it does not stop the next one, and the process that dies
# second is whatever else is running — a test suite, an editor, your shell.
NEED_MB="${PERRY_BUILD_MIN_MEM_MB:-8192}"
if [ -r /proc/meminfo ]; then
  HAVE_MB=$(( $(awk '/MemAvailable/{print $2}' /proc/meminfo) / 1024 ))
else
  # darwin: no /proc. Total RAM, not available — close enough for a
  # refuse-below-8GB gate on a machine class that starts at 8 GB.
  HAVE_MB=$(( $(sysctl -n hw.memsize) / 1024 / 1024 ))
fi
if [ "$HAVE_MB" -lt "$NEED_MB" ] && [ -z "${PERRY_BUILD_ALLOW_LOW_MEM:-}" ]; then
  echo "build.sh: ${HAVE_MB} MB available, want ${NEED_MB} MB." >&2
  echo "  A full compile will OOM and take other processes with it." >&2
  echo "  Set PERRY_BUILD_ALLOW_LOW_MEM=1 to try anyway, and run nothing" >&2
  echo "  else while it does — no test suite, no second build." >&2
  exit 1
fi

mkdir -p "$OUT"
( echo 1000 >/proc/self/oom_score_adj 2>/dev/null
  exec "$ROOT/scripts/perry/compile.sh" "$ENTRY" "$OUT/vlt" )

for b in "${BINS[@]:1}"; do
  ln -sf vlt "$OUT/$b"
done

echo "built $OUT/vlt ($(du -h "$OUT/vlt" | cut -f1)) + ${#BINS[@]} bin names"
