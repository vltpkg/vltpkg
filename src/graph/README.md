![graph](https://github.com/user-attachments/assets/dfbed9e0-8ef0-4a43-993d-d3e5d1e5ae1d)

# @vltpkg/graph

This is the graph library responsible for representing the packages
that are involved in a given install.

**[Overview](#overview)** · **[Concepts](#concepts)** ·
**[Architecture](#architecture)** · **[API](#api)** ·
**[Usage](#usage)** · **[Related Workspaces](#related-workspaces)** ·
**[References](#references)**

## Overview

The `@vltpkg/graph` workspace models a project's dependency
relationships and drives npm-compatible installs by computing how
`node_modules` should be structured. It exposes a public API through
`src/index.ts` that re-exports core types and workflows.

At a glance:

- `Graph` encapsulates the full dependency graph for a project
  (including monorepo workspaces), and is the source of truth for how
  to lay out `node_modules`.
- `Node` represents a unique package instance (uniqueness provided by
  `@vltpkg/dep-id`).
- `Edge` represents a dependency relationship from a dependent to a
  dependency (eg. `dependencies`, `devDependencies`,
  `peerDependencies`, etc.).
- `Diff` describes the minimal set of changes required to transform an
  Actual graph (disk) into an Ideal graph (desired outcome), which is
  then applied by the `reify` subsystem.

## Concepts

- Importers: Root-level nodes used as starting points of the graph.
  The `mainImporter` is the project root (its `package.json`), and the
  remaining importers are workspaces discovered by
  `@vltpkg/workspaces`.
- Hidden Lockfile: A performance optimization stored at
  `node_modules/.vlt-lock.json` mirroring the current on-disk state to
  accelerate subsequent loads of the Actual graph.
- Modifiers: Configuration for selectively altering dependency
  resolution; Ideal/Actual builders support skipping node loads when
  modifiers change.

## API

### `actual.load({ projectRoot: string }): Graph`

Recursively loads the `node_modules` folder found at `projectRoot` in
order to create a graph representation of the current installed
packages.

### `async ideal.build({ projectRoot: string }): Promise<Graph>`

This method returns a new `Graph` object, reading from the
`package.json` file located at `projectRoot` dir and building up the
graph representation of nodes and edges from the files read from the
local file system.

### `lockfile.load({ mainManifest: Manifest, projectRoot: string }): Graph`

Loads the lockfile file found at `projectRoot` and returns the graph.

### `reify(options): Promise<Diff>`

Computes a `Diff` between the Actual and Ideal graphs and applies the
minimal filesystem changes (creating/deleting links, writing
lockfiles, hoisting, lifecycle scripts) to make the on-disk install
match the Ideal graph.

## Usage

Here's a quick example of how to use the `@vltpkg/graph.ideal.build`
method to build a graph representation of the install defined at the
`projectRoot` directory.

```
import { ideal } from '@vltpkg/graph'

const graph = await ideal.build({ projectRoot: process.cwd() })
```

### Load Actual Graph and Reify

```ts
import { actual, ideal, reify } from '@vltpkg/graph'

// Load current on-disk state
const from = actual.load({
  projectRoot: process.cwd(),
  packageJson,
  scurry,
})

// Build intended end state (may start from lockfile or actual)
const to = await ideal.build({
  projectRoot: process.cwd(),
  packageInfo,
  packageJson,
  scurry,
})

// Apply minimal changes to match Ideal
await reify({
  graph: to,
  actual: from,
  packageInfo,
  packageJson,
  scurry,
})
```

### Working With Lockfiles

```ts
import { lockfile } from '@vltpkg/graph'

// Load virtual graph from vlt-lock.json
const g = lockfile.load({
  projectRoot,
  mainManifest,
  packageJson,
  scurry,
})

// Save both lockfile formats
lockfile.save({ graph: g, projectRoot, packageJson, scurry })
```

## Architecture

Graph construction modes supported by the library:

- Virtual Graphs (lockfile-based)
  - Load and save via `src/lockfile/load.ts` and
    `src/lockfile/save.ts`
  - Hidden lockfile: `node_modules/.vlt-lock.json` for faster loads

- Actual Graphs (filesystem-based)
  - Loaded by traversing `node_modules` via `src/actual/load.ts`
  - May shortcut to Hidden Lockfile if present and valid
  - File layout changes are performed by `src/reify/`

- Ideal Graphs (desired end state)
  - Entry: `src/ideal/build.ts`
  - Starts from Virtual (preferred) or falls back to Actual
  - Merges `add`/`remove` input with importer manifests using
    `src/ideal/get-importer-specs.ts`
  - Fetches and expands manifests using `@vltpkg/package-info`, reuses
    existing nodes that satisfy specs

Finally, `src/diff.ts` computes changes and `src/reify/` applies them
to the filesystem.

## Related Workspaces

- `@vltpkg/dep-id`: Unique IDs for packages, ensuring `Node` identity
- `@vltpkg/spec`: Parse/normalize dependency specifiers and registry
  semantics
- `@vltpkg/semver`: Semantic version parsing/comparison
- `@vltpkg/package-info`: Fetch remote manifests and artifacts
  (registry, git, tarball)
- `@vltpkg/package-json`: Read and cache local `package.json` files
- `@vltpkg/workspaces`: Monorepo workspace discovery and grouping

## References

- package.json format and behavior:
  <https://docs.npmjs.com/cli/v11/configuring-npm/package-json>
- Semantic Versioning: <https://semver.org/spec/v2.0.0.html>
- Monorepos: <https://monorepo.tools>
