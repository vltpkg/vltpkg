---
title: '@vltpkg/graph'
---

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
  resolution via DSS queries in `vlt.json`.
- Peer Contexts: Isolation mechanism for peer dependencies that allows
  multiple versions of the same package when peer requirements differ.

## API

### `actual.load(options): Graph`

Recursively loads the `node_modules` folder found at `projectRoot` in
order to create a graph representation of the current installed
packages.

### `ideal.build(options): Promise<Graph>`

Builds the ideal dependency graph by loading from lockfile (preferred)
or actual graph, then expanding dependencies by fetching manifests.
Requires `packageInfo` and `remover` in addition to standard options.

### `lockfile.load(options): Graph`

Loads the lockfile file found at `projectRoot` and returns the graph.

### `lockfile.save(options): void`

Saves the graph to `vlt-lock.json`.

### `reify(options): Promise<ReifyResult>`

Computes a `Diff` between the Actual and Ideal graphs and applies the
minimal filesystem changes (creating/deleting links, writing
lockfiles, hoisting, lifecycle scripts) to make the on-disk install
match the Ideal graph. Returns `{ diff, buildQueue }`.

### `install(options, add?): Promise<{ graph, diff, buildQueue, skills? }>`

High-level install orchestration that handles graph building, reify,
and lockfile management. Supports `--frozen-lockfile`,
`--clean-install`, and `--lockfile-only` modes. With `allowSkills` (a
DSS query whose selectors may end with `:skill()`, validated up
front), links the agent skills of matching packages afterwards (see
`linkSkills`) into `skillsDirs` (unset: detected) and returns the
result as `skills`. Unset or `:not(*)`: no skills work, the skills
code is not loaded. `update` and `uninstall` take `allowSkills` too.

### `listSkills(options): Promise<{ project, graph, skills, dirs, skipped? }>`

Lists the agent skills (dirs with a `SKILL.md`, see
https://agentskills.io/specification) shipped by installed packages in
the vlt store and the project's workspaces (a root `SKILL.md`, then
`<dir>/SKILL.md` in `skills/`, `dist/skills/` and `.agents/skills/`;
the first skill of a name wins), from one version per package (a
direct dep or workspace, else the highest), with the agent skill dirs
each is linked in, `project`: the main importer name, and the `graph`.
`options.target` is a DSS query selecting packages (default `*`); a
selector ending with `:skill(<name>, …)` keeps only those skills of
its packages. Creates nothing.

### `linkSkills(options): Promise<LinkSkillsResult>`

Links the skills picked by `options.target` (as in `listSkills`; comma
lists are a union) into each agent skill dir (junctions on Windows):
`options.skillsDirs`, else `.agents/skills`, plus `<folder>/skills`
for each agent folder at the project root, `.claude/skills` inside
Claude Code (`options.env`), and existing `.<name>/skills` dirs. Dirs
must resolve inside the project, not in `node_modules` (else
`skipped`, as are fs errors) and are created only when a skill is
picked. One package per name, among picked skills, in every dir: the
one the first existing link points to while its skill is installed,
else a direct dep or workspace, then DepID; the others are reported in
`conflicts` as `<mount> (<package>)`. Installs keep a dir's link to
another installed skill. A link follows its package to the picked
version. Then removes links whose skill is no longer installed:
dangling, package not in the graph, or no longer shipped. With
`options.apply`, also removes every other vlt link in the scanned
dirs. Only vlt links (into a `node_modules/.vlt` store, or listed in
the dir's `.gitignore` block and pointing to a workspace or dangling)
are ever replaced or removed; anything else in the way is reported in
`conflicts`. Keeps a marked block of link names in each dir's
`.gitignore` (`gitignore` lists the ones it could not edit). Linked
packages get private copies of files hardlinked from the global store.
`:skill()` patterns that match no skill of their packages are returned
in `unmatched`. Security queries fail closed: skills of npm registry
packages with no security data are left out (in `listSkills` too) and
returned in `unscanned` with `unscannedReason` (by `linkSkills`:
unless still linked).

### `assertQuery(selector, flag, partSelectors?): Promise<void>`

Throws `EUSAGE` unless `selector` is a valid DSS query.
`partSelectors` (e.g. `['skill']`) allows `:skill()`.

### `hasSkills(node): Promise<boolean>`

`:skills` provider for `Query`: true when an installed package ships
agent skills, as `listSkills` finds them.

### `mermaidOutput(graph): string`

Generates Mermaid flowchart syntax from graph data. `graph.children`
(`Map<DepID, { label, edge? }[]>`) draws leaves under nodes, e.g.
`vlt skills list` skills.

### `humanReadableOutput(graph, options): string`

Generates ASCII tree output with optional colors. Used in `vlt ls`.

### `jsonOutput(graph): JSONOutputItem[]`

Returns array of `{name, fromID, spec, type, to, overridden}` items.

## Usage

### High-Level Install

```ts
import { install } from '@vltpkg/graph'

const { graph, diff, buildQueue } = await install({
  projectRoot: process.cwd(),
  packageInfo,
  packageJson,
  scurry,
  allowScripts: '*',
})
```

### Load Actual Graph and Reify

```ts
import { actual, ideal, reify } from '@vltpkg/graph'
import { RollbackRemove } from '@vltpkg/rollback-remove'

const remover = new RollbackRemove()

// Load current on-disk state
const from = actual.load({
  projectRoot: process.cwd(),
  packageJson,
  scurry,
  loadManifests: true,
})

// Build intended end state (may start from lockfile or actual)
const to = await ideal.build({
  projectRoot: process.cwd(),
  packageInfo,
  packageJson,
  scurry,
  remover,
})

// Apply minimal changes to match Ideal
const { diff, buildQueue } = await reify({
  graph: to,
  actual: from,
  packageInfo,
  packageJson,
  scurry,
  remover,
  allowScripts: '*',
})
```

### Working With Lockfiles

```ts
import { lockfile } from '@vltpkg/graph'

// Load virtual graph from vlt-lock.json
const graph = lockfile.load({
  projectRoot,
  mainManifest,
  packageJson,
})

// Save to vlt-lock.json
lockfile.save({ graph })
```

### Graph Visualization

```ts
import {
  mermaidOutput,
  humanReadableOutput,
  jsonOutput,
} from '@vltpkg/graph'

// Mermaid flowchart (for docs, dashboards)
const mermaid = mermaidOutput({
  edges: [...graph.edges],
  nodes: [...graph.nodes.values()],
  importers: graph.importers,
})

// ASCII tree with colors (used in `vlt ls`)
const tree = humanReadableOutput(
  {
    edges: [...graph.edges],
    nodes: [...graph.nodes.values()],
    importers: graph.importers,
  },
  { colors: true },
)

// JSON array of dependency items
const json = jsonOutput({
  edges: [...graph.edges],
  nodes: [...graph.nodes.values()],
  importers: graph.importers,
})
```

## Architecture

Graph construction modes supported by the library:

- Virtual Graphs (lockfile-based)
  - Load and save via `src/lockfile/load.ts` and
    `src/lockfile/save.ts`
  - Hidden lockfile: `node_modules/.vlt-lock.json` for faster loads
  - 📖 [Lockfile README](./src/lockfile/README.md)

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
  - 📖 [Ideal README](./src/ideal/README.md)

Finally, `src/diff.ts` computes changes and `src/reify/` applies them
to the filesystem.

- 📖 [Reify README](./src/reify/README.md)
- 📖 [Architecture Guide](./ARCHITECTURE.md)

## Related Workspaces

- `@vltpkg/dep-id`: Unique IDs for packages, ensuring `Node` identity
- `@vltpkg/spec`: Parse/normalize dependency specifiers and registry
  semantics
- `@vltpkg/semver`: Semantic version parsing/comparison
- `@vltpkg/satisfies`: Check if a DepID satisfies a Spec
- `@vltpkg/package-info`: Fetch remote manifests and artifacts
  (registry, git, tarball)
- `@vltpkg/package-json`: Read and cache local `package.json` files
- `@vltpkg/workspaces`: Monorepo workspace discovery and grouping
- `@vltpkg/rollback-remove`: Safe file removal with rollback
  capability
- `@vltpkg/vlt-json`: Load `vlt.json` configuration (modifiers, etc.)

## References

- package.json format and behavior:
  [https://docs.npmjs.com/cli/v11/configuring-npm/package-json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)
- Semantic Versioning:
  [https://semver.org/spec/v2.0.0.html](https://semver.org/spec/v2.0.0.html)
- Monorepos: [https://monorepo.tools](https://monorepo.tools)
