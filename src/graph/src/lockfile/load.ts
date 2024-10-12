import { asDepID, DepID, splitDepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { fastSplit } from '@vltpkg/fast-split'
import { PackageJson } from '@vltpkg/package-json'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Manifest } from '@vltpkg/types'
import { Monorepo } from '@vltpkg/workspaces'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import {
  DependencyTypeShort,
  longDependencyTypes,
  shortDependencyTypes,
} from '../dependencies.js'
import { Graph } from '../graph.js'
import {
  getBooleanFlagsFromNum,
  LockfileData,
  LockfileEdgeKey,
  LockfileEdgeValue,
  LockfileNode,
} from './types.js'

export type LoadOptions = SpecOptions & {
  /**
   * The project root dirname.
   */
  projectRoot: string
  /**
   * The project root manifest.
   */
  mainManifest: Manifest
  /**
   * A {@link Monorepo} object, for managing workspaces
   */
  monorepo?: Monorepo
  /**
   * A {@link PackageJson} object, for sharing manifest caches
   */
  packageJson?: PackageJson
  /**
   * A {@link PathScurry} object, for use in globs
   */
  scurry?: PathScurry
}

export const load = (options: LoadOptions): Graph => {
  const { projectRoot } = options
  return loadObject(
    options,
    JSON.parse(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
        encoding: 'utf8',
      }),
    ),
  )
}

export const loadHidden = (options: LoadOptions): Graph => {
  const { projectRoot } = options
  return loadObject(
    options,
    JSON.parse(
      readFileSync(
        resolve(projectRoot, 'node_modules/.vlt-lock.json'),
        { encoding: 'utf8' },
      ),
    ),
  )
}

export const loadObject = (
  options: LoadOptions,
  lockfileData: LockfileData,
) => {
  const { mainManifest, scurry } = options
  const packageJson = options.packageJson ?? new PackageJson()
  const monorepo =
    options.monorepo ??
    Monorepo.maybeLoad(options.projectRoot, { packageJson, scurry })
  const {
    'scope-registries': scopeRegistries,
    registry,
    registries,
    'git-hosts': gitHosts,
    'git-host-archives': gitHostArchives,
  } = lockfileData.options
  const mergedOptions = {
    ...options,
    'scope-registries': {
      ...options['scope-registries'],
      ...scopeRegistries,
    },
    registry: registry ?? options.registry,
    registries: {
      ...options.registries,
      ...registries,
    },
    'git-hosts': {
      ...options['git-hosts'],
      ...gitHosts,
    },
    'git-host-archives': {
      ...options['git-host-archives'],
      ...gitHostArchives,
    },
  }
  const graph = new Graph({
    ...mergedOptions,
    mainManifest,
    monorepo,
  })

  loadNodes(graph, lockfileData.nodes)
  loadEdges(graph, lockfileData.edges, mergedOptions)

  return graph
}

const loadNodes = (graph: Graph, nodes: LockfileData['nodes']) => {
  const entries = Object.entries(nodes) as [DepID, LockfileNode][]
  for (const [id, lockfileNode] of entries) {
    // workspace nodes and the project root node are already part of the
    // graph and it should not create new nodes if an existing one is there
    if (graph.nodes.has(id)) continue

    const [flags, name, integrity, resolved, location] = lockfileNode
    const [type, , spec] = splitDepID(id)
    const version =
      type === 'registry' ? Spec.parse(spec).bareSpec : undefined
    const node = graph.addNode(
      id,
      undefined,
      undefined,
      /* c8 ignore next */
      name ?? undefined,
      version,
    )
    const { dev, optional } = getBooleanFlagsFromNum(flags)
    node.dev = dev
    node.optional = optional
    node.integrity = integrity ?? undefined
    node.resolved = resolved ?? undefined
    if (location) node.location = location
  }
}

const loadEdges = (
  graph: Graph,
  edges: LockfileData['edges'],
  options: SpecOptions,
) => {
  const entries = Object.entries(edges) as [
    LockfileEdgeKey,
    LockfileEdgeValue,
  ][]
  for (const [key, value] of entries) {
    const [fromId, specName] = fastSplit(key, ' ', 2)
    const [depType, valRest] = fastSplit(value, ' ', 2)
    const vrSplit = valRest?.lastIndexOf(' ') ?? -1
    // not a valid edge record
    /* c8 ignore start */
    if (!valRest || !depType || !fromId || !specName || vrSplit < 1) {
      continue
    }
    /* c8 ignore stop */
    const spec = Spec.parse(
      specName,
      valRest.substring(0, vrSplit),
      options,
    )
    const toId = valRest.substring(vrSplit + 1)
    const from = graph.nodes.get(asDepID(fromId))
    if (!from) {
      throw error('Edge info missing its `from` node', {
        found: {
          nodes: [...graph.nodes].map(([id]) => id),
          from,
          fromId,
          edge: { [key]: value },
        },
      })
    }
    const to =
      toId === 'MISSING' ? undefined : graph.nodes.get(asDepID(toId))
    if (!shortDependencyTypes.has(depType as DependencyTypeShort)) {
      throw error('Found unsupported dependency type in lockfile', {
        validOptions: [...longDependencyTypes],
      })
    }
    graph.addEdge(depType as DependencyTypeShort, spec, from, to)
  }
}
