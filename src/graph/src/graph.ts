import { pathToFileURL } from 'node:url'
import { getId, DepID } from '@vltpkg/dep-id'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Spec } from '@vltpkg/spec'
import { Edge } from './edge.js'
import { Node } from './node.js'
import { DependencyTypeLong } from './dependencies.js'
import { ManifestMinified } from '@vltpkg/types'

type ManifestInventory = Map<DepID, ManifestMinified>

export interface GraphOptions {
  location: string
  mainManifest: ManifestMinified
  packageInfo?: PackageInfoClient
  manifests?: ManifestInventory
}

export class Graph {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Graph'
  }

  /**
   * A {@link PackageInfoClient} instance used to request packages info.
   */
  packageInfo: PackageInfoClient

  /**
   * An inventory with all manifests related to an install.
   */
  manifests: ManifestInventory

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

  constructor({
    location,
    mainManifest,
    packageInfo,
    manifests,
  }: GraphOptions) {
    this.packageInfo = packageInfo ?? new PackageInfoClient()
    this.manifests = manifests ?? (new Map() as ManifestInventory)

    const mainImporterLocation = String(pathToFileURL(location))
    const mainImporterSpec = Spec.parse(
      mainManifest.name || mainImporterLocation,
      mainImporterLocation,
    )
    const mainImporter = this.newNode(
      mainManifest,
      undefined,
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
    if (!to) {
      this.missingDependencies.add(edgeOut)
    }
  }

  /**
   * Create a new node in the graph.
   */
  newNode(manifest: ManifestMinified, id?: DepID, spec?: Spec) {
    const node = new Node(manifest, id, spec)
    this.nodes.set(node.id, node)
    return node
  }

  /**
   * Place a new package into the graph representation, creating the new
   * edges and possibly new nodes required for it.
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
    const toNode = this.newNode(manifest, depId)
    this.manifests.set(depId, manifest)
    this.newEdge(depType, spec, fromNode, toNode)
    return toNode
  }
}
