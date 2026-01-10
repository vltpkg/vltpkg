# @vltpkg/graph.ideal

Build the ideal dependency graph representing the desired `node_modules` state.

## USAGE

```ts
import { ideal } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'

const graph = await ideal.build({
  projectRoot: '/path/to/project',
  packageInfo: new PackageInfoClient({ cache }),
  packageJson: new PackageJson(),
  scurry: new PathScurry(projectRoot),
  remover: new RollbackRemove(),
  // Optional: add/remove dependencies
  add,    // AddImportersDependenciesMap
  remove, // RemoveImportersDependenciesMap
  // Optional: pass actual graph for early extraction
  actual,
})
```

## Behavior

1. Loads starting graph from `vlt-lock.json` (preferred) or `node_modules`
2. Merges `add`/`remove` with importer manifest deltas
3. Fetches manifests in parallel (breadth-first)
4. Reuses existing nodes that satisfy specs
5. Handles peer dependency context isolation
6. Optionally extracts tarballs during build (early extraction)

## Add/Remove Maps

```ts
// Add dependencies to importers
const add: AddImportersDependenciesMap = new Map([
  ['file·.', new Map([['lodash', { spec, type: 'prod' }]])],
])

// Remove dependencies from importers  
const remove: RemoveImportersDependenciesMap = new Map([
  ['file·.', new Set(['unwanted-dep'])],
])
```