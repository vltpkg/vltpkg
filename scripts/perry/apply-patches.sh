#!/usr/bin/env bash
# Applies every patch in perry-patches/ to the installed tree.
#
# Patches are named `<name>@<version>.patch` and are diffed against the
# package root, so they apply with `patch -p1` from
# `node_modules/.vlt/~npm~<name>@<version>/node_modules/<name>`. An install
# rewrites the store, so this reruns after every install; it is idempotent
# and re-applying an already-patched tree is a no-op, not an error.
#
#   ./scripts/perry/apply-patches.sh          apply (idempotent)
#   ./scripts/perry/apply-patches.sh --check  fail if any patch is not applied
#
# `--check` is the CI reapply gate: fresh install -> apply -> check -> compile.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATCHES="$ROOT/perry-patches"
STORE="$ROOT/node_modules/.vlt"
CHECK=""
[ "${1:-}" = "--check" ] && CHECK=1

shopt -s nullglob
FILES=("$PATCHES"/*.patch)
if [ ${#FILES[@]} -eq 0 ]; then
  echo "no patches in perry-patches/"
  exit 0
fi

FAILED=0
for f in "${FILES[@]}"; do
  base="$(basename "$f" .patch)"          # e.g. rimraf@6.1.3 or @scope+name@1.2.3
  name="${base%@*}"
  version="${base##*@}"
  # the store spells a scoped name with `+`; the package dir keeps the slash
  dir="$STORE/~npm~${name//\//+}@${version}/node_modules/${name}"
  if [ ! -d "$dir" ]; then
    echo "  skip  $base — not installed ($dir)"
    continue
  fi
  if patch -p1 -d "$dir" --dry-run --reverse --force <"$f" >/dev/null 2>&1; then
    echo "  ok    $base — already applied"
    continue
  fi
  if [ -n "$CHECK" ]; then
    echo "  FAIL  $base — not applied"
    FAILED=1
    continue
  fi
  if patch -p1 -d "$dir" --forward <"$f" >/dev/null; then
    echo "  apply $base"
  else
    echo "  FAIL  $base — patch did not apply cleanly; the version may have moved"
    FAILED=1
  fi
done

exit $FAILED
