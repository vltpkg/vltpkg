---
description: Graph workspace architecture and dependency graph concepts
globs: src/graph/**
alwaysApply: false
---
# @vltpkg/graph Overview

Dependency graph modeling installs. Foundation for the vlt installer.

## Core Classes

- **`Graph`** (`graph.ts`) — Container of nodes/edges, importer roots, resolution caches, peer contexts
- **`Node`** (`node.ts`) — Unique package instance (identity via `@vltpkg/dep-id`). Tracks build state, platform, peerSetHash
- **`Edge`** (`edge.ts`) — Dependency relationship (prod/dev/peer/optional) with parsed `Spec`
- **`Diff`** (`diff.ts`) — Minimal change set: Actual → Ideal

## Graph Variants

- **Virtual** (lockfile): `lockfile.load()` from `vlt-lock.json`; `lockfile.loadHidden()` from `node_modules/.vlt-lock.json`
- **Actual** (filesystem): `actual.load()` traverses `node_modules`; shortcut via hidden lockfile
- **Ideal** (desired state): `ideal.build()` from Virtual or Actual → fetches manifests → expands graph. Idempotent; re-running on same lockfile = identical result

After Ideal + Actual, compute `Diff` → apply via `reify()`.

## Ideal Build Pipeline (`src/graph/src/ideal/`)

1. `build.ts` — loads Virtual or Actual as starting point
2. `build-ideal-from-starting-graph.ts` — merges `add`/`remove` with importer specs
3. `refresh-ideal-graph.ts` — orders importers, calls `appendNodes()` per importer
4. `append-nodes.ts` — BFS: parallel fetch → serial mutations → peer check (see `@graph/ideal-append-nodes.mdc`)
5. `peers.ts` — peer context management (see `@graph/peers.mdc`)

## Dependencies

- `@vltpkg/dep-id` — node IDs, `joinExtra`/`splitExtra`
- `@vltpkg/spec` — spec parsing
- `@vltpkg/semver` — version satisfaction
- `@vltpkg/package-info` — remote manifests/artifacts
- `@vltpkg/package-json` — local manifest reading
- `@vltpkg/workspaces` — monorepo workspace discovery
- `@vltpkg/satisfies` — DepID↔Spec checks
- `@vltpkg/rollback-remove` — safe file removal

**Importers** = root nodes. `mainImporter` = project root. Others from workspace discovery.

## Public API (`src/graph/src/index.ts`)

- `actual.load(options)`, `ideal.build(options)`, `lockfile.load/save`, `reify(options)`
- `install(options, add?)` — high-level: validates options, loads actual, builds ideal, reifies
- Visualization: `mermaidOutput()`, `humanReadableOutput()`, `jsonOutput()`, `objectLikeOutput()`

## Tips

- Share `monorepo`, `packageJson`, `scurry` instances across phases
- Use hidden lockfile for faster Actual loads
- `graph.resetEdges()` preserves detached nodes for reuse
- Pass `actual` to `ideal.build()` for early extraction optimization

## Sub-rules

- `@graph/data-structure.mdc` — Graph/Node/Edge classes, fields, methods
- `@graph/ideal.mdc` — building ideal graphs from manifests
- `@graph/ideal-append-nodes.mdc` — BFS loop, 3-phase architecture, determinism
- `@graph/load-actual.mdc` — reading installed node_modules
- `@graph/lockfiles.mdc` — vlt-lock.json format, load/save
- `@graph/modifiers.mdc` — overrides/resolutions via DSS selectors
- `@graph/peers.mdc` — peer context isolation, forking, peerSetHash
- `@graph/reify.mdc` — applying Diff to filesystem
