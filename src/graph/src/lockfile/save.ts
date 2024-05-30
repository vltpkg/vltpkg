import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ConfigFileData } from '@vltpkg/config'
import { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { dependencyTypes } from '../dependencies.js'
import { Edge } from '../edge.js'
import { Graph } from '../graph.js'
import { Node } from '../node.js'
import {
  LockfileData,
  LockfileDataNode,
  LockfileDataEdge,
} from './types.js'

export interface SaveOptions {
  dir: string
  graph: Graph
}

const formatNodes = (nodes: Iterable<Node>, registry?: string) => {
  const arr: Node[] = [...nodes]
  const [mainImporter, ...restPackages] = arr
  // nodes are sorted in order to have a deterministic result
  const orderedNodes: Node[] = restPackages.sort((a, b) =>
    a.id.localeCompare(b.id, 'en'),
  )

  // the main importer node is always the first of the list
  if (mainImporter) {
    orderedNodes.unshift(mainImporter)
  }

  const res: Record<DepID, LockfileDataNode> = {}
  for (const node of orderedNodes) {
    const customRegistry =
      node.resolved && registry && !node.resolved.startsWith(registry)
    const resolved = customRegistry ? node.resolved : undefined
    const lockfileNode: LockfileDataNode = [node.integrity, resolved]
    // reduce array size in order to omit trailing `null` item for each entry
    if (!resolved) {
      lockfileNode.length = 1
    }
    res[node.id] = lockfileNode
  }
  return res
}

const formatEdges = (edges: Set<Edge>): LockfileDataEdge[] =>
  [...edges].map(edge => {
    const type = dependencyTypes.get(edge.type)
    if (!type) {
      throw error('Found edge with a missing type', {
        spec: edge.spec,
      })
    }
    return [edge.from.id, type, String(edge.spec), edge.to?.id]
  })

const isRegistries = (
  registries: unknown,
): registries is Record<string, string> =>
  !(!registries || typeof registries === 'string')

export const save = (
  { graph, dir }: SaveOptions,
  { registry, registries }: ConfigFileData,
) => {
  const lockfileData: LockfileData = {
    registries: isRegistries(registries) ? registries : {},
    nodes: formatNodes(graph.nodes.values(), registry),
    edges: formatEdges(graph.edges),
  }
  const content = JSON.stringify(
    lockfileData,
    null,
    2,
    // renders each node / edge as a single line entry
  )
    .replaceAll('\n      ', '')
    .replaceAll('\n    ]', ']')
  writeFileSync(resolve(dir, 'vlt-lock.json'), content)
}
