import { DepID } from '@vltpkg/dep-id'
import { SpecOptions } from '@vltpkg/spec'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Edge } from '../edge.js'
import { Graph } from '../graph.js'
import { Node } from '../node.js'
import {
  LockfileData,
  LockfileDataEdge,
  LockfileDataNode,
} from './types.js'

export type SaveOptions = SpecOptions & {
  /**
   * The project root dirname.
   */
  projectRoot: string
  /**
   * The graph to be stored in the lockfile.
   */
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
    const lockfileNode: LockfileDataNode = [node.name]

    if (node.integrity) {
      lockfileNode[1] = node.integrity
    }

    if (resolved) {
      lockfileNode[2] = resolved
    }

    res[node.id] = lockfileNode
  }
  return res
}

const formatEdges = (edges: Set<Edge>): LockfileDataEdge[] =>
  [...edges].map(edge => [
    edge.from.id,
    edge.type,
    String(edge.spec),
    edge.to?.id,
  ])

const isRegistries = (
  registries: unknown,
): registries is Record<string, string> =>
  !(!registries || typeof registries === 'string')

export const save = (options: SaveOptions) => {
  const { graph, projectRoot, registry, registries } = options
  const lockfileData: LockfileData = {
    registries: isRegistries(registries) ? registries : {},
    nodes: formatNodes(graph.nodes.values(), registry),
    edges: formatEdges(graph.edges),
  }
  const content = `${JSON.stringify(lockfileData, null, 2)}\n`
    // renders each node / edge as a single line entry
    .replaceAll('\n      ', '')
    .replaceAll('\n    ]', ']')
  writeFileSync(resolve(projectRoot, 'vlt-lock.json'), content)
}
