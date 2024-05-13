import { getId, DepID, hydrate } from '@vltpkg/dep-id'
import { typeError } from '@vltpkg/error-cause'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Integrity, ManifestMinified } from '@vltpkg/types'
import { DependencyTypeLong } from './dependencies.js'
import { Edge } from './edge.js'
import { ConfigFileData } from '@vltpkg/config'

export class Node {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Node'
  }

  #config: ConfigFileData
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
    const spec = hydrate(
      this.id,
      undefined,
      this.#config as SpecOptions,
    )
    this.#location = `./node_modules/.vlt/${this.id}/node_modules/${this.manifest?.name || spec.name}`
    return this.#location
  }

  constructor(
    config: ConfigFileData,
    id?: DepID,
    manifest?: ManifestMinified,
    spec?: Spec,
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
  setResolvedFromId() {
    const depIdInfo = hydrate(
      this.id,
      undefined,
      this.#config as SpecOptions,
    )
    switch (depIdInfo.type) {
      case 'file':
        this.resolved = depIdInfo.file
        return
      case 'git':
        this.resolved = depIdInfo.gitRemote
        return
      case 'registry':
        this.resolved =
          this.manifest?.dist?.tarball ||
          depIdInfo.conventionalRegistryTarball
        this.integrity = this.manifest?.dist?.integrity
        return
      case 'remote':
        this.resolved = depIdInfo.remoteURL
        return
    }
  }

  /**
   * Add an edge from this node connecting it to a direct dependency.
   */
  addEdgesTo(type: DependencyTypeLong, spec: Spec, node?: Node) {
    const edge = new Edge(type, spec, this, node)
    node?.edgesIn.add(edge)
    this.edgesOut.set(spec.name, edge)
    return edge
  }
}
