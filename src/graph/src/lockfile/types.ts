import type { DepID } from '@vltpkg/dep-id'
import type { Spec, SpecOptions } from '@vltpkg/spec'
import type {
  Integrity,
  NormalizedManifest,
  DependencyTypeShort,
} from '@vltpkg/types'
import type { Graph } from '../graph.ts'

/**
 * Platform requirements for a lockfile node
 */
export type LockfilePlatform = {
  engines?: Record<string, string>
  os?: string[] | string
  cpu?: string[] | string
}

/**
 * This is the main type definition for the contents of the
 * `vlt-lock.json` file.
 *
 * The nodes and edges information from the lockfile are used to reconstruct
 * a {@link Graph} representing a previous install.
 */
export type LockfileData = {
  lockfileVersion: number
  options: SpecOptions & {
    modifiers?: Record<string, string> | undefined
  }
  nodes: Record<DepID, LockfileNode>
  edges: LockfileEdges
}

export const getFlagNumFromNode = (node: {
  optional?: boolean
  dev?: boolean
}) =>
  node.optional && node.dev ? LockfileNodeFlagDevOptional
  : node.optional ? LockfileNodeFlagOptional
  : node.dev ? LockfileNodeFlagDev
  : LockfileNodeFlagNone

export const getBooleanFlagsFromNum = (flags: LockfileNodeFlags) => ({
  dev: !!(flags & LockfileNodeFlagDev),
  optional: !!(flags & LockfileNodeFlagOptional),
})

export const LockfileNodeFlagNone = 0
export const LockfileNodeFlagOptional = 1
export const LockfileNodeFlagDev = 2
export const LockfileNodeFlagDevOptional = 3

/**
 * Bit flags indicating whether a node is optional and/or dev.
 */
export type LockfileNodeFlags = 0 | 1 | 2 | 3

/**
 * Lockfile representation of a node from the install graph.
 */
export type LockfileNode = [
  flags: LockfileNodeFlags,
  name?: string | null,
  integrity?: Integrity | null,
  resolved?: string | null,
  location?: string | null,
  manifest?: NormalizedManifest | null,
  rawManifest?: NormalizedManifest | null,
  platform?: LockfilePlatform | null,
]

/**
 * Lockfile edges are stored as a record object where the key
 * is `${from.id} ${spec.name}` and the value is
 * `${type} ${spec.bareSpec} ${to.id | 'MISSING'}`
 *
 * Storing them in a record like this means that we are guaranteed to
 * never end up with duplicates, and a standard `JSON.stringify()`
 * will nicely print them out one line per edge.
 */
export type LockfileEdges = {
  [key: LockfileEdgeKey]: LockfileEdgeValue
}

/** `${from} ${dep name}` */
export type LockfileEdgeKey = `${DepID} ${string}`

/** `${type} ${spec} ${to}` */
export type LockfileEdgeValue =
  `${DependencyTypeShort} ${Spec['bareSpec']} ${DepID | 'MISSING'}`
