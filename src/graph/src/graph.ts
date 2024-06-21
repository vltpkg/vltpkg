import { getId, DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { ManifestMinified } from '@vltpkg/types'
import { Monorepo } from '@vltpkg/workspaces'
import { Edge } from './edge.js'
import { Node } from './node.js'
import { DependencyTypeShort } from './dependencies.js'

export type ManifestInventory = Map<DepID, ManifestMinified>

export type GraphOptions = SpecOptions & {
  /**
   * The main importer manifest info.
   */
  mainManifest: ManifestMinified
  /**
   * An inventory of seen manifests.
   */
  manifests?: ManifestInventory
  /**
   * A {@link Monorepo} object, for managing workspaces
   */
  monorepo?: Monorepo
}

export class Graph {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Graph'
  }

  #config: SpecOptions

  /**
   * A {@link Monorepo} instance, used for managing workspaces.
   */
  #monorepo?: Monorepo

  /**
   * An inventory with all manifests related to an install.
   */
  manifests: ManifestInventory

  /**
   * A set of all edges in this graph.
   */
  edges: Set<Edge> = new Set()

  /**
   * Map registered package ids to the node that represent them in the graph.
   */
  nodes: Map<DepID, Node> = new Map()

  /**
   * A set of importer nodes in this graph.
   */
  importers: Set<Node> = new Set()

  /**
   * The {@link Node} that represents the project root `package.json`.
   */
  mainImporter: Node

  /**
   * A set of extraneous dependencies found when building the graph.
   */
  extraneousDependencies: Set<Edge> = new Set()

  /**
   * A list of dangling edges from the root node, representing
   * missing direct dependencies of a given install.
   */
  missingDependencies: Set<Edge> = new Set()

  constructor(options: GraphOptions) {
    const { mainManifest, manifests, monorepo } = options
    this.#config = options
    this.manifests = manifests ?? (new Map() as ManifestInventory)

    // add the project root node
    const mainImporterLocation = '.'
    const mainImporterSpec = Spec.parse(
      mainManifest.name || '(root)',
      mainImporterLocation,
    )
    const mainImporter = this.addNode(
      undefined,
      mainManifest,
      mainImporterSpec,
    )
    mainImporter.setImporterLocation(mainImporterLocation)
    this.mainImporter = mainImporter
    this.importers.add(mainImporter)
    this.manifests.set(mainImporter.id, mainManifest)

    // uses the monorepo instance in order to retrieve info on
    // workspaces and create importer nodes for each of them
    this.#monorepo = monorepo
    if (this.#monorepo) {
      for (const ws of this.#monorepo) {
        const wsNode = this.addNode(
          ws.id,
          ws.manifest,
          undefined,
          ws.name,
        )
        wsNode.setImporterLocation(`./${ws.path}`)
        if (wsNode.manifest) {
          this.manifests.set(wsNode.id, wsNode.manifest)
        }
        this.importers.add(wsNode)
      }
    }
  }

  /**
   * Create a new edge between two nodes of the graph in case both exist,
   * in case the destination node does not exists, then a dangling edge,
   * pointing to nothing will be created to represent that missing dependency.
   */
  addEdge(
    type: DependencyTypeShort,
    spec: Spec,
    from: Node,
    to?: Node,
  ) {
    const edgeOut = from.addEdgesTo(type, spec, to)
    this.edges.add(edgeOut)
    if (!to) {
      this.missingDependencies.add(edgeOut)
    }
    return edgeOut
  }

  /**
   * Create a new node in the graph.
   */
  addNode(
    id?: DepID,
    manifest?: ManifestMinified,
    spec?: Spec,
    name?: string,
  ) {
    const node = new Node(this.#config, id, manifest, spec, name)
    this.nodes.set(node.id, node)
    if (manifest) {
      this.manifests.set(node.id, manifest)
    }
    return node
  }

  /**
   * Place a new package into the graph representation, creating the new
   * edges and possibly new nodes that are to be expected when traversing
   * the graph in a top-down direction, e.g: from importers to leafs.
   *
   * For different uses that are not a direct top-down traversal of the graph
   * consider using `addNode()` and `addEdge()` instead.
   */
  placePackage(
    fromNode: Node,
    depType: DependencyTypeShort,
    spec: Spec,
    manifest?: ManifestMinified,
    id?: DepID,
  ) {
    // if no manifest is available, then create an edge that has no
    // reference to any other node, representing a missing dependency
    if (!manifest && !id) {
      this.addEdge(depType, spec, fromNode)
      return
    }

    const depId = id || (manifest && getId(spec, manifest))

    /* c8 ignore start - should not be possible */
    if (!depId) {
      throw error('Could not find dep id when placing package', {
        spec,
        manifest,
      })
    }
    /* c8 ignore stop */

    // if a node for this package is already represented by a node
    // in the graph, then just creates a new edge to that node
    const toFoundNode = this.nodes.get(depId)
    if (toFoundNode) {
      this.addEdge(depType, spec, fromNode, toFoundNode)
      return toFoundNode
    }

    // creates a new node and edges to its parent
    const toNode = this.addNode(depId, manifest)
    this.addEdge(depType, spec, fromNode, toNode)
    return toNode
  }

  /**
   * Removes an edge from the graph.
   */
  removeEdge(edge: Edge) {
    const from = edge.from
    if (from) {
      from.edgesOut.delete(edge.name)
    }
    const to = edge.to
    if (to) {
      to.edgesIn.delete(edge)
    }
    this.edges.delete(edge)
    this.missingDependencies.delete(edge)
  }

  /**
   * Removes a node from the graph.
   */
  removeNode(node: Node) {
    this.nodes.delete(node.id)
    this.manifests.delete(node.id)
  }
}
