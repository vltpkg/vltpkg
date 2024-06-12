import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { ManifestMinified } from '@vltpkg/types'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import { longTypes } from '../dependencies.js'
import { Graph } from '../graph.js'
import {
  LockfileData,
  LockfileDataNode,
  LockfileDataEdge,
} from './types.js'

export type LoadOptions = SpecOptions & {
  /**
   * The project root dirname.
   */
  dir: string
  /**
   * The project root manifest.
   */
  mainManifest: ManifestMinified
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

interface LoadEdgesOptions {
  graph: Graph
  edgesInfo: LockfileDataEdge[]
}

interface LoadNodesOptions {
  graph: Graph
  nodesInfo: [DepID, LockfileDataNode][]
}

const loadNodes = ({ graph, nodesInfo }: LoadNodesOptions) => {
  for (const [id, lockfileNode] of nodesInfo) {
    // workspace nodes and the project root node are already part of the
    // graph and it should not create new nodes if an existing one is there
    if (graph.nodes.has(id)) return

    const [name, integrity, resolved] = lockfileNode
    const node = graph.newNode(id, undefined, undefined, name)
    node.integrity = integrity || undefined
    node.resolved = resolved
  }
}

const loadEdges = (
  { graph, edgesInfo }: LoadEdgesOptions,
  options: SpecOptions,
) => {
  for (const [fromId, shortType, spec, toId] of edgesInfo) {
    const type = longTypes.get(shortType)
    if (!type) {
      throw error('Found unsupported dependency type in lockfile', {
        found: shortType,
        validOptions: Object.keys(longTypes),
      })
    }
    const from = graph.nodes.get(fromId)
    const to = toId && graph.nodes.get(toId)
    if (!from) {
      throw error('Edge info missing its `from` node', {
        found: edgesInfo,
      })
    }
    graph.newEdge(type, Spec.parse(spec, options), from, to)
  }
}

export const load = (options: LoadOptions): Graph => {
  const { dir, mainManifest, scurry } = options
  const file = readFileSync(resolve(dir, 'vlt-lock.json'), {
    encoding: 'utf8',
  })
  const lockfileData = JSON.parse(file) as LockfileData
  const store = Object.entries(lockfileData.nodes) as [
    DepID,
    LockfileDataNode,
  ][]
  const edgesInfo = lockfileData.edges
  const [mainImporterInfo, ...nodesInfo] = store
  if (!mainImporterInfo) {
    throw error('Missing nodes from lockfile', {
      found: store,
    })
  }
  const packageJson = options.packageJson ?? new PackageJson()
  const monorepo =
    options.monorepo ??
    Monorepo.maybeLoad(options.dir, { packageJson, scurry })
  const mergedOptions = {
    ...options,
    registries: lockfileData.registries,
  } as SpecOptions
  const graph = new Graph({ mainManifest, monorepo }, mergedOptions)

  loadNodes({ graph, nodesInfo })
  loadEdges({ graph, edgesInfo }, mergedOptions)

  return graph
}
