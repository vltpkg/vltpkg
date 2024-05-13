import { Spec } from '@vltpkg/spec'
import { Node } from './node.js'
import { DependencyTypeLong } from './pkgs.js'

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
  to?: Node

  /**
   * What type of dependency relationship `from` and `to` nodes have.
   */
  type: DependencyTypeLong

  /**
   * The defined spec value for `to` as parsed from the dependent metadata.
   */
  spec: Spec

  constructor(
    type: DependencyTypeLong,
    spec: Spec,
    from: Node,
    to?: Node,
  ) {
    this.from = from
    this.to = to
    this.type = type
    this.spec = spec
  }

  /**
   * The name of the dependency `to` as defined in the dependent metadata.
   */
  get name() {
    return this.spec.name
  }

  get peer(): boolean {
    return this.type === 'peerDependencies'
  }

  get dev(): boolean {
    return this.type === 'devDependencies'
  }

  // TODO: devOptional

  get peerOptional(): boolean {
    return (
      this.peer &&
      this.from.pkg.peerDependenciesMeta?.[this.spec.name]
        ?.optional === true
    )
  }

  get optional(): boolean {
    return this.peerOptional || this.type === 'optionalDependencies'
  }
}
