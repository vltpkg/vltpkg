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

export class Node {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Node'
  }

  #config: SpecOptions
  #location?: string

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
   * A reference to the {@link @DepID} this node represents in the graph.
   */
  id: DepID

  /**
   * True if this node is an importer node.
   */
  importer: boolean = false

  /**
   * The manifest integrity value.
   */
  integrity?: Integrity

  /**
   * The manifest this node represents in the graph.
   */
  manifest?: ManifestMinified

  /**
   * The name of the package represented by this node, this is usually
   * equivalent to `manifest.name` but in a few ways it may differ such as
   * nodes loaded from a lockfile that lacks a loaded manifest.
   * This field should be used to retrieve package names instead.
   */
  name?: string

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
    this.#location = `./node_modules/.vlt/${this.id}/node_modules/${this.name || this.id}`
    return this.#location
  }

  set location(location: string) {
    this.#location = location
  }

  constructor(
    config: SpecOptions,
    id?: DepID,
    manifest?: ManifestMinified,
    spec?: Spec,
    name?: string,
  ) {
    this.#config = config
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
    this.manifest = manifest
    this.name = name || this.manifest?.name
  }

  #registryNodeResolved(tuple: DepIDTuple) {
    const spec = hydrateTuple(
      tuple,
      this.name,
      this.#config as SpecOptions,
    )
    this.resolved =
      this.manifest?.dist?.tarball || spec.conventionalRegistryTarball
    this.integrity ??= this.manifest?.dist?.integrity
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
      case 'file':
      case 'remote':
      case 'workspace':
      case 'git':
        this.resolved = resolved
        return
      case 'registry':
        return this.#registryNodeResolved(tuple)
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
}
