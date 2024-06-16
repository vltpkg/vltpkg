import { error } from '@vltpkg/error-cause'
import { satisfies } from '@vltpkg/semver'
import { BaseBuildIdealOptions } from './types.js'

/**
 * Traverse the objects defined in `add` and removes any references to specs
 * that are already satisfied by the contents of the actual `graph`.
 */
export const removeSatisfiedSpecs = ({
  add,
  graph,
}: BaseBuildIdealOptions) => {
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
        continue
      }
      const satisfied =
        edge.to?.manifest?.version &&
        dependency.spec.range &&
        satisfies(edge.to?.manifest?.version, dependency.spec.range)
      if (satisfied) {
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
