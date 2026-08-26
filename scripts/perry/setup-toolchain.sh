#!/usr/bin/env bash
# Install the pinned Perry toolchain (perry-toolchain.json) into a cache dir.
# Idempotent. Prints the toolchain dir (containing `perry`) on stdout.
# Override cache location with PERRY_TOOLCHAIN_DIR.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PIN="$ROOT/perry-toolchain.json"

command -v jq >/dev/null || { echo "perry setup: jq required" >&2; exit 1; }

VERSION="$(jq -r .version "$PIN")"
TAG="$(jq -r .tag "$PIN")"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) KEY=linux-x64 ;;
  Linux-aarch64 | Linux-arm64) KEY=linux-arm64 ;;
  Darwin-arm64) KEY=darwin-arm64 ;;
  Darwin-x86_64) KEY=darwin-x64 ;;
  *) echo "perry setup: unsupported host $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

FILE="$(jq -r ".assets[\"$KEY\"].file" "$PIN")"
SHA="$(jq -r ".assets[\"$KEY\"].sha256" "$PIN")"
DEST="${PERRY_TOOLCHAIN_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/vltpkg-perry}/$VERSION-$KEY"

if [ ! -x "$DEST/perry" ]; then
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  echo "perry setup: downloading $TAG $FILE (~525MB)" >&2
  curl -fsSL -o "$TMP/$FILE" \
    "https://github.com/PerryTS/perry/releases/download/$TAG/$FILE"
  ACTUAL="$(sha256sum "$TMP/$FILE" 2>/dev/null | awk '{print $1}' \
    || shasum -a 256 "$TMP/$FILE" | awk '{print $1}')"
  if [ "$ACTUAL" != "$SHA" ]; then
    echo "perry setup: sha256 mismatch for $FILE" >&2
    echo "  expected $SHA" >&2
    echo "  actual   $ACTUAL" >&2
    exit 1
  fi
  # extract to a staging dir, then rename: a killed run never leaves a
  # half-extracted dir that the `-x` check above would accept.
  mkdir -p "$TMP/x" "$(dirname "$DEST")"
  tar xzf "$TMP/$FILE" -C "$TMP/x"
  rm -rf "$DEST.partial"
  mv "$TMP/x" "$DEST.partial"
  mv "$DEST.partial" "$DEST"
fi

INSTALLED="$("$DEST/perry" --version | awk '{print $2}')"
[ "$INSTALLED" = "$VERSION" ] || {
  echo "perry setup: pinned $VERSION but $DEST/perry reports $INSTALLED" >&2
  exit 1
}

echo "$DEST"
