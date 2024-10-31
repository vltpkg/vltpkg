import { type DepID } from '@vltpkg/dep-id'
import { type Manifest } from '@vltpkg/types'
import { type Spec, type SpecLikeBase } from '@vltpkg/spec'
import { type DependencyTypeShort } from './dependencies.js'

export type EdgeLike = {
  name: string
  from: NodeLike
  spec: SpecLikeBase
  to?: NodeLike
  type: DependencyTypeShort
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
  edgesIn: Set<EdgeLike>
  edgesOut: Map<string, EdgeLike>
  location?: string
  manifest?: Manifest | null
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
}
