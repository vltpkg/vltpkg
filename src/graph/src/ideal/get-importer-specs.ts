import { error } from '@vltpkg/error-cause'
import {
  type AddImportersDependenciesMap,
  type Dependency,
  type RemoveImportersDependenciesMap,
  longDependencyTypes,
  shorten,
  asDependency,
} from '../dependencies.js'
import { removeSatisfiedSpecs } from './remove-satisfied-specs.js'
import {
  type BuildIdealAddOptions,
  type BuildIdealFromGraphOptions,
  type BuildIdealRemoveOptions,
} from './types.js'
import { type Edge } from '../edge.js'
import { type Node } from '../node.js'
import { type Graph } from '../graph.js'
import { type DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'

export type GetImporterSpecsOptions = BuildIdealAddOptions &
  BuildIdealFromGraphOptions &
  BuildIdealRemoveOptions

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
export const getImporterSpecs = ({
  add,
  graph,
  remove,
}: GetImporterSpecsOptions) => {
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
      if (!hasDepName(importer, edge)) {
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
        if (!edge?.to) {
          addDeps.set(
            depName,
            asDependency({
              spec: Spec.parse(depName, depSpec),
              type: shorten(depType, depName, importer.manifest),
            }),
          )
        }
      }
    }
    addResult.set(importer.id, addDeps)
    removeResult.set(importer.id, removeDeps)
  }

  // merges any provided specs to add to the current found results
  for (const [id, addDeps] of add.entries()) {
    const deps = addResult.get(id)
    if (!deps) {
      throw error('Not an importer', { found: id })
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
  }
}
