---
description: DepID format, encoding, and utilities
globs: src/dep-id/src/*,src/dep-id/test/*
alwaysApply: false
---
# DepID (`@vltpkg/dep-id`)

Universal node identity format. `~`-delimited, filesystem-safe encoded strings.

## Format

```
type~first~second[~extra]
```

- **registry**: `~~name@version` (default reg), `~npm~name@version`, `~http%3A...~name@ver`
- **git**: `git~github:user/repo~branchname`, `git~git%2Bssh%3A...~semver:1.x`
- **workspace**: `workspace~src/mything`
- **file**: `file~.` (project root), `file~./path`
- **remote**: `remote~https://example.com/pkg.tgz`

**Extra** (4th segment): stores modifier query + `peerSetHash` (e.g., `peer.1`). See `joinExtra()`/`splitExtra()`.

## Encoding

`/` → `+`, special chars use `_X` escapes: `_c` = `:`, `_t` = `~`, `__` = `_`, `_d` = trailing `.`, control chars = `_XX` hex.

## Key Functions

```typescript
// Create
getId(spec, manifest, extra?) → DepID
getTuple(spec, manifest, extra?) → DepIDTuple
joinDepIDTuple(tuple) → DepID

// Parse
splitDepID(id) → DepIDTuple  // memoized
baseDepID(id) → DepID         // strips extra
hydrate(id, name?, options?) → Spec  // back to Spec

// Extra parameter
joinExtra({ modifier?, peerSetHash? }) → string | undefined
splitExtra(extra) → { modifier?, peerSetHash? }
// Detects 'peer.' delimiter to split modifier from peerSetHash

// Cache management
resetCaches()  // call when SpecOptions change
```

## DepIDTuple

```typescript
type DepIDTuple =
  | [type: 'registry', registry: string, registrySpec: string, extra?: string]
  | [type: 'git', gitRemote: string, gitSelector: string, extra?: string]
  | [type: 'file', path: string, extra?: string]
  | [type: 'remote', url: string, extra?: string]
  | [type: 'workspace', workspace: string, extra?: string]
```

## Usage in Graph

- `Node.id` is a DepID — unique identity in `graph.nodes` map
- Resolution cache keys include `extra` for modifier/peer awareness
- Lockfile keys are DepIDs
- `hydrate()` reconstructs Spec from DepID for display/comparison

## isPackageNameConfused

```typescript
isPackageNameConfused(spec?, name?) → boolean
// true when manifest name differs from spec name (not aliased, registry type)
```
