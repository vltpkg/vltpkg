import { satisfies } from '@vltpkg/satisfies'
import { Spec } from '@vltpkg/spec'
import { DependencyTypeShort } from './dependencies.js'
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
  to?: Node

  /**
   * What type of dependency relationship `from` and `to` nodes have.
   */
  type: DependencyTypeShort

  /**
   * The defined spec value for `to` as parsed from the dependent metadata.
   */
  spec: Spec

  constructor(
    type: DependencyTypeShort,
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

  /**
   * This edge was defined as part of a `devDependencies` in `package.json`
   */
  get dev(): boolean {
    return this.type === 'dev'
  }

  get optional(): boolean {
    return this.type === 'peerOptional' || this.type === 'optional'
  }

  get peer(): boolean {
    return this.type === 'peer' || this.type === 'peerOptional'
  }

  get peerOptional(): boolean {
    return this.type === 'peerOptional'
  }

  valid(): boolean {
    return !this.to ?
        this.optional
      : satisfies(
          this.to.id,
          this.spec,
          this.from.location,
          this.from.projectRoot,
        )
  }
}
