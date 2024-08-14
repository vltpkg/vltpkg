import type {
  LockfileData,
  GraphLike,
  NodeLike,
  EdgeLike,
} from '@vltpkg/graph'
import type { Query } from '@vltpkg/query'
import type { SpecOptionsFilled } from '@vltpkg/spec/browser'
import { Integrity, ManifestMinified } from '@vltpkg/types'

export type Action = {
  updateGraph: (graph: State['graph']) => void
  updateQ: (q: State['q']) => void
  updateQuery: (query: State['query']) => void
  updateEdges: (edges: State['edges']) => void
  updateNodes: (nodes: State['nodes']) => void
  updateSelectedNode: (node: State['selectedNode']) => void
  updateSpecOptions: (specOptions: State['specOptions']) => void
  updateStamp: (stamp: string) => void
  reset: () => void
}

/**
 * Transfer data object used to send data from the cli.
 */
export type TransferData = {
  importers: RawNode[]
  lockfile: LockfileData
}

export type RawNode = {
  importer: boolean
  id: string
  name: string
  version: string
  location: string
  manifest: ManifestMinified
  projectRoot?: string
  integrity?: Integrity
  resolved?: string
  dev: boolean
  optional: boolean
}

/**
 * The main state object for the graph explorer.
 */
export type State = {
  /**
   * Current graph to be explored.
   */
  graph?: GraphLike
  /**
   * List of selected edges returned after querying the graph.
   */
  edges: EdgeLike[]
  /**
   * List of selected nodes returned after querying the graph.
   */
  nodes: NodeLike[]
  /**
   * Holds the reference to the {@link Query} instance object.
   */
  q?: Query
  /**
   * The query string typed by the user in the interface.
   */
  query: string
  /**
   * Reference to a currently selected node.
   */
  selectedNode?: NodeLike
  /**
   * Spec options used for the current graph.
   */
  specOptions?: SpecOptionsFilled
  /**
   * A random string to control when graph data should be reloaded.
   */
  stamp: string
}
