import { DepID } from '@vltpkg/dep-id'
import { SpecOptions } from '@vltpkg/spec'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type Edge } from '../edge.js'
import { type Graph } from '../graph.js'
import { type Node } from '../node.js'
import {
  getFlagNumFromNode,
  LockfileData,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileEdgeValue,
  LockfileNode,
} from './types.js'

export type SaveOptions = SpecOptions & {
  /**
   * The graph to be stored in the lockfile.
   */
  graph: Graph
  /**
   * Should it save manifest data in the lockfile?
   */
  saveManifests?: boolean
}

const formatNodes = (
  nodes: Iterable<Node>,
  saveManifests?: boolean,
  registry?: string,
) => {
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

  const res: Record<DepID, LockfileNode> = {}
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

    const flags = getFlagNumFromNode(node)
    const lockfileNode: LockfileNode = [flags, node.name]

    if (node.integrity) {
      lockfileNode[2] = node.integrity
    }

    if (resolved) {
      lockfileNode[3] = resolved
    }

    if (location) {
      lockfileNode[4] = location
    }

    if (saveManifests) {
      lockfileNode[5] = node.manifest
    }

    res[node.id] = lockfileNode
  }
  return res
}

const formatEdges = (edges: Set<Edge>): LockfileEdges =>
  Object.fromEntries(
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
      .map((edge): [LockfileEdgeKey, LockfileEdgeValue] => [
        `${edge.from.id} ${edge.spec.name}`,
        `${edge.type} ${edge.spec.bareSpec || '*'} ${edge.to?.id ?? 'MISSING'}`,
      ]),
  )

const isRegistries = (
  registries: unknown,
): registries is Record<string, string> =>
  !(!registries || typeof registries === 'string')

export const lockfileData = ({
  graph,
  registry,
  registries,
  saveManifests,
}: SaveOptions): LockfileData => ({
  registries: isRegistries(registries) ? registries : {},
  nodes: formatNodes(graph.nodes.values(), saveManifests, registry),
  edges: formatEdges(graph.edges),
})

export const save = (options: SaveOptions) => {
  const { graph } = options
  const json = JSON.stringify(lockfileData(options), null, 2)
  const content =
    options.saveManifests ? json : (
      `${json}\n`
        // renders each node / edge as a single line entry
        .replaceAll('\n      ', '')
        .replaceAll('\n    ]', ']')
    )
  writeFileSync(resolve(graph.projectRoot, 'vlt-lock.json'), content)
}
