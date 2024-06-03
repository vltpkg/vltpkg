import { getId, DepID } from '@vltpkg/dep-id'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Spec } from '@vltpkg/spec'
import { Edge } from './edge.js'
import { Node } from './node.js'
import { DependencyTypeLong } from './dependencies.js'
import { ManifestMinified } from '@vltpkg/types'
import { ConfigFileData } from '@vltpkg/config'

export type ManifestInventory = Map<DepID, ManifestMinified>

export interface GraphOptions {
  mainManifest: ManifestMinified
  packageInfo?: PackageInfoClient
  manifests?: ManifestInventory
}

export class Graph {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Graph'
  }

  #config: ConfigFileData

  /**
   * A {@link PackageInfoClient} instance used to request packages info.
   */
  packageInfo: PackageInfoClient

  /**
   * An inventory with all manifests related to an install.
   */
  manifests: ManifestInventory

  /**
   * A set of all edges in this graph.
   */
  edges: Set<Edge> = new Set()

  /**
   * Map registered package ids to the node that represent them in the graph.
   */
  nodes: Map<DepID, Node> = new Map()

  /**
   * A set of importer nodes in this graph.
   */
  importers: Set<Node> = new Set()

  /**
   * The {@link Node} that represents the project root `package.json`.
   */
  mainImporter: Node

  /**
   * A list of dangling edges from the root node, representing
   * missing direct dependencies of a given install.
   */
  missingDependencies: Set<Edge> = new Set()

  constructor(
    { mainManifest, packageInfo, manifests }: GraphOptions,
    config: ConfigFileData,
  ) {
    this.#config = config
    this.packageInfo = packageInfo ?? new PackageInfoClient()
    this.manifests = manifests ?? (new Map() as ManifestInventory)

    const mainImporterLocation = '.'
    const mainImporterSpec = Spec.parse(
      mainManifest.name || '(root)',
      mainImporterLocation,
    )
    const mainImporter = this.newNode(
      undefined,
      mainManifest,
      mainImporterSpec,
    )
    mainImporter.setImporterLocation(mainImporterLocation)
    this.mainImporter = mainImporter
    this.importers.add(mainImporter)
    this.manifests.set(mainImporter.id, mainManifest)
  }

  /**
   * Create a new edge between two nodes of the graph in case both exist,
   * in case the destination node does not exists, then a dangling edge,
   * pointing to nothing will be created to represent that missing dependency.
   */
  newEdge(
    type: DependencyTypeLong,
    spec: Spec,
    from: Node,
    to?: Node,
  ) {
    const edgeOut = from.addEdgesTo(type, spec, to)
    this.edges.add(edgeOut)
    if (!to) {
      this.missingDependencies.add(edgeOut)
    }
  }

  /**
   * Create a new node in the graph.
   */
  newNode(
    id?: DepID,
    manifest?: ManifestMinified,
    spec?: Spec,
    name?: string,
  ) {
    const node = new Node(this.#config, id, manifest, spec, name)
    this.nodes.set(node.id, node)
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
   * consider using `newNode()` and `newEdge()` instead.
   */
  placePackage(
    fromNode: Node,
    depType: DependencyTypeLong,
    spec: Spec,
    manifest?: ManifestMinified,
  ) {
    // if no manifest is available, then create an edge that has no
    // reference to any other node, representing a missing dependency
    if (!manifest) {
      this.newEdge(depType, spec, fromNode)
      return
    }

    const depId = getId(spec, manifest)

    // if a node for this package is already represented by a node
    // in the graph, then just creates a new edge to that node
    const toFoundNode = this.nodes.get(depId)
    if (toFoundNode) {
      this.newEdge(depType, spec, fromNode, toFoundNode)
      return toFoundNode
    }

    // creates a new node and edges to its parent
    const toNode = this.newNode(depId, manifest)
    toNode.setResolved()
    this.newEdge(depType, spec, fromNode, toNode)
    return toNode
  }
}
