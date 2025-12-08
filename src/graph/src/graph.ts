import { getId, joinDepIDTuple, splitExtra } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { satisfies } from '@vltpkg/satisfies'
import { getOptions, Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type {
  GraphLike,
  NodeLike,
  NormalizedManifest,
  DependencySaveType,
} from '@vltpkg/types'
import type { Monorepo } from '@vltpkg/workspaces'
import { inspect } from 'node:util'
import type { InspectOptions } from 'node:util'
import { lockfileData } from './lockfile/save.ts'
import { Edge } from './edge.ts'
import { Node } from './node.ts'
import type { NodeOptions } from './node.ts'
import { resolveSaveType } from './resolve-save-type.ts'
import type { PeerContext } from './ideal/types.ts'

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')

const cacheKeySeparator = '│'

// this is always the same, but we don't hard code it as a string,
// in case the DepID module needs to change its delimiter again ever.
const mainDepID = joinDepIDTuple(['file', '.'])

export type ManifestInventory = Map<DepID, NormalizedManifest>

const getMap = <T extends Map<any, any>>(m?: T) =>
  m ?? (new Map() as T)

/**
 * Get a cache key for a resolution based on the
 * spec, location and query modifier.
 */
const getResolutionCacheKey = (
  spec: Spec,
  location: string,
  extra: string,
): string => {
  const f = spec.final
  // if it's a file: dep, then the fromNode location matters
  const fromPrefix = f.type === 'file' ? location + ' : ' : ''
  // the unique key should also precise what is the type of the spec,
  // and in the case of a registry, what registry it is from.
  const typePrecisionKey =
    f.registry ?
      `${cacheKeySeparator}registry` +
      `${cacheKeySeparator}${f.registry}`
    : f.gitRemote ?
      `${cacheKeySeparator}git` + `${cacheKeySeparator}${f.gitRemote}`
    : `${cacheKeySeparator}${f.type}`
  const modifierSuffix = `${cacheKeySeparator}${extra}`
  return fromPrefix + String(f) + typePrecisionKey + modifierSuffix
}

export type GraphOptions = SpecOptions & {
  /**
   * The main importer manifest info.
   */
  mainManifest: NormalizedManifest
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

export class Graph implements GraphLike {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Graph'
  }

  #options: GraphOptions

  #nodeOptions: NodeOptions

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
  edges = new Set<Edge>()

  /**
   * Map registered dep ids to the node that represent them in the graph.
   */
  nodes = new Map<DepID, Node>()

  /**
   * Map of nodes by their name
   */
  nodesByName = new Map<string, Set<Node>>()

  /**
   * Cached resolutions for spec lookups
   */
  resolutions = new Map<string, Node>()

  /**
   * Reverse map of resolutions
   */
  resolutionsReverse = new Map<Node, Set<string>>()

  /**
   * A set of importer nodes in this graph.
   */
  importers = new Set<Node>()

  /**
   * The {@link Node} that represents the project root `package.json`.
   */
  mainImporter: Node

  /**
   * A set of extraneous dependencies found when building the graph.
   */
  extraneousDependencies = new Set<Edge>()

  /**
   * The root of the project this graph represents
   */
  projectRoot: string

  /**
   * The peer context sets used to resolve peer dependencies within this graph.
   */
  peerContexts: PeerContext[]

  /**
   * Tracks the current peer context index.
   */
  currentPeerContextIndex = 0

  constructor(options: GraphOptions) {
    const { mainManifest, monorepo } = options
    this.#options = options
    // hydrate spec options to their full contents, including defaults
    const specOptions = getOptions({
      registry: options.registry,
      registries: options.registries,
      'git-hosts': options['git-hosts'],
      'git-host-archives': options['git-host-archives'],
      'scope-registries': options['scope-registries'],
      'jsr-registries': options['jsr-registries'],
      catalog: options.catalog,
      catalogs: options.catalogs,
    })
    this.manifests = getMap(options.manifests)
    this.projectRoot = options.projectRoot
    this.#nodeOptions = {
      ...this.#options,
      ...specOptions,
      graph: this,
    }

    // add the project root node
    const mainImporterLocation = '.'
    const mainImporterSpec = Spec.parse(
      mainManifest.name || '(root)',
      mainImporterLocation,
    )
    const mainImporter = this.addNode(
      mainDepID,
      mainManifest,
      mainImporterSpec,
    )
    mainImporter.setImporterLocation(mainImporterLocation)
    mainImporter.mainImporter = true
    this.mainImporter = mainImporter
    this.mainImporter.workspaces = new Map()
    this.importers.add(mainImporter)
    this.manifests.set(mainImporter.id, mainManifest)

    // uses the monorepo instance in order to retrieve info on
    // workspaces and create importer nodes for each of them
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
        // creates a virtual edge to connect the workspaces to the root node
        const edge = new Edge(
          'prod',
          Spec.parse(wsNode.name, 'workspace:*', this.#options),
          this.mainImporter,
          wsNode,
        )
        this.mainImporter.workspaces.set(wsNode.name, edge)
      }
    }

    // initializes the peer context set collection
    const initialPeerContext: PeerContext = new Map()
    initialPeerContext.index = this.currentPeerContextIndex
    this.peerContexts = [initialPeerContext]
  }

  /**
   * Get the next peer context index.
   */
  nextPeerContextIndex() {
    return ++this.currentPeerContextIndex
  }

  /**
   * Delete all nodes and edges that are unreachable from the importers.
   * The collection of deleted nodes is returned.
   *
   * NOTE: This can be extremely slow for large graphs, and is almost always
   * unnecessary! Only call when it is known that some unreachable nodes may
   * have been created, for example when deleting the unneeded subgraph when an
   * optional node fails to resolve/install.
   */
  gc() {
    const { nodes } = this
    this.edges.clear()
    this.nodes = new Map()
    const marked = new Set(this.importers)
    for (const imp of marked) {
      // don't delete the importer!
      nodes.delete(imp.id)
      this.nodes.set(imp.id, imp)
      for (const edge of imp.edgesOut.values()) {
        this.edges.add(edge)
        const { to } = edge
        if (!to || marked.has(to)) continue
        marked.add(to)
        nodes.delete(to.id)
        this.nodes.set(to.id, to)
      }
    }
    for (const node of nodes.values()) {
      this.removeNode(node)
    }
    return nodes
  }

  /**
   * Create a new edge between two nodes of the graph in case both exist,
   * in case the destination node does not exists, then a dangling edge,
   * pointing to nothing will be created to represent that missing dependency.
   */
  addEdge(
    type: DependencySaveType,
    spec: Spec,
    from: NodeLike,
    to?: NodeLike,
  ) {
    // fix any nameless spec
    if (spec.name === '(unknown)') {
      if (to) {
        spec.name = to.name /* c8 ignore next */ || '(unknown)'
        spec.spec = `${to.name}@${spec.bareSpec}`
      } else {
        throw error(
          'Impossible to place a missing, nameless dependency',
          { spec },
        )
      }
    }
    const existing = from.edgesOut.get(spec.name)
    if (existing) {
      const edge = existing as Edge
      if (
        edge.type === type &&
        edge.spec.bareSpec === spec.bareSpec
      ) {
        if (to && to !== edge.to) {
          // removes this edge from its destination edgesIn ref
          edge.to?.edgesIn.delete(edge)
          // now swap the destination to the new one
          edge.to = to as Node
          edge.to.edgesIn.add(edge)
        }
        return edge
      }
      this.edges.delete(edge)
    }
    const f = from as Node
    const edgeOut = f.addEdgesTo(
      resolveSaveType(from, spec.name, type),
      spec,
      to as Node | undefined,
    )
    this.edges.add(edgeOut)
    return edgeOut
  }

  /**
   * Find an existing node to satisfy a dependency
   */
  findResolution(spec: Spec, fromNode: Node, extra = '') {
    const f = spec.final
    const sf = getResolutionCacheKey(f, fromNode.location, extra)
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
    manifest?: NormalizedManifest,
    spec?: Spec,
    name?: string,
    version?: string,
  ) {
    const node = new Node(
      this.#nodeOptions,
      id,
      manifest,
      spec,
      name,
      version,
    )
    this.nodes.set(node.id, node)
    const nbn = this.nodesByName.get(node.name) ?? new Set()
    nbn.add(node)

    // ensure the nodes by name set is always sorted, this will help
    // keeping a deterministic graph resolution when reusing nodes
    const newByNameSet = new Set(
      [...nbn].sort((a, b) => a.id.localeCompare(b.id)),
    )
    this.nodesByName.set(node.name, newByNameSet)

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
    depType: DependencySaveType,
    spec: Spec,
    manifest?: NormalizedManifest,
    id?: DepID,
    extra?: string,
  ): Node | undefined {
    // if no manifest is available, then create an edge that has no
    // reference to any other node, representing a missing dependency
    if (!manifest && !id) {
      this.addEdge(depType, spec, fromNode)
      return
    }

    // flags set on the node we're about to create or find.
    const flags = {
      dev: fromNode.dev || depType === 'dev',
      optional:
        fromNode.optional ||
        depType === 'optional' ||
        depType === 'peerOptional',
    }

    const depId = id || (manifest && getId(spec, manifest, extra))

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
      // the current only stays dev/optional if this dep lets it remain so
      // if it's not already, we don't make it dev or optional.
      toFoundNode.detached = false
      toFoundNode.dev &&= flags.dev
      toFoundNode.optional &&= flags.optional
      return toFoundNode
    }

    // creates a new node and edges to its parent
    const toNode = this.addNode(depId, manifest, spec)
    toNode.registry = spec.registry
    toNode.dev = flags.dev
    toNode.optional = flags.optional
    // split extra into modifier and peerSetHash
    if (extra) {
      const { modifier, peerSetHash } = splitExtra(extra)
      toNode.modifier = modifier
      toNode.peerSetHash = peerSetHash
    }

    // add extra manifest info if available
    if (manifest) {
      const { bin, engines, os, cpu } = manifest
      // add platform info if available
      if (engines || os || cpu) {
        const platform: NodeLike['platform'] = {}
        if (engines) platform.engines = engines
        if (os) platform.os = os
        if (cpu) platform.cpu = cpu
        toNode.platform = platform
      }
      // add bin info if available
      if (bin) {
        toNode.bins = bin
      }
    }
    toNode.maybeSetConfusedManifest(spec, manifest)

    this.addEdge(depType, spec, fromNode, toNode)

    // populate resolution cache if applicable
    const f = getResolutionCacheKey(
      spec.final,
      fromNode.location,
      extra || '',
    )
    this.resolutions.set(f, toNode)
    const rrev = this.resolutionsReverse.get(toNode) ?? new Set()
    rrev.add(f)
    this.resolutionsReverse.set(toNode, rrev)

    return toNode
  }

  /**
   * Removes a node and its relevant edges from the graph.
   *
   * Use the `keepEdges` option to keep the edges that were pointing to
   * this node and only removes their `to` property value.
   *
   * If a replacement is provided, then any edges that were previously
   * pointing to the removed node will be directed to the replacement,
   * if it is valid to do so.
   */
  removeNode(node: Node, replacement?: Node, keepEdges?: boolean) {
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
      } else if (keepEdges) {
        edge.to = undefined
      } else {
        edge.from.edgesOut.delete(edge.spec.name)
        this.edges.delete(edge)
      }
    }
  }

  /**
   * Removes the resolved node of a given edge.
   */
  removeEdgeResolution(edge: Edge, extra = '') {
    const node = edge.to
    const resolutionKey = getResolutionCacheKey(
      edge.spec,
      edge.from.location,
      extra,
    )
    if (node) {
      edge.to = undefined
      this.resolutions.delete(resolutionKey)
      this.resolutionsReverse.get(node)?.delete(resolutionKey)
      this.nodesByName.delete(node.name)
      node.edgesIn.delete(edge)
      if (node.edgesIn.size === 0) {
        this.nodes.delete(node.id)
      }
    }
  }

  /**
   * Remove all edges from the graph while preserving nodes and resolution caches.
   * This allows the graph to be reconstructed efficiently using the existing nodes.
   */
  resetEdges() {
    // Clear the global edges set
    this.edges.clear()

    // Clear all node edge relationships
    for (const node of this.nodes.values()) {
      // marking nodes as detached needs to be restricted to only those
      // that had a manifest, otherwise we'd be skipping fetching manifest
      // for nodes we don't have a manifest during the ideal build phase
      if (node.manifest) node.detached = true

      // detaches all edges from this node
      node.edgesOut.clear()
      node.edgesIn.clear()
    }
  }

  toJSON() {
    return lockfileData({
      ...this.#options,
      graph: this,
      saveManifests: true,
    })
  }

  [kCustomInspect](_: number, options: InspectOptions) {
    const data = this.toJSON()
    return `${this[Symbol.toStringTag]} ${inspect(data, options)}`
  }
}
