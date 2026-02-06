---
description: Loading Actual Graphs from node_modules
globs: src/graph/src/actual/*,src/graph/test/actual/*
alwaysApply: false
---
# Loading Actual Graphs

Entry: `src/graph/src/actual/load.ts` → `actual.load(options)`

Represents what's currently installed on disk.

## Flow

1. Resolve `mainManifest` (from options or `packageJson.read()`)
2. **Fast path**: if `!skipHiddenLockfile`, try `lockfile.loadHidden()` from `node_modules/.vlt-lock.json`
3. Construct `Graph` with importers (project + workspaces)
4. Compare stored modifiers (`node_modules/.vlt/vlt.json`) to current; if changed and `skipLoadingNodesOnModifiersChange`, load importers only
5. BFS traversal from each importer's `node_modules`:
   - Read entries, descend into `@scope` folders, follow symlinks
   - Place nodes/edges, read manifests when `loadManifests=true`
6. Mark extraneous deps (on disk but not declared), add dangling edges for missing deps
7. `modifiers.rollbackActiveEntries()` to clean up
8. Cache loaded graph to hidden lockfile

**Helpers**: `readDir()` (scans `node_modules`), `parseDir()` (places packages, applies modifiers, queues BFS)

## Identity/Path Handling

- Path-based specs → `getPathBasedId()`
- Store-based → `findDepID()` walks parents to `.vlt/` layout
- `node.location` = relative path like `./node_modules/...`

## Modifier Application

`maybeApplyModifierToSpec()`: calls `modifiers.tryDependencies()` before placing, swaps spec if complete breadcrumb match (marks as `overridden`).

## Options

- `projectRoot`, `packageJson`, `scurry` (required), `monorepo?`, `mainManifest?`
- `modifiers?` — active modifiers for spec resolution
- `loadManifests?: boolean` — true: accurate dep types, extraneous/missing detection; false: infer prod edges, no missing/extraneous
- `skipHiddenLockfile?` — skip fast path
- `skipLoadingNodesOnModifiersChange?` — importers only if modifiers changed
- `expectLockfile?` — fail if lockfile missing/stale (CI)
- `frozenLockfile?` — stricter: fail if out of sync with package.json
- `lockfileOnly?` — only update lockfile, skip node_modules operations

## Tips

- Missing deps = dangling edges (`to=undefined`); extraneous in `graph.extraneousDependencies`
- Common usage: diff Actual vs Ideal → reify
- Prefer hidden lockfile fast path when available
- Reuse shared instances across phases
