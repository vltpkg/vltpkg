import { Spec } from '@vltpkg/spec'
import { Edge } from './edge.js'
import { DependencyTypeLong, Package } from './pkgs.js'

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
  id: number

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
    this.pkg = pkg
  }

  /**
   * Add an edge from this node connecting it to a dependent.
   */
  addEdgeIn(type: DependencyTypeLong, spec: Spec, node: Node) {
    this.edgesIn.add(new Edge(type, spec, this, node))
  }

  /**
   * Add an edge from this node connecting it to a direct dependency.
   */
  addEdgeOut(type: DependencyTypeLong, spec: Spec, node?: Node) {
    const edge = new Edge(type, spec, this, node)
    this.edgesOut.set(spec.name, edge)
    return edge
  }
}
