import type {
  BuildIdealAddOptions,
  BuildIdealRemoveOptions,
} from './types.ts'
import type { Spec } from '@vltpkg/spec'
import type { Manifest, NormalizedManifest } from '@vltpkg/types'
import type { Node } from '../node.ts'
import type { Dependency } from '../dependencies.ts'

type SortableByHasPeerDeps = {
  /** Package manifest containing dependency information */
  manifest?: Manifest | NormalizedManifest
  /** Package name */
  name?: string
  /** Package specifier */
  spec?: Spec
}

type SortableByType = {
  /** Dependency type (e.g., 'prod', 'dev', 'peer', 'peerOptional') */
  type: string
  /** Target node with package name */
  target?: { name: string }
  /** Package specifier */
  spec?: Spec
}

/**
 * Checks if a dependency type is a peer dependency.
 */
export const isPeerType = (type: string) =>
  type === 'peer' || type === 'peerOptional'

/**
 * Sorts a list of dependencies by whether they have peer dependencies.
 */
export const compareByHasPeerDeps = (
  a: SortableByHasPeerDeps,
  b: SortableByHasPeerDeps,
) => {
  const aHasPeer =
    (
      a.manifest?.peerDependencies &&
      Object.keys(a.manifest.peerDependencies).length > 0
    ) ?
      1
    : 0
  const bHasPeer =
    (
      b.manifest?.peerDependencies &&
      Object.keys(b.manifest.peerDependencies).length > 0
    ) ?
      1
    : 0

  if (aHasPeer !== bHasPeer) return aHasPeer - bHasPeer

  const aName = a.manifest?.name || a.spec?.name || a.name || ''
  const bName = b.manifest?.name ||
  /* c8 ignore next - very hard to test */ b.spec?.name || b.name || ''
  return aName.localeCompare(bName, 'en')
}

/**
 * Sorts a list of dependencies by type and name.
 */
export const compareByType = (
  a: SortableByType,
  b: SortableByType,
) => {
  const aIsPeer = isPeerType(a.type) ? 1 : 0
  const bIsPeer = isPeerType(b.type) ? 1 : 0

  if (aIsPeer !== bIsPeer) return aIsPeer - bIsPeer

  const aName = a.target?.name ?? a.spec?.name ?? ''
  const bName = b.target?.name ?? b.spec?.name ?? ''
  return aName.localeCompare(bName, 'en')
}

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

/**
 * Sorts a list of dependencies by type.
 */
export const getOrderedDependencies = (
  deps: Dependency[],
): Dependency[] => [...deps].sort(compareByType)
