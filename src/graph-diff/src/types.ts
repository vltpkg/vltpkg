import type { DepID } from '@vltpkg/dep-id'
import type { LockfileData, LockfilePlatform } from '@vltpkg/graph'
import type { DependencyTypeShort, Integrity } from '@vltpkg/types'

export type { LockfileData }

/**
 * Bumped when the serialized shape changes in a breaking way. Consumers
 * outside this repo (editors, CI annotations, web viewers) key off it.
 */
export const GRAPH_DIFF_SCHEMA_VERSION = 1

/** `${from} ${dep name}`, the same keying the lockfile uses. */
export type EdgeKey = `${DepID} ${string}`

/** A missing edge target, kept as a value rather than dropped. */
export const MISSING = 'MISSING'

export type NodeInfo = {
  id: DepID
  name: string
  version?: string
  type: 'registry' | 'git' | 'workspace' | 'remote' | 'file'
  /** registry alias or url, only set for registry ids */
  registry?: string
  peerSetHash?: string
  modifier?: string
  integrity?: Integrity
  /**
   * Absolute, rehydrated against this side's own `options.registry`.
   * The lockfile stores it relative, so raw values are not comparable
   * across two lockfiles with differing registries.
   */
  resolved?: string
  location?: string
  /** only comparable when the node is optional on both sides */
  platform?: LockfilePlatform
  bins?: Record<string, string>
  dev: boolean
  optional: boolean
  importer: boolean
}

export type EdgeInfo = {
  from: DepID
  /** the dependency slot this edge fills */
  name: string
  type: DependencyTypeShort
  spec: string
  to: DepID | typeof MISSING
}

/** Payload fields compared for an exact-id match. */
export type NodeField =
  | 'integrity'
  | 'resolved'
  | 'location'
  | 'platform'
  | 'bins'
  | 'dev'
  | 'optional'

export type MutationBase = {
  id: string
  directness: 'direct' | 'transitive'
  /**
   * True when nothing about the package itself moved, only its id.
   * Always present, so an absent key never has to be guessed at.
   */
  identityOnly: boolean
  /**
   * How many importers reach this change from further away than the
   * region it is filed under.
   *
   * Regions key on the nearest importers, which alone lies by omission:
   * `yargs` is two hops from www/docs via @astrojs/check and three from
   * every workspace via c8, so the region reports it as www/docs-only.
   * A non-zero count here is the signal that more workspaces are
   * affected than the region name suggests.
   */
  alsoReachedBy: number
}

/** The kind-specific half of a mutation, before ids are assigned. */
export type MutationDetail =
  | { kind: 'node-added'; node: NodeInfo }
  | { kind: 'node-removed'; node: NodeInfo }
  | {
      kind: 'node-changed'
      from: NodeInfo
      to: NodeInfo
      fields: NodeField[]
    }
  | {
      kind: 'node-identity-changed'
      from: NodeInfo
      to: NodeInfo
      reason: 'registry' | 'peer-set' | 'modifier'
    }
  | {
      /**
       * One package's peer-set variants were recombined. Every variant
       * shares a name, version and integrity by construction -- that is
       * what makes them variants -- so the ids alone are the whole story
       * and the shared payload is carried once rather than per variant.
       */
      kind: 'peer-variants-regrouped'
      name: string
      version?: string
      integrity?: Integrity
      from: DepID[]
      to: DepID[]
    }
  | {
      kind: 'package-resolved'
      name: string
      from: NodeInfo
      to: NodeInfo
      direction: 'upgrade' | 'downgrade' | 'sidegrade'
      /**
       * How far the version moved. `unknown` when either side has no
       * parseable version, which is every non-registry id.
       */
      severity: 'major' | 'minor' | 'patch' | 'prerelease' | 'unknown'
    }
  | { kind: 'edge-added'; edge: EdgeInfo }
  | { kind: 'edge-removed'; edge: EdgeInfo }
  | { kind: 'edge-retargeted'; from: EdgeInfo; to: EdgeInfo }
  | {
      kind: 'edge-respecified'
      from: EdgeInfo
      to: EdgeInfo
      fields: ('spec' | 'type')[]
    }
  | {
      kind: 'options-changed'
      fields: string[]
      from: Record<string, unknown>
      to: Record<string, unknown>
    }

export type Mutation = MutationBase & MutationDetail

export type MutationKind = Mutation['kind']

/** Why a node is in a region, so renderers can style without re-deriving. */
export type NodeRole = 'mutated' | 'context'

export type Region = {
  id: string
  label: string
  /** the importers that pull these changes in most directly */
  importers: DepID[]
  nodes: {
    id: DepID
    role: NodeRole
    mutationIds: string[]
  }[]
  mutationIds: string[]
}

export type Summary = {
  nodes: { base: number; head: number }
  edges: { base: number; head: number }
  /** partial: a kind with no mutations is absent, not zero */
  counts: Partial<Record<MutationKind, number>>
  /** kept out of `counts` totals so noise never inflates the headline */
  identityOnly: number
  regions: number
}

/**
 * The serializable result. Plain objects and arrays throughout so
 * `JSON.stringify` is the whole serializer.
 */
export type GraphDiff = {
  schemaVersion: typeof GRAPH_DIFF_SCHEMA_VERSION
  summary: Summary
  mutations: Mutation[]
  regions: Region[]
}

/** Projection of one lockfile, the input to the diff. Maps, not JSON. */
export type DiffGraph = {
  nodes: Map<DepID, NodeInfo>
  edges: Map<EdgeKey, EdgeInfo>
  /** reverse index, so shared subtrees are never walked twice */
  dependents: Map<DepID, EdgeInfo[]>
  importers: Set<DepID>
  options: Record<string, unknown>
}
