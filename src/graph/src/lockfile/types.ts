import { DepID } from '@vltpkg/dep-id'
import { DependencyTypeShort } from '../dependencies.js'
import { Integrity } from '@vltpkg/types'

/**
 * This is the main type definition for the contents of the
 * `vlt-lock.json` file.
 *
 * The nodes and edges information from the lockfile are used to reconstruct
 * a {@link Graph} representing a previous install.
 */
export type LockfileData = {
  registries: Record<string, string>
  nodes: Record<DepID, LockfileDataNode>
  edges: LockfileDataEdge[]
}

/**
 * Lockfile representation of a node from the install graph.
 */
export type LockfileDataNode = [
  name?: string,
  integrity?: Integrity,
  resolved?: string,
  location?: string,
]

/**
 * Lockfile representation of an edge (or vertice) from the install graph.
 */
export type LockfileDataEdge = [
  from: DepID,
  type: DependencyTypeShort,
  spec: string,
  to?: DepID,
]
