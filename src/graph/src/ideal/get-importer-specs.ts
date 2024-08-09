import { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { Dependency, longDependencyTypes } from '../dependencies.js'
import { removeSatisfiedSpecs } from './remove-satisfied-specs.js'
import {
  BuildIdealAddOptions,
  BuildIdealFromGraphOptions,
  BuildIdealRemoveOptions,
} from './types.js'
import { Edge } from '../edge.js'
import { Node } from '../node.js'

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
  const addResult = new Map<DepID, Map<string, Dependency>>()
  const removeResult = new Map<DepID, Set<string>>()

  // traverse the list of importers in the starting graph
  for (const importer of graph.importers) {
    // uses a Map keying to the spec.name in order to easily make sure there's
    // only a single dependency entry for a given dependency for each importer
    const addDeps = new Map<string, Dependency>()
    const removeDeps = new Set<string>()
    for (const edge of importer.edgesOut.values()) {
      if (hasDepName(importer, edge)) {
        addDeps.set(edge.name, {
          spec: edge.spec,
          type: edge.type,
        })
      } else {
        removeDeps.add(edge.name)
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

  return {
    add: addResult,
    remove: removeResult,
  }
}
