import { splitDepID } from '@vltpkg/dep-id/browser'
import {
  type LockfileData,
  getBooleanFlagsFromNum,
  type LockfileNode,
} from './types.js'
import { type DepID } from '@vltpkg/dep-id'
import { type GraphLike } from '../types.js'

export const loadNodes = (
  graph: GraphLike,
  nodes: LockfileData['nodes'],
) => {
  const entries = Object.entries(nodes) as [DepID, LockfileNode][]
  for (const [id, lockfileNode] of entries) {
    // workspace nodes and the project root node are already part of the
    // graph and it should not create new nodes if an existing one is there
    if (graph.nodes.has(id)) continue

    const [flags, name, integrity, resolved, location, manifest] =
      lockfileNode
    const [type, , spec] = splitDepID(id)

    // if the lockfile has manifest data then it should just use that
    // otherwise tries to infer name / version value from the lockfile node
    const node =
      manifest ?
        graph.addNode(id, manifest)
      : graph.addNode(
          id,
          undefined,
          undefined,
          name ?? undefined,
          type === 'registry' && spec.indexOf('@') > 0 ?
            spec.split('@').slice(-1)[0]
          : undefined,
        )

    const { dev, optional } = getBooleanFlagsFromNum(flags)
    node.dev = dev
    node.optional = optional
    node.integrity = integrity ?? undefined
    node.resolved = resolved ?? undefined
    if (location) node.location = location
  }
}
