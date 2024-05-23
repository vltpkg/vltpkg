import { resolve } from 'node:path'
import { getId, DepID } from '@vltpkg/dep-id'
import { typeError } from '@vltpkg/error-cause'
import { Spec } from '@vltpkg/spec'
import { ManifestMinified } from '@vltpkg/types'
import { DependencyTypeLong } from './dependencies.js'
import { Edge } from './edge.js'

export class Node {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Node'
  }

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
   * The manifest this node represents in the graph.
   */
  manifest: ManifestMinified

  /**
   * The file system location for this node.
   */
  get location(): string {
    if (this.#location) {
      return this.#location
    }
    this.#location = resolve(
      `node_modules/.vlt/${this.id}/node_modules/${this.manifest.name || this.id}`,
    )
    return this.#location
  }

  constructor(manifest: ManifestMinified, id?: DepID, spec?: Spec) {
    if (id) {
      this.id = id
    } else {
      if (!spec) {
        throw typeError(
          'A new Node needs either a spec or an id parameter',
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
   * Add an edge from this node connecting it to a direct dependency.
   */
  addEdgesTo(type: DependencyTypeLong, spec: Spec, node?: Node) {
    const edge = new Edge(type, spec, this, node)
    node?.edgesIn.add(edge)
    this.edgesOut.set(spec.name, edge)
    return edge
  }
}
