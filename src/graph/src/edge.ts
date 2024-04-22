import { DependencyTypeLong } from './pkgs.js'
import { Node } from './node.js'

export class Edge {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Edge'
  }

  /**
   * The Node this Edge is connecting from, this is usually the dependent.
   */
  from: Node

  /**
   * The node this Edge is connecting to, this is usually a direct dependency.
   */
  to: Node | undefined

  /**
   * What type of dependency relationship `from` and `to` nodes have.
   */
  type: DependencyTypeLong

  /**
   * The name of the dependency `to` as defined in the dependent metadata.
   */
  name: string

  /**
   * The defined spec value for `to` as defined in the dependent metadata.
   */
  spec: string

  constructor(
    type: DependencyTypeLong,
    name: string,
    spec: string,
    from: Node,
    to?: Node,
  ) {
    this.from = from
    this.to = to
    this.type = type
    this.name = name
    this.spec = spec
  }
}
