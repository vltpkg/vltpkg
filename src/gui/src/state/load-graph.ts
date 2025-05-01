import { lockfile, stringifyNode } from '@vltpkg/graph/browser'
import { SecurityArchive } from '@vltpkg/security-archive/browser'
import {
  defaultRegistry,
  defaultRegistries,
  defaultGitHosts,
  defaultGitHostArchives,
  defaultScopeRegistries,
} from '@vltpkg/spec/browser'
import type { Manifest, DependencyTypeShort } from '@vltpkg/types'
import type { DepID } from '@vltpkg/dep-id/browser'
import type {
  EdgeLike,
  LockfileData,
  GraphLike,
  NodeLike,
} from '@vltpkg/graph'
import type { SpecOptionsFilled, Spec } from '@vltpkg/spec/browser'
import type { TransferData } from './types.ts'

const loadSpecOptions = (
  lockfile: LockfileData,
): SpecOptionsFilled => {
  const {
    registries,
    registry,
    'git-hosts': gitHosts,
    'git-host-archives': gitHostArchives,
    'scope-registries': scopeRegistries,
  } = lockfile.options
  return {
    registries: { ...defaultRegistries, ...registries },
    registry: registry || defaultRegistry,
    'git-hosts': { ...defaultGitHosts, ...gitHosts },
    'git-host-archives': {
      ...defaultGitHostArchives,
      ...gitHostArchives,
    },
    'scope-registries': {
      ...defaultScopeRegistries,
      ...scopeRegistries,
    },
  }
}

type MaybeGraphLike = Pick<
  GraphLike,
  | 'importers'
  | 'edges'
  | 'nodes'
  | 'projectRoot'
  | 'addEdge'
  | 'addNode'
> & {
  mainImporter?: NodeLike
}

export type LoadResponse = {
  graph: GraphLike
  specOptions: SpecOptionsFilled
  securityArchive: SecurityArchive | undefined
}

export const load = (transfered: TransferData): LoadResponse => {
  const [mainImporter] = transfered.importers
  const maybeGraph: MaybeGraphLike = {
    importers: new Set<NodeLike>(),
    edges: new Set<EdgeLike>(),
    nodes: new Map<DepID, NodeLike>(),
    projectRoot: mainImporter?.projectRoot || '',
    addEdge(
      type: DependencyTypeShort,
      spec: Spec,
      from: NodeLike,
      to?: NodeLike,
    ) {
      const existing = from.edgesOut.get(spec.name)
      if (existing) {
        const edge = existing
        if (
          edge.type === type &&
          edge.spec.bareSpec === spec.bareSpec
        ) {
          if (to && to !== edge.to) {
            edge.to = to
            edge.to.edgesIn.add(edge)
          }
          return edge
        }
        this.edges.delete(edge)
      }
      const edge: EdgeLike = {
        from,
        name: spec.name,
        spec,
        to,
        type,
      }
      from.edgesOut.set(spec.name, edge)
      to?.edgesIn.add(edge)
      this.edges.add(edge)
      return edge
    },
    addNode(id?: DepID, manifest?: Manifest) {
      const graph = this as GraphLike
      const node: NodeLike = {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: id!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: manifest!.name,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        version: manifest!.version,
        manifest,
        edgesIn: new Set(),
        edgesOut: new Map(),
        graph,
        importer: false,
        mainImporter: false,
        projectRoot: graph.projectRoot,
        dev: false,
        optional: false,
        confused: false,
        setResolved() {},
        setConfusedManifest(fixed: Manifest, confused?: Manifest) {
          this.manifest = fixed
          this.rawManifest = confused
          this.confused = true
        },
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
            confused: this.confused,
            ...(this.confused ?
              { rawManifest: this.rawManifest }
            : undefined),
          }
        },
        toString() {
          return stringifyNode(this)
        },
      }
      this.nodes.set(node.id, node)
      return node
    },
  }

  // configure importer nodes
  for (const importer of transfered.importers) {
    const id = importer.id as DepID
    const graph = maybeGraph
    const node: NodeLike = graph.addNode(id, importer.manifest)
    node.importer = true
    node.mainImporter = importer.id === mainImporter?.id
    node.location = importer.location
    node.integrity = importer.integrity
    node.resolved = importer.resolved
    node.dev = importer.dev
    node.optional = importer.optional
    node.confused = false
    node.toJSON = () => ({
      id: node.id,
      name: node.name,
      version: node.version,
      location: node.location,
      importer: node.importer,
      manifest: node.manifest,
      projectRoot: node.projectRoot,
      integrity: node.integrity,
      resolved: node.resolved,
      dev: node.dev,
      optional: node.optional,
      confused: node.confused,
    })
    node.toString = () => stringifyNode(node)
    // should set the main importer in the first iteration
    graph.mainImporter ??= node
    graph.importers.add(node)
  }

  // populate nodes and edges from loaded data
  const graph = maybeGraph as GraphLike
  lockfile.loadNodes(graph, transfered.lockfile.nodes)
  const specOptions = loadSpecOptions(transfered.lockfile)
  lockfile.loadEdges(graph, transfered.lockfile.edges, specOptions)
  const securityArchive = SecurityArchive.load(
    transfered.securityArchive,
  )

  // validates that all nodes have a security archive entry
  if (securityArchive) {
    securityArchive.ok = true
    for (const node of graph.nodes.values()) {
      if (!securityArchive.has(node.id)) {
        securityArchive.ok = false
        break
      }
    }
  }

  return {
    graph,
    specOptions,
    securityArchive,
  }
}
