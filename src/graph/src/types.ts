import type { DepID } from '@vltpkg/dep-id'
import type { ManifestMinified } from '@vltpkg/types'
import type { SpecLikeBase } from '@vltpkg/spec'
import type { DependencyTypeShort } from './dependencies.js'

export interface EdgeLike {
  name: string
  from: NodeLike
  spec: SpecLikeBase
  to?: NodeLike
  type: DependencyTypeShort
}

export interface GraphLike {
  importers: Set<NodeLike>
  mainImporter: NodeLike
  nodes: Map<DepID, NodeLike>
  edges: Set<EdgeLike>
}

export interface NodeLike {
  id: DepID
  edgesIn: Set<EdgeLike>
  edgesOut: Map<string, EdgeLike>
  location?: string
  manifest?: ManifestMinified | null
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
