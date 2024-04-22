import { DependencyTypeLong, Package } from './pkgs.js'
import { Edge } from './edge.js'

export class Node {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Node'
  }

  /**
   * List of edges coming into this node.
   */
  edgesIn: Set<Edge> = new Set()

  /**
   * List of edges from this node into other nodes. This usually represents
   * that the connected node is a direct dependency of this node.
   */
  edgesOut: Map<string, Edge> = new Map()

  /**
   * A unique id to represent this node in the graph.
   */
  id: number = NaN

  /**
   * True if this is the root node of the graph.
   */
  isRoot: boolean = false

  /**
   * The pkg property holds a reference to the package this node represents
   * in a given graph structure.
   */
  pkg: Package

  constructor(id: number, pkg: Package) {
    this.id = id
    this.isRoot = false
    this.pkg = pkg
  }

  /**
   * Add an edge from this node connecting it to a dependent.
   */
  addEdgeIn(
    type: DependencyTypeLong,
    name: string,
    spec: string,
    node: Node,
  ) {
    this.edgesIn.add(new Edge(type, spec, name, this, node))
  }

  /**
   * Add an edge from this node connecting it to a direct dependency.
   */
  addEdgeOut(
    type: DependencyTypeLong,
    name: string,
    spec: string,
    node?: Node,
  ) {
    const edge = new Edge(type, name, spec, this, node)
    this.edgesOut.set(name, edge)
    return edge
  }
}
