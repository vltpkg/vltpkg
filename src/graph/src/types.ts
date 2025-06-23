import type { DepID } from '@vltpkg/dep-id'
import type { Manifest, DependencyTypeShort } from '@vltpkg/types'
import type { Spec, SpecLikeBase } from '@vltpkg/spec'

export type EdgeLike = {
  name: string
  from: NodeLike
  spec: SpecLikeBase
  to?: NodeLike
  type: DependencyTypeShort
  optional?: boolean
  peer?: boolean
}

export type GraphLike = {
  importers: Set<NodeLike>
  mainImporter: NodeLike
  projectRoot: string
  nodes: Map<DepID, NodeLike>
  edges: Set<EdgeLike>
  addEdge: (
    type: DependencyTypeShort,
    spec: Spec,
    from: NodeLike,
    to?: NodeLike,
  ) => EdgeLike
  addNode: (
    id?: DepID,
    manifest?: Manifest,
    spec?: Spec,
    name?: string,
    version?: string,
  ) => NodeLike
}

export type NodeLike = {
  id: DepID
  confused: boolean
  edgesIn: Set<EdgeLike>
  edgesOut: Map<string, EdgeLike>
  location?: string
  manifest?: Manifest | null
  rawManifest?: Manifest | null
  name?: string | null
  version?: string | null
  integrity?: string | null
  resolved?: string | null
  importer: boolean
  graph: GraphLike
  mainImporter: boolean
  projectRoot: string
  dev: boolean
  optional: boolean
  modifier?: string | undefined
  registry?: string
  toJSON: () => Pick<
    NodeLike,
    | 'id'
    | 'name'
    | 'version'
    | 'location'
    | 'importer'
    | 'manifest'
    | 'projectRoot'
    | 'integrity'
    | 'resolved'
    | 'dev'
    | 'optional'
    | 'confused'
  > & {
    rawManifest?: NodeLike['manifest']
  }
  toString(): string
  setResolved(): void
  setConfusedManifest(fixed: Manifest, confused?: Manifest): void
}
