import type { Node } from '../node.ts'
import type { Dependency } from '../dependencies.ts'
import type {
  BuildIdealAddOptions,
  BuildIdealRemoveOptions,
} from './types.ts'

/**
 * Computes the ordered list of dependencies for an given node,
 * taking into account additions and removals.
 */
export const getNodeOrderedDependencies = (
  fromNode: Node,
  options?: BuildIdealAddOptions & BuildIdealRemoveOptions,
): Dependency[] => {
  // using a map here instead of an array helps us get simpler
  // deduplication while iterating through all the items at hand:
  // existing dependencies in the graph, dependencies to be added, etc.
  const deps = new Map<string, Dependency>()
  for (const [name, { spec, type }] of fromNode.edgesOut.entries()) {
    deps.set(name, { spec, type })
  }
  // next iterate through the list of dependencies to be added
  const addedDeps = options?.add.get(fromNode.id)
  if (addedDeps) {
    for (const [name, { spec, type }] of addedDeps.entries()) {
      deps.set(name, { spec, type })
    }
  }
  // finally iterate through the list of dependencies to be removed
  const removedDeps = options?.remove.get(fromNode.id)
  if (removedDeps) {
    for (const name of removedDeps) {
      deps.delete(name)
    }
  }

  // now turn the map into a sorted array
  return getOrderedDependencies([...deps.values()])
}

export const getOrderedDependencies = (
  deps: Dependency[],
): Dependency[] => {
  const orderedDeps = [...deps].sort(
    ({ spec: aSpec, type: aType }, { spec: bSpec, type: bType }) => {
      const aIsPeer =
        aType === 'peer' || aType === 'peerOptional' ? 1 : 0
      const bIsPeer =
        bType === 'peer' || bType === 'peerOptional' ? 1 : 0

      // regular dependencies first, peer dependencies last
      if (aIsPeer !== bIsPeer) {
        return aIsPeer - bIsPeer
      }

      // Prefer unscoped packages before scoped ones.
      // This helps ensure common direct deps like "react" are placed before
      // scoped deps that may need to resolve peers against them.
      const aScoped = aSpec.name.startsWith('@') ? 1 : 0
      const bScoped = bSpec.name.startsWith('@') ? 1 : 0
      if (aScoped !== bScoped) return aScoped - bScoped

      return aSpec.name.localeCompare(bSpec.name, 'en')
    },
  )
  return orderedDeps
}
