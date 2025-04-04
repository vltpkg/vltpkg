import type { DepID } from '@vltpkg/dep-id'
import { splitDepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { PackageJson } from '@vltpkg/package-json'
import type {
  DependencyTypeLong,
  DependencyTypeShort,
  Manifest,
} from '@vltpkg/types'
import { longDependencyTypes } from '@vltpkg/types'
import type {
  AddImportersDependenciesMap,
  Dependency,
  RemoveImportersDependenciesMap,
} from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import { resolveSaveType } from '../resolve-save-type.ts'

const SAVE_PREFIX = '^'

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
  importerId: DepID,
  graph: Graph,
  addOrRemove?:
    | AddImportersDependenciesMap
    | RemoveImportersDependenciesMap,
): Manifest | undefined => {
  const importer = graph.nodes.get(importerId)
  if (!importer) {
    throw error('Failed to retrieve importer node', {
      found: importerId,
    })
  }
  const manifest = importer.manifest
  if (!manifest) {
    throw error('Could not find manifest data for node', {
      found: importerId,
    })
  }
  const deps = addOrRemove?.get(importerId)
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
      const depTypeShort = resolveSaveType(importer, name, dep.type)
      const depType = depTypesMap.get(depTypeShort)
      if (!depType) {
        throw error('Failed to retrieve dependency type', {
          validOptions: [...depTypesMap.keys()],
          found: dep.type,
        })
      }
      const node = importer.edgesOut.get(name)?.to
      if (!node) {
        throw error('Dependency node could not be found')
      }
      const [nodeType] = splitDepID(node.id)

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
      dependencies[name] =
        (
          nodeType === 'registry' &&
          (!dep.spec.final.semver || !dep.spec.final.range)
        ) ?
          dep.spec.subspec && dep.spec.namedRegistry ?
            `${dep.spec.final.namedRegistry}:${dep.spec.final.name}@${SAVE_PREFIX}${node.version}`
          : `${SAVE_PREFIX}${node.version}`
        : dep.spec.bareSpec
      manifestChanged = true
    }
  }
  return manifestChanged ? manifest : undefined
}

/**
 * Updates the importers of a provided {@link Graph} accordingly to the
 * provided add or remove arguments.
 */
export const updatePackageJson = ({
  add,
  graph,
  packageJson,
  remove,
}: UpdatePackageJsonOptions) => {
  const manifestsToUpdate = new Set<Manifest>()
  const operations = new Set([add, remove])

  for (const operation of operations) {
    if (operation) {
      for (const importerId of operation.keys()) {
        const manifest = addOrRemoveDeps(importerId, graph, operation)
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
