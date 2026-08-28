import { satisfies } from '@vltpkg/satisfies'
import type { Spec } from '@vltpkg/spec'
import { inspect } from 'node:util'
import type { InspectOptions } from 'node:util'
import type { DependencyTypeShort, EdgeLike } from '@vltpkg/types'
import type { Node } from './node.ts'
import { brand } from './brand.ts'

// `inspect.custom`, not `Symbol.for('nodejs.util.inspect.custom')`: only
// this spelling is honoured by the compiler. Same symbol
// under Node.
const kCustomInspect = inspect.custom

export class Edge implements EdgeLike {
  /** set as an own, non-enumerable property in the constructor - see brand.ts */
  declare readonly [Symbol.toStringTag]: string;

  [kCustomInspect](_: number, options: InspectOptions) {
    const str = inspect(
      {
        from: this.from.id,
        type: this.type,
        spec: String(this.spec),
        to: this.to?.id,
      },
      options,
    )
    return `${this[Symbol.toStringTag]} ${str}`
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
    // own + non-enumerable: a getter reads back `undefined` compiled
    // and a class field changes Node's inspect output
    brand(this, '@vltpkg/graph.Edge')
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

  toJSON() {
    return {
      from: this.from.id,
      to: this.to?.id,
      type: this.type,
      spec: String(this.spec),
    }
  }

  toString() {
    const to = `${this.name}${this.to ? '' : ' (missing)'}`
    return `Edge from: ${this.from.id} --|${this.type}|--> ${to}`
  }
}
