import { Spec } from '@vltpkg/spec'
import {
  DependencyTypeLong,
  PackageInventory,
  Package,
  PackageMetadata,
} from './pkgs.js'
import { Node } from './node.js'
import { Edge } from './edge.js'

export class Graph {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Graph'
  }

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
  missingDirectDependencies: Set<Edge> = new Set()

  /**
   * Keeps a reference of connected edges in order to avoid duplicating edges.
   */
  #seenEdges: Set<string> = new Set()

  constructor(rootPackageJson: PackageMetadata) {
    this.nodes = new Set()
    this.pkgNodes = new Map()
    this.packages = new PackageInventory()
    const pkg = this.packages.registerPackage(rootPackageJson)
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
    name: string,
    spec: Spec,
    from: Node,
    to?: Node,
  ) {
    const toRef = to ? `:${to.id}` : ''
    const edgeId = `${type}:${name}@${spec.bareSpec}:${from.id}${toRef}`
    if (this.#seenEdges.has(edgeId)) {
      return
    }

    if (to) {
      to.addEdgeIn(type, name, spec, from)
    }

    const edgeOut = from.addEdgeOut(type, name, spec, to)
    if (!to && from.isRoot) {
      this.missingDirectDependencies.add(edgeOut)
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
  placePackage(
    fromNode: Node,
    depType: DependencyTypeLong,
    name: string,
    specRaw: Spec | string,
    metadata?: PackageMetadata,
    location?: string,
  ) {
    const spec =
      typeof specRaw === 'string' ?
        Spec.parse(`${name}@${specRaw}`)
      : specRaw
    // if no package metadata is available, then create an edge that
    // has no reference to any other node, representing a missing dependency

    if (!metadata) {
      this.newEdge(depType, name, spec, fromNode)
      return
    }

    const pkg =
      location ?
        this.packages.registerPackage(metadata, { location })
      : this.packages.registerPending(metadata)

    // if a node for this package is already represented by a node
    // in the graph, then just creates a new edge to that node
    const fromGraph = this.pkgNodes.get(pkg.id)
    if (fromGraph) {
      this.newEdge(depType, name, spec, fromNode, fromGraph)
      return fromGraph
    }

    // creates a new node and the edges to its parent
    const toNode = this.newNode(pkg)
    this.newEdge(depType, name, spec, fromNode, toNode)
    return toNode
  }
}
