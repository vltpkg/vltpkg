import { error } from '@vltpkg/error-cause'
import { satisfies } from '@vltpkg/satisfies'
import {
  BuildIdealAddOptions,
  BuildIdealFromGraphOptions,
} from './types.js'

export type RemoveSatisfiedSpecsOptions = BuildIdealAddOptions &
  BuildIdealFromGraphOptions

/**
 * Traverse the objects defined in `add` and removes any references to specs
 * that are already satisfied by the contents of the actual `graph`.
 */
export const removeSatisfiedSpecs = ({
  add,
  graph,
}: RemoveSatisfiedSpecsOptions) => {
  for (const [depID, dependencies] of add.entries()) {
    const importer = graph.nodes.get(depID)
    if (!importer) {
      throw error('Referred importer node id could not be found', {
        found: depID,
      })
    }
    for (const [name, dependency] of dependencies) {
      const edge = importer.edgesOut.get(name)
      if (!edge) {
        // brand new edge being added
        continue
      }

      // If the current graph edge is already valid, then we remove that
      // dependency item from the list of items to be added to the graph
      if (
        satisfies(
          edge.to?.id,
          dependency.spec,
          edge.from.location,
          graph.projectRoot,
          graph.monorepo,
        )
      ) {
        dependencies.delete(name)
      }
    }
  }

  // Removes any references to an importer that no longer has specs
  for (const [depID, dependencies] of add.entries()) {
    if (dependencies.size === 0) {
      add.delete(depID)
    }
  }
}
