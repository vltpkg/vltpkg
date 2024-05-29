import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Integrity, ManifestMinified } from '@vltpkg/types'
import { DependencyTypeShort, longTypes } from '../dependencies.js'
import { Graph, ManifestInventory } from '../graph.js'

type LockfileNode = [Integrity | null, string?]
type LockfileEdge = [DepID, DependencyTypeShort, string, DepID?]

export interface LoadOptions {
  dir: string
  mainManifest: ManifestMinified
}

interface LoadEdgesOptions {
  graph: Graph
  edgesInfo: LockfileEdge[]
}

interface LoadNodesOptions {
  graph: Graph
  nodesInfo: [DepID, LockfileNode][]
}

const loadNodes = ({ graph, nodesInfo }: LoadNodesOptions) => {
  for (const [id, lockfileNode] of nodesInfo) {
    const [integrity, resolved] = lockfileNode
    const node = graph.newNode(id)
    node.integrity = integrity || undefined
    node.resolved = resolved
  }
}

const loadEdges = (
  { graph, edgesInfo }: LoadEdgesOptions,
  registries: Record<string, string>,
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
    graph.newEdge(
      type,
      Spec.parse(spec, { registries } as SpecOptions),
      from,
      to,
    )
  }
}

export const load = ({ dir, mainManifest }: LoadOptions): Graph => {
  const file = readFileSync(resolve(dir, 'vlt-lock.json'), {
    encoding: 'utf8',
  })
  const json = JSON.parse(file)
  const store: [DepID, LockfileNode][] = Object.entries(
    json.nodes,
  ) as [DepID, LockfileNode][]
  const edgesInfo = json.edges as LockfileEdge[]
  const [mainImporterInfo, ...nodesInfo] = store
  if (!mainImporterInfo) {
    throw error('Missing nodes from lockfile', {
      found: store,
    })
  }
  const graph = new Graph(
    {
      mainManifest,
    },
    { registries: json.registries },
  )

  loadNodes({ graph, nodesInfo })
  loadEdges({ graph, edgesInfo }, json.registries)

  return graph
}
