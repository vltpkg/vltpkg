import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { ManifestMinified } from '@vltpkg/types'
import { longTypes } from '../dependencies.js'
import { Graph } from '../graph.js'
import {
  LockfileData,
  LockfileDataNode,
  LockfileDataEdge,
} from './types.js'

export interface LoadOptions {
  dir: string
  mainManifest: ManifestMinified
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

export const load = (
  { dir, mainManifest }: LoadOptions,
  config: SpecOptions,
): Graph => {
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
  const mergedOptions = {
    ...config,
    registries: lockfileData.registries,
  } as SpecOptions
  const graph = new Graph({ mainManifest }, mergedOptions)

  loadNodes({ graph, nodesInfo })
  loadEdges({ graph, edgesInfo }, mergedOptions)

  return graph
}
