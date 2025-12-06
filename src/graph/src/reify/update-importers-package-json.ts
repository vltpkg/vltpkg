import type { DepID } from '@vltpkg/dep-id'
import { splitDepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { PackageJson } from '@vltpkg/package-json'
import type {
  DependencyTypeLong,
  DependencyTypeShort,
  NormalizedManifest,
} from '@vltpkg/types'
import { longDependencyTypes } from '@vltpkg/types'
import type {
  AddImportersDependenciesMap,
  Dependency,
  RemoveImportersDependenciesMap,
} from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import { resolveSaveType } from '../resolve-save-type.ts'
import { calculateSaveValue } from './calculate-save-value.ts'

const depTypesMap = new Map<DependencyTypeShort, DependencyTypeLong>([
  ['prod', 'dependencies'],
  ['dev', 'devDependencies'],
  ['peer', 'peerDependencies'],
  ['peerOptional', 'peerDependencies'],
  ['optional', 'optionalDependencies'],
])

export type UpdatePackageJsonOptions = {
  /**
   * A `Map` in which keys are {@link DepID} linking to another `Map` in which
   * keys are the dependency names and values are {@link Dependency}. This
   * structure represents dependencies that need to be added to the importer
   * represented by {@link DepID}.
   */
  add?: AddImportersDependenciesMap
  /**
   * A `Map` object representing nodes to be removed from the ideal graph.
   * Each {@link DepID} key represents an importer node and the `Set` of
   * dependency names to be removed from its dependency list.
   */
  remove?: RemoveImportersDependenciesMap
  /**
   * The {@link Graph} instance that contain the importer nodes to which
   * the manifest data (and it's corresponding `package.json` file) are
   * going to be updated.
   */
  graph: Graph
  /**
   * An instance of {@link PackageJson} to use when writing updated manifest
   * data to `package.json` files. It's necessary that this is the same
   * instance used to load these `package.json` files previously.
   */
  packageJson: PackageJson
}

const addOrRemoveDeps = (
  nodeId: DepID,
  graph: Graph,
  addOrRemove?:
    | AddImportersDependenciesMap
    | RemoveImportersDependenciesMap,
): NormalizedManifest | undefined => {
  const node = graph.nodes.get(nodeId)
  if (!node) {
    throw error('Failed to retrieve node', {
      found: nodeId,
    })
  }
  const manifest = node.manifest
  if (!manifest) {
    throw error('Could not find manifest data for node', {
      found: nodeId,
    })
  }
  const deps = addOrRemove?.get(nodeId)
  /* c8 ignore start -- impossible but TS doesn't know that */
  if (!deps) {
    throw error('Failed to retrieve added deps info', {
      manifest,
    })
  }
  let manifestChanged = false
  /* c8 ignore stop */
  for (const deleteNameOrAddItem of deps) {
    if (typeof deleteNameOrAddItem === 'string') {
      const name = deleteNameOrAddItem
      for (const depType of longDependencyTypes) {
        if (manifest[depType]?.[name]) {
          delete manifest[depType][name]
          manifestChanged = true
        }
      }
      if (manifest.peerDependenciesMeta?.[name]) {
        delete manifest.peerDependenciesMeta[name]
        manifestChanged = true
      }
    } else {
      const [name, dep] = deleteNameOrAddItem
      // peerOptional also needs to add peerDependenciesMeta entry
      const depTypeShort = resolveSaveType(node, name, dep.type)
      const depType = depTypesMap.get(depTypeShort)
      if (!depType) {
        throw error('Failed to retrieve dependency type', {
          validOptions: [...depTypesMap.keys()],
          found: dep.type,
        })
      }
      const n = node.edgesOut.get(name)?.to
      if (!n) {
        throw error('Dependency node could not be found')
      }
      const [nodeType] = splitDepID(n.id)

      for (const dtype of longDependencyTypes) {
        if (dtype === depType || !manifest[dtype]) continue
        delete manifest[dtype][name]
      }
      if (depTypeShort === 'peerOptional') {
        manifest.peerDependenciesMeta ??= {}
        manifest.peerDependenciesMeta[name] = { optional: true }
      } else if (manifest.peerDependenciesMeta?.[name]) {
        delete manifest.peerDependenciesMeta[name]
      }

      const dependencies =
        manifest[depType] ?? (manifest[depType] = {})
      // check to see if we need to save a different version
      // - If you install a single specific version, that is deliberate,
      //   we save that exact version, no matter what.
      // - If the requested spec matches the manifest, make no change
      // If the requested spec had no bareSpec, and the manifest has
      // a dependency entry, make no change.
      // If the requested spec has a bareSpec that did NOT match the manifest,
      // then update it.
      // If the manifest does not contain anything, then update it.
      // Only for registry dependencies
      const existing = dependencies[name]
      const saveValue = calculateSaveValue(
        nodeType,
        dep.spec,
        existing,
        n.version,
      )
      dependencies[name] = saveValue
      manifestChanged = manifestChanged || saveValue !== existing
    }
  }
  return manifestChanged ? manifest : undefined
}

/**
 * Updates nodes of a provided {@link Graph} accordingly to the
 * provided add or remove arguments.
 */
export const updatePackageJson = ({
  add,
  graph,
  packageJson,
  remove,
}: UpdatePackageJsonOptions) => {
  const manifestsToUpdate = new Set<NormalizedManifest>()
  const operations = new Set([add, remove])

  for (const operation of operations) {
    if (operation) {
      // These node ids are from either importer nodes or dependencies
      // that are nested folders from which the user can also add new
      // dependencies to
      for (const nodeId of operation.keys()) {
        const manifest = addOrRemoveDeps(nodeId, graph, operation)
        if (manifest) {
          manifestsToUpdate.add(manifest)
        }
      }
    }
  }

  const commit = () => {
    for (const manifest of manifestsToUpdate) {
      packageJson.save(manifest)
    }
  }

  return commit
}
