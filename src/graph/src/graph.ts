import { Spec } from '@vltpkg/spec'
import { Edge } from './edge.js'
import { Node } from './node.js'
import {
  DependencyTypeLong,
  Package,
  PackageInventory,
  PackageMetadata,
} from './pkgs.js'
import { PackageInfoClient } from '@vltpkg/package-info'

export class Graph {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Graph'
  }

  packageInfo: PackageInfoClient

  /**
   * An inventory with all packages related to an install.
   */
  packages: PackageInventory

  /**
   * Set of nodes in this graph.
   */
  nodes: Set<Node>

  /**
   * Map registered package ids to the node that represent them in the graph.
   */
  pkgNodes: Map<string, Node>

  /**
   * The root node of the graph.
   */
  root: Node

  /**
   * A list of dangling edges from the root node, representing
   * missing direct dependencies of a given install.
   */
  missingDependencies: Set<Edge> = new Set()

  /**
   * Keeps a reference of connected edges in order to avoid duplicating edges.
   */
  #seenEdges: Set<string> = new Set()

  constructor(
    rootPackageJson: PackageMetadata,
    packages?: PackageInventory,
    location?: string,
    packageInfo?: PackageInfoClient,
  ) {
    this.packageInfo = packageInfo ?? new PackageInfoClient()
    this.nodes = new Set()
    this.pkgNodes = new Map()
    this.packages = packages ?? new PackageInventory()
    const pkg = this.packages.registerPackage(
      rootPackageJson,
      location,
    )
    this.root = this.newNode(pkg)
    this.root.isRoot = true
  }

  /**
   * Create a new edge between two nodes of the graph in case both exist,
   * in case the destination node does not exists, then a dangling edge,
   * pointing to nothing will be created to represent that missing dependency.
   */
  newEdge(
    type: DependencyTypeLong,
    spec: Spec,
    from: Node,
    to?: Node,
  ) {
    const toRef = to ? `:${to.id}` : ''
    const edgeId = `${type}:${spec}:${from.id}${toRef}`
    if (this.#seenEdges.has(edgeId)) {
      return
    }

    if (to) {
      to.addEdgeIn(type, spec, from)
    }

    const edgeOut = from.addEdgeOut(type, spec, to)
    if (!to) {
      this.missingDependencies.add(edgeOut)
    }

    this.#seenEdges.add(edgeId)
  }

  /**
   * Create a new node in the graph.
   */
  newNode(pkg: Package) {
    const node = new Node(this.nodes.size, pkg)
    this.nodes.add(node)
    this.pkgNodes.set(pkg.id, node)
    return node
  }

  /**
   * Place a new package into the graph representation, creating the new
   * edges and possibly new nodes required for it.
   */
  // TODO: get origin from spec?
  placePackage(
    fromNode: Node,
    depType: DependencyTypeLong,
    spec: Spec,
    metadata?: PackageMetadata,
    location?: string,
    origin?: string,
  ) {
    // if no package metadata is available, then create an edge that
    // has no reference to any other node, representing a missing dependency
    if (!metadata) {
      this.newEdge(depType, spec, fromNode)
      return
    }

    const pkg =
      location ?
        this.packages.registerPackage(metadata, location, origin)
      : this.packages.registerPending(metadata, origin)

    // if a node for this package is already represented by a node
    // in the graph, then just creates a new edge to that node
    const fromGraph = this.pkgNodes.get(pkg.id)
    if (fromGraph) {
      this.newEdge(depType, spec, fromNode, fromGraph)
      return fromGraph
    }

    // creates a new node and the edges to its parent
    const toNode = this.newNode(pkg)
    this.newEdge(depType, spec, fromNode, toNode)
    return toNode
  }
}
