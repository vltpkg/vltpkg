# @vltpkg/graph.reify

Apply graph changes to `node_modules`, transforming the actual state
to match the ideal graph.

## USAGE

```ts
import { reify } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'

const { diff, buildQueue } = await reify({
  graph, // Ideal graph to apply
  projectRoot: '/path/to/project',
  packageInfo: new PackageInfoClient({ cache }),
  packageJson: new PackageJson(),
  scurry: new PathScurry(projectRoot),
  remover: new RollbackRemove(),
  allowScripts: '*', // DSS query for packages allowed to run scripts
  // Optional
  actual, // Pre-loaded actual graph
  add, // AddImportersDependenciesMap
  remove, // RemoveImportersDependenciesMap
})
```

## Behavior

1. Computes `Diff(actual, ideal)` — returns early if no changes
2. Extracts new nodes to `.vlt` store (parallel)
3. Deletes outdated edges and their bin links
4. Creates symlinks for new edges + bin links
5. Hoists internal links to `node_modules/.vlt/node_modules/`
6. Runs lifecycle scripts (`install`, `prepare`) on allowed nodes
7. Saves lockfiles (`vlt-lock.json` + hidden)
8. Updates `package.json` if `add`/`remove` modified dependencies
9. Cleans up deleted nodes from store

## Result

```ts
type ReifyResult = {
  diff: Diff
  buildQueue?: DepID[] // Nodes that needed building
}
```

## Modules

| File                               | Purpose                      |
| ---------------------------------- | ---------------------------- |
| `index.ts`                         | Orchestrates reify process   |
| `add-nodes.ts`                     | Extract packages to store    |
| `add-edge.ts`                      | Create symlinks + bin links  |
| `delete-edge.ts`                   | Remove symlinks + bin links  |
| `internal-hoist.ts`                | Hoist preferred versions     |
| `build.ts`                         | Run lifecycle scripts        |
| `rollback.ts`                      | Revert on failure            |
| `optional-fail.ts`                 | Handle optional dep failures |
| `update-importers-package-json.ts` | Update package.json files    |
