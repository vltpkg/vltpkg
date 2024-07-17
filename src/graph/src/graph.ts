import { getId, type DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { satisfies } from '@vltpkg/satisfies'
import { Spec, type SpecOptions } from '@vltpkg/spec'
import { type ManifestMinified } from '@vltpkg/types'
import { Monorepo } from '@vltpkg/workspaces'
import { inspect, InspectOptions } from 'util'
import { DependencyTypeShort } from './dependencies.js'
import { type Edge } from './edge.js'
import { lockfileData } from './lockfile/save.js'
import { Node } from './node.js'

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')

export type ManifestInventory = Map<DepID, ManifestMinified>

export type GraphOptions = SpecOptions & {
  /**
   * The main importer manifest info.
   */
  mainManifest: ManifestMinified
  /**
   * An inventory of seen manifests.
   */
  manifests?: ManifestInventory
  /**
   * A {@link Monorepo} object, for managing workspaces
   */
  monorepo?: Monorepo
  /**
   * Root of the project this graph represents
   */
  projectRoot: string
}

export class Graph {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Graph'
  }

  #options: GraphOptions

  /**
   * A {@link Monorepo} instance, used for managing workspaces.
   */
  monorepo?: Monorepo

  /**
   * An inventory with all manifests related to an install.
   */
  manifests: ManifestInventory

  /**
   * A set of all edges in this graph.
   */
  edges: Set<Edge> = new Set()

  /**
   * Map registered dep ids to the node that represent them in the graph.
   */
  nodes: Map<DepID, Node> = new Map()

  /**
   * Map of nodes by their name
   */
  nodesByName: Map<string, Set<Node>> = new Map()

  /**
   * Cached resolutions for spec lookups
   */
  resolutions: Map<string, Node> = new Map()

  /**
   * Reverse map of resolutions
   */
  resolutionsReverse: Map<Node, Set<string>> = new Map()

  /**
   * A set of importer nodes in this graph.
   */
  importers: Set<Node> = new Set()

  /**
   * The {@link Node} that represents the project root `package.json`.
   */
  mainImporter: Node

  /**
   * A set of extraneous dependencies found when building the graph.
   */
  extraneousDependencies: Set<Edge> = new Set()

  /**
   * A list of dangling edges from the root node, representing
   * missing direct dependencies of a given install.
   */
  missingDependencies: Set<Edge> = new Set()

  /**
   * The root of the project this graph represents
   */
  projectRoot: string

  constructor(options: GraphOptions) {
    const { mainManifest, manifests, monorepo, projectRoot } = options
    this.#options = options
    this.manifests = manifests ?? new Map()
    this.projectRoot = projectRoot

    // add the project root node
    const mainImporterLocation = '.'
    const mainImporterSpec = Spec.parse(
      mainManifest.name || '(root)',
      mainImporterLocation,
    )
    const mainImporter = this.addNode(
      'file;.',
      mainManifest,
      mainImporterSpec,
    )
    mainImporter.setImporterLocation(mainImporterLocation)
    this.mainImporter = mainImporter
    this.importers.add(mainImporter)
    this.manifests.set(mainImporter.id, mainManifest)

    // uses the monorepo instance in order to retrieve info on
    // workspaces and create importer nodes for each of them
    // TODO: make the monorepo property public so that it's easier to reuse
    // it when copying stuff from a graph to another
    this.monorepo = monorepo
    if (this.monorepo) {
      for (const ws of this.monorepo) {
        const wsNode = this.addNode(
          ws.id,
          ws.manifest,
          undefined,
          ws.name,
        )
        wsNode.setImporterLocation(`./${ws.path}`)
        if (wsNode.manifest) {
          this.manifests.set(wsNode.id, wsNode.manifest)
        }
        this.importers.add(wsNode)
      }
    }
  }

  /**
   * Create a new edge between two nodes of the graph in case both exist,
   * in case the destination node does not exists, then a dangling edge,
   * pointing to nothing will be created to represent that missing dependency.
   */
  addEdge(
    type: DependencyTypeShort,
    spec: Spec,
    from: Node,
    to?: Node,
  ) {
    const edgeOut = from.addEdgesTo(type, spec, to)
    this.edges.add(edgeOut)
    if (!to) {
      this.missingDependencies.add(edgeOut)
    }
    return edgeOut
  }

  /**
   * Find an existing node to satisfy a dependency
   */
  findResolution(spec: Spec, fromNode: Node) {
    const f = spec.final
    const sf = String(f)
    const cached = this.resolutions.get(sf)
    if (cached) return cached
    const nbn = this.nodesByName.get(f.name)
    if (!nbn) return undefined
    for (const node of nbn) {
      if (
        satisfies(
          node.id,
          f,
          fromNode.location,
          this.projectRoot,
          this.monorepo,
        )
      ) {
        this.resolutions.set(sf, node)
        // always set by now, because the node was added at some point
        this.resolutionsReverse.get(node)?.add(sf)
        return node
      }
    }
  }

  /**
   * Create a new node in the graph.
   */
  addNode(
    id?: DepID,
    manifest?: ManifestMinified,
    spec?: Spec,
    name?: string,
    version?: string,
  ) {
    const node = new Node(
      this.#options,
      id,
      manifest,
      spec,
      name,
      version,
    )
    this.nodes.set(node.id, node)
    const nbn = this.nodesByName.get(node.name) ?? new Set()
    nbn.add(node)
    this.nodesByName.set(node.name, nbn)
    if (spec) {
      const f = String(spec.final)
      this.resolutions.set(f, node)
      const rrev = this.resolutionsReverse.get(node) ?? new Set()
      rrev.add(f)
      this.resolutionsReverse.set(node, rrev)
    }
    if (manifest) {
      this.manifests.set(node.id, manifest)
    }
    return node
  }

  /**
   * Place a new package into the graph representation, creating the new
   * edges and possibly new nodes that are to be expected when traversing
   * the graph in a top-down direction, e.g: from importers to leafs.
   *
   * For different uses that are not a direct top-down traversal of the graph
   * consider using `addNode()` and `addEdge()` instead.
   */
  placePackage(
    fromNode: Node,
    depType: DependencyTypeShort,
    spec: Spec,
    manifest?: ManifestMinified,
    id?: DepID,
  ) {
    // if no manifest is available, then create an edge that has no
    // reference to any other node, representing a missing dependency
    if (!manifest && !id) {
      this.addEdge(depType, spec, fromNode)
      return
    }

    const depId = id || (manifest && getId(spec, manifest))

    /* c8 ignore start - should not be possible */
    if (!depId) {
      throw error('Could not find dep id when placing package', {
        spec,
        manifest,
      })
    }
    /* c8 ignore stop */

    // if a node for this package is already represented by a node
    // in the graph, then just creates a new edge to that node
    const toFoundNode = this.nodes.get(depId)
    if (toFoundNode) {
      this.addEdge(depType, spec, fromNode, toFoundNode)
      return toFoundNode
    }

    // creates a new node and edges to its parent
    const toNode = this.addNode(depId, manifest)
    this.addEdge(depType, spec, fromNode, toNode)
    return toNode
  }

  /**
   * Removes a node and its relevant edges from the graph.
   *
   * If a replacement is provided, then any edges that were previously
   * pointing to the removed node will be directed to the replacement,
   * if it is valid to do so.
   */
  removeNode(node: Node, replacement?: Node) {
    this.nodes.delete(node.id)
    const nbn = this.nodesByName.get(node.name)
    // if it's the last one, just remove the set
    if (nbn?.size === 1) this.nodesByName.delete(node.name)
    else nbn?.delete(node)
    for (const r of this.resolutionsReverse.get(node) ?? new Set()) {
      this.resolutions.delete(r)
    }
    this.resolutionsReverse.delete(node)
    this.manifests.delete(node.id)
    for (const edge of node.edgesOut.values()) {
      this.edges.delete(edge)
      this.missingDependencies.delete(edge)
    }
    for (const edge of node.edgesIn) {
      if (
        replacement &&
        satisfies(
          replacement.id,
          edge.spec,
          edge.from.location,
          this.projectRoot,
          this.monorepo,
        )
      ) {
        edge.to = replacement
      } else {
        edge.to = undefined
        if (!edge.optional) this.missingDependencies.add(edge)
      }
    }
  }

  [kCustomInspect](_: number, options: InspectOptions) {
    const data = lockfileData({ graph: this })
    return `${this[Symbol.toStringTag]} ${inspect(data, options)}`
  }
}
