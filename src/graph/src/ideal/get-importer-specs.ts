import { longDependencyTypes } from '@vltpkg/types'
import { shorten, asDependency } from '../dependencies.ts'
import type {
  AddImportersDependenciesMap,
  Dependency,
  RemoveImportersDependenciesMap,
} from '../dependencies.ts'
import { removeSatisfiedSpecs } from './remove-satisfied-specs.ts'
import type {
  BuildIdealAddOptions,
  BuildIdealFromGraphOptions,
  BuildIdealRemoveOptions,
  TransientAddMap,
  TransientRemoveMap,
} from './types.ts'
import type { Edge } from '../edge.ts'
import type { Node } from '../node.ts'
import type { Graph } from '../graph.ts'
import type { DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { PackageJson } from '@vltpkg/package-json'
import type { PathScurry } from 'path-scurry'

export type GetImporterSpecsOptions = BuildIdealAddOptions &
  BuildIdealFromGraphOptions &
  BuildIdealRemoveOptions &
  SpecOptions & {
    scurry: PathScurry
    packageJson: PackageJson
  }

const hasDepName = (importer: Node, edge: Edge): boolean => {
  for (const depType of longDependencyTypes) {
    const listedDeps = importer.manifest?.[depType]
    if (listedDeps && Object.hasOwn(listedDeps, edge.name))
      return true
  }
  return false
}

class AddImportersDependenciesMapImpl
  extends Map
  implements AddImportersDependenciesMap
{
  modifiedDependencies = false
}

class RemoveImportersDependenciesMapImpl
  extends Map
  implements RemoveImportersDependenciesMap
{
  modifiedDependencies = false
}

/**
 * Given a {@link Graph} and a list of {@link Dependency}, merges the
 * dependencies info found in the graph importers and returns the add & remove
 * results as a Map in which keys are {@link DepID} of each importer node.
 */
export const getImporterSpecs = (
  options: GetImporterSpecsOptions,
) => {
  const { add, graph, remove } = options
  const addResult: AddImportersDependenciesMap =
    new AddImportersDependenciesMapImpl()
  const removeResult: RemoveImportersDependenciesMap =
    new RemoveImportersDependenciesMapImpl()

  // traverse the list of importers in the starting graph
  for (const importer of graph.importers) {
    // uses a Map keying to the spec.name in order to easily make sure there's
    // only a single dependency entry for a given dependency for each importer
    const addDeps = new Map<string, Dependency>()
    const removeDeps = new Set<string>()
    // if an edge from the graph is not listed in the manifest,
    // add that edge to the list of dependencies to be removed
    for (const edge of importer.edgesOut.values()) {
      if (
        !hasDepName(importer, edge) &&
        !add.get(importer.id)?.has(edge.name)
      ) {
        removeDeps.add(edge.name)
        removeResult.modifiedDependencies = true
      }
    }
    // if a dependency is listed in the manifest but not in the graph,
    // add that dependency to the list of dependencies to be added
    for (const depType of longDependencyTypes) {
      const deps = Object.entries(importer.manifest?.[depType] ?? {})
      for (const [depName, depSpec] of deps) {
        const edge = importer.edgesOut.get(depName)

        // skip if the edge exists and already uses the same spec
        if (edge?.to && depSpec === edge.spec.bareSpec) continue

        const dependency = asDependency({
          spec: Spec.parse(depName, depSpec, options),
          type: shorten(depType, depName, importer.manifest),
        })
        addDeps.set(depName, dependency)
      }
    }
    addResult.set(importer.id, addDeps)
    removeResult.set(importer.id, removeDeps)
  }

  // Maps to store dependencies targeting non-importer nodes (e.g., nested folders)
  // These will be injected when the target node is placed in the graph
  const transientAdd = new Map() as TransientAddMap
  const transientRemove = new Map() as TransientRemoveMap

  // Traverse all nodes in the graph to find file type dependencies that are directories
  // and populate transientAdd/transientRemove with their manifest dependencies
  // Only process when scurry and packageJson are available
  for (const node of graph.nodes.values()) {
    // Skip importers as they're already handled above and also skip
    // any non-file type dependencies
    if (graph.importers.has(node) || !node.id.startsWith('file'))
      continue

    // check if this is a file type dependency that is a directory
    const nodePath = options.scurry.cwd.resolve(node.location)
    const stat = nodePath.lstatSync()

    if (stat?.isDirectory()) {
      // load the manifest for this directory (throw if it does not exist)
      const manifest = options.packageJson.read(nodePath.fullpath())

      // should always set the manifest to the read manifest
      node.manifest = manifest

      // create a map of dependencies from the manifest
      const addDeps = new Map<string, Dependency>()

      // check for edges not in manifest (should be removed)
      const removeDeps = new Set<string>()
      for (const edge of node.edgesOut.values()) {
        if (
          !hasDepName(node, edge) &&
          !add.get(node.id)?.has(edge.name)
        ) {
          removeDeps.add(edge.name)
        }
      }

      // iterate over manifest dependencies to add them if
      // they're missing from the graph
      for (const depType of longDependencyTypes) {
        const deps = Object.entries(manifest[depType] ?? {})
        for (const [depName, depSpec] of deps) {
          const edge = node.edgesOut.get(depName)

          // skip if the edge exists and already uses the same spec
          if (edge?.to && depSpec === edge.spec.bareSpec) continue

          // add the dependency to the addDeps map
          const dependency = asDependency({
            spec: Spec.parse(depName, depSpec, options),
            type: shorten(depType, depName, manifest),
          })
          addDeps.set(depName, dependency)
        }
      }

      // store in transientAdd if there are any dependencies
      if (addDeps.size > 0) {
        transientAdd.set(node.id, addDeps)
      }

      // store in transientRemove if there are any to remove
      if (removeDeps.size > 0) {
        transientRemove.set(node.id, removeDeps)
      }
    }
  }

  // merges any provided specs to add to the current found results
  for (const [id, addDeps] of add.entries()) {
    const deps = addResult.get(id)
    if (!deps) {
      // Not an importer - only store file-type deps for later injection
      if (id.startsWith('file')) {
        transientAdd.set(id, addDeps)
      }
      continue
    }
    for (const [name, dep] of addDeps.entries()) {
      deps.set(name, dep)
    }
  }

  // Merges results from user-provided `remove` option with any remove
  // results found from comparing the manifest with the loaded graph
  for (const [key, removeSet] of remove) {
    const importerRemoveItem = removeResult.get(key)
    if (importerRemoveItem) {
      for (const depName of removeSet) {
        importerRemoveItem.add(depName)
      }
    } else if (key.startsWith('file')) {
      // Not an importer - only store file-type deps in transientRemove
      const existing = transientRemove.get(key)
      if (existing) {
        for (const depName of removeSet) {
          existing.add(depName)
        }
      } else {
        transientRemove.set(key, new Set(removeSet))
      }
    }
  }

  // Removes any references to an importer that no longer has specs
  for (const [key, removeItem] of removeResult) {
    if (removeItem.size === 0) {
      removeResult.delete(key)
    }
  }

  // removes already satisfied dependencies from the dependencies list
  removeSatisfiedSpecs({
    add: addResult,
    graph,
  })

  // set the modifiedDependencies flag if any
  // of the importers have modified dependencies
  for (const addDeps of addResult.values()) {
    if (addDeps.size > 0) {
      addResult.modifiedDependencies = true
      break
    }
  }

  return {
    add: addResult,
    remove: removeResult,
    transientAdd,
    transientRemove,
  }
}
