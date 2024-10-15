import {
  DepID,
  DepIDTuple,
  getId,
  hydrateTuple,
  splitDepID,
} from '@vltpkg/dep-id'
import { typeError } from '@vltpkg/error-cause'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Integrity, ManifestMinified } from '@vltpkg/types'
import { DependencyTypeShort } from './dependencies.js'
import { Edge } from './edge.js'
import { GraphLike, NodeLike } from './types.js'

export type NodeOptions = SpecOptions & {
  projectRoot: string
  graph: GraphLike
}

export class Node implements NodeLike {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Node'
  }

  #options: SpecOptions
  #location?: string

  #optional = false
  /**
   * True if a node is only reachable via optional or peerOptional edges from
   * any importer.
   *
   * Setting this to false, if previously set to true, will also unset
   * the flag on any optional-flagged non-optional dependencies.
   */
  get optional() {
    return this.#optional
  }
  set optional(optional: boolean) {
    const before = this.#optional
    this.#optional = optional
    if (before && !optional) {
      // unset for all deps, as well
      for (const { to, optional } of this.edgesOut.values()) {
        if (!optional && to?.optional) to.optional = false
      }
    }
  }

  isOptional(): this is Node & { optional: true } {
    return this.#optional
  }

  #dev = false
  /**
   * True if a node is only reachable via dev edges from any importer.
   *
   * Setting this to false, if previously set to true, will also unset
   * the flag on any dev-flagged non-dev dependencies.
   */
  get dev() {
    return this.#dev
  }
  set dev(dev: boolean) {
    const before = this.#dev
    this.#dev = dev
    if (before && !dev) {
      // unset for all deps, as well
      for (const { to, dev } of this.edgesOut.values()) {
        if (!dev && to?.dev) to.dev = false
      }
    }
  }

  isDev(): this is Node & { dev: true } {
    return this.#dev
  }

  /**
   * List of edges coming into this node.
   */
  edgesIn = new Set<Edge>()

  /**
   * List of edges from this node into other nodes. This usually represents
   * that the connected node is a direct dependency of this node.
   */
  edgesOut = new Map<string, Edge>()

  /**
   * A reference to the {@link @DepID} this node represents in the graph.
   */
  id: DepID

  /**
   * True if this node is an importer node.
   */
  importer = false

  /**
   * True if this node is the project root node.
   */
  mainImporter = false

  /**
   * A reference to the graph this node is a part of.
   */
  graph: GraphLike

  /**
   * The manifest integrity value.
   */
  integrity?: Integrity

  /**
   * The manifest this node represents in the graph.
   */
  manifest?: ManifestMinified

  /**
   * Project where this node resides
   */
  projectRoot: string

  /**
   * For registry nodes, this is the registry we fetched them from.
   * Needed because their un-prefixed dependencies need to come from
   * the same registry, if it's not the default.
   */
  registry?: string

  /**
   * The name of the package represented by this node, this is usually
   * equivalent to `manifest.name` but in a few ways it may differ such as
   * nodes loaded from a lockfile that lacks a loaded manifest.
   * This field should be used to retrieve package names instead.
   */
  #name?: string
  get name() {
    if (this.#name) return this.#name
    this.#name = this.id
    return this.#name
  }

  /**
   * The location of the node_modules folder where this node's edgesOut
   * should be linked into. For nodes in the store, this is the parent
   * directory, since they're extracted into a node_modules folder
   * side by side with links to their deps. For nodes outside of the store
   * (ie, importers and arbitrary link deps) this is the node_modules folder
   * directly inside the node's directory.
   */
  get nodeModules() {
    const loc = this.location
    return this.inVltStore() ?
        loc.substring(0, loc.length - this.name.length - 1)
      : loc + '/node_modules'
  }

  /**
   * The version of the package represented by this node, this is usually
   * equivalent to `manifest.version` but in a few ways it may differ such as
   * nodes loaded from a lockfile that lacks a loaded manifest.
   * This field should be used to retrieve package versions instead.
   */
  version?: string

  /**
   * An address {@link PackageInfoClient} may use to extract this package.
   */
  resolved?: string

  /**
   * The file system location for this node.
   */
  get location(): string {
    if (this.#location) {
      return this.#location
    }
    this.#location = `./node_modules/.vlt/${this.id}/node_modules/${this.name}`
    // if using the default location, it is in the store
    this.inVltStore = () => true
    return this.#location
  }

  set location(location: string) {
    this.#location = location
    // reset memoization, since it might be elsewhere now
    if (this.inVltStore !== Node.prototype.inVltStore) {
      this.inVltStore = Node.prototype.inVltStore
    }
  }

  constructor(
    options: NodeOptions,
    id?: DepID,
    manifest?: ManifestMinified,
    spec?: Spec,
    name?: string,
    version?: string,
  ) {
    this.#options = options
    this.projectRoot = options.projectRoot
    if (id) {
      this.id = id
    } else {
      if (!manifest || !spec) {
        throw typeError(
          'A new Node needs either a manifest & spec or an id parameter',
          {
            manifest,
          },
        )
      }
      this.id = getId(spec, manifest)
    }
    this.graph = options.graph
    this.manifest = manifest
    this.#name = name || this.manifest?.name
    this.version = version || this.manifest?.version
  }

  /**
   * return true if this node is located in the vlt store
   * memoized the first time it's called, since the store location
   * doesn't change within the context of a single operation.
   */
  inVltStore(): boolean {
    // technically this just means it's in *a* vlt store, but we can safely
    // assume that a user won't construct a path like this by accident,
    // and there's only ever one store in any given project.
    const inStore = this.location.endsWith(
      `.vlt/${this.id}/node_modules/${this.name}`,
    )
    this.inVltStore = () => inStore
    return inStore
  }

  #registryNodeResolved(tuple: DepIDTuple) {
    const spec = hydrateTuple(tuple, this.#name, this.#options)
    this.resolved =
      this.manifest?.dist?.tarball || spec.conventionalRegistryTarball
    this.integrity ??= this.manifest?.dist?.integrity
  }

  equals(other: Node) {
    return this.id === other.id && this.location === other.location
  }

  /**
   * Sets the node as an importer along with its location.
   */
  setImporterLocation(location: string) {
    this.#location = location
    this.importer = true
  }

  /**
   * Sets the appropriate resolve / integrity value for this node.
   * Note that other places might also set these values, like for
   * example the lockfile that might have already have this info.
   */
  setResolved() {
    // file | remote | workspace type of ids all points to a URI that
    // can be used as the `resolved` value, so we split the dep id
    // for these cases.
    const tuple = splitDepID(this.id)
    const [type, resolved] = tuple
    switch (type) {
      case 'registry':
        this.#registryNodeResolved(tuple)
        break
      default:
        this.resolved = resolved
        break
    }
  }

  setDefaultLocation() {
    const def = `./node_modules/.vlt/${this.id}/node_modules/${this.name}`

    // only relocate if the location is in node_modules already
    if (
      !this.importer &&
      (!this.#location ||
        (this.#location !== def &&
          /^(?:\.\/)?node_modules\//.test(this.#location)))
    ) {
      this.#location = def
    }
  }

  /**
   * Add an edge from this node connecting it to a direct dependency.
   */
  addEdgesTo(type: DependencyTypeShort, spec: Spec, node?: Node) {
    const edge = new Edge(type, spec, this, node)
    node?.edgesIn.add(edge)
    this.edgesOut.set(spec.name, edge)
    return edge
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      location: this.location,
      importer: this.importer,
      manifest: this.manifest,
      projectRoot: this.projectRoot,
      integrity: this.integrity,
      resolved: this.resolved,
      dev: this.dev,
      optional: this.optional,
    }
  }

  toString() {
    const version = this.version ? `@${this.version}` : ''
    const depIdTuple = splitDepID(this.id)
    switch (depIdTuple[0]) {
      case 'registry': {
        const prefix = depIdTuple[1] ? `${depIdTuple[1]}:` : ''
        return `${prefix}${depIdTuple[2]}`
      }
      case 'git':
      case 'workspace':
      case 'file':
      case 'remote': {
        const nameVersion =
          this.name !== this.id ? `:${this.name}${version}` : ''
        return `${depIdTuple[0]}(${depIdTuple[1]})${nameVersion}`
      }
    }
    /* c8 ignore next - impossible */
  }
}
