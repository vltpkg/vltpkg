import { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { Graph } from '../graph.js'
import { Dependency } from '../dependencies.js'
import { BaseBuildIdealOptions } from './types.js'

/**
 * Given a {@link Graph} and a list of {@link Dependency}, merges the
 * dependencies info found in the graph importers and returns the result
 * as a Map in which keys are {@link DepID} of each importer node and values
 * are the complete set of {@link Dependency}.
 */
export const getImporterSpecs = ({
  add,
  graph,
}: BaseBuildIdealOptions) => {
  const res = new Map<DepID, Map<string, Dependency>>()

  // traverse the list of importers
  for (const importer of graph.importers) {
    // uses a Map keying to the spec.name in order to easily make sure there's
    // only a single dependency entry for a given dependency for each importer
    const deps = new Map<string, Dependency>()
    for (const edge of importer.edgesOut.values()) {
      deps.set(edge.name, {
        spec: edge.spec,
        type: edge.type,
      })
    }
    res.set(importer.id, deps)
  }

  // merges any provided specs to add to the current found results
  for (const [id, addDeps] of add.entries()) {
    const deps = res.get(id)
    if (!deps) {
      throw error('Not an importer', { found: id })
    }
    for (const [name, dep] of addDeps.entries()) {
      deps.set(name, dep)
    }
  }

  return res
}
