import { DepID } from '@vltpkg/dep-id'
import { SpecOptions } from '@vltpkg/spec'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type Edge } from '../edge.js'
import { type Graph } from '../graph.js'
import { type Node } from '../node.js'
import {
  LockfileData,
  LockfileDataEdge,
  LockfileDataNode,
} from './types.js'

export type SaveOptions = SpecOptions & {
  /**
   * The graph to be stored in the lockfile.
   */
  graph: Graph
}

const formatNodes = (nodes: Iterable<Node>, registry?: string) => {
  const arr: Node[] = [...nodes]
  const [mainImporter, ...restPackages] = arr
  // nodes are sorted in order to have a deterministic result
  const orderedNodes: Node[] = restPackages.sort(
    (a, b) =>
      // sort importers to the top, then alphabetically by id
      Number(b.importer) - Number(a.importer) ||
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
    // if it's in a location other than the default, stash that
    const location =
      (
        node.importer ||
        node.id.startsWith('file;') ||
        node.location.endsWith(
          '/node_modules/.vlt/' +
            node.id +
            '/node_modules/' +
            node.name,
        )
      ) ?
        undefined
      : node.location
    const lockfileNode: LockfileDataNode = [node.name]

    if (node.integrity) {
      lockfileNode[1] = node.integrity
    }

    if (resolved) {
      lockfileNode[2] = resolved
    }

    if (location) {
      lockfileNode[3] = location
    }

    res[node.id] = lockfileNode
  }
  return res
}

const formatEdges = (edges: Set<Edge>): LockfileDataEdge[] =>
  [...edges]
    .sort(
      (a, b) =>
        /* c8 ignore start - nondeterminstic and annoying to test */
        // sort importers to the top, then alphabetically by
        // id, type, target
        Number(b.from.importer) - Number(a.from.importer) ||
        a.from.id.localeCompare(b.from.id, 'en') ||
        a.type.localeCompare(b.type, 'en') ||
        (a.to?.id ?? '').localeCompare(b.to?.id ?? ''),
      /* c8 ignore stop */
    )
    .map(edge => [
      edge.from.id,
      edge.type,
      String(edge.spec),
      edge.to?.id,
    ])

const isRegistries = (
  registries: unknown,
): registries is Record<string, string> =>
  !(!registries || typeof registries === 'string')

export const lockfileData = ({
  graph,
  registry,
  registries,
}: SaveOptions): LockfileData => ({
  registries: isRegistries(registries) ? registries : {},
  nodes: formatNodes(graph.nodes.values(), registry),
  edges: formatEdges(graph.edges),
})

export const save = (options: SaveOptions) => {
  const { graph } = options
  const content =
    `${JSON.stringify(lockfileData(options), null, 2)}\n`
      // renders each node / edge as a single line entry
      .replaceAll('\n      ', '')
      .replaceAll('\n    ]', ']')
  writeFileSync(resolve(graph.projectRoot, 'vlt-lock.json'), content)
}
