import { type Manifest } from '@vltpkg/types'
import { lockfile } from '@vltpkg/graph/browser'
import { type DepID } from '@vltpkg/dep-id/browser'
import {
  type EdgeLike,
  type LockfileData,
  type GraphLike,
  type NodeLike,
  type DependencyTypeShort,
} from '@vltpkg/graph'
import {
  defaultRegistry,
  defaultRegistries,
  defaultGitHosts,
  defaultGitHostArchives,
  defaultScopeRegistries,
  type SpecOptionsFilled,
  type Spec,
} from '@vltpkg/spec/browser'
import { type TransferData } from './types.js'

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
    // should set the main importer in the first iteration
    if (!graph.mainImporter) {
      graph.mainImporter = node
    }
    graph.importers.add(node)
  }

  // populate nodes and edges from loaded data
  const graph = maybeGraph as GraphLike
  lockfile.loadNodes(graph, transfered.lockfile.nodes)
  const specOptions = loadSpecOptions(transfered.lockfile)
  lockfile.loadEdges(graph, transfered.lockfile.edges, specOptions)

  return {
    graph,
    specOptions,
  }
}
