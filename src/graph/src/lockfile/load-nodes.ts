import { splitDepID } from '@vltpkg/dep-id/browser'
import { getBooleanFlagsFromNum } from './types.ts'
import type { LockfileData, LockfileNode } from './types.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { GraphLike } from '../types.ts'

export const loadNodes = (
  graph: GraphLike,
  nodes: LockfileData['nodes'],
  actual?: GraphLike,
) => {
  const entries = Object.entries(nodes) as [DepID, LockfileNode][]
  for (const [id, lockfileNode] of entries) {
    // workspace nodes and the project root node are already part of the
    // graph and it should not create new nodes if an existing one is there
    if (graph.nodes.has(id)) continue

    const [
      flags,
      name,
      integrity,
      resolved,
      location,
      manifest,
      rawManifest,
    ] = lockfileNode
    const [type, filepath, maybeExtra, lastExtra] = splitDepID(id)
    const extra =
      type === 'registry' || type === 'git' ? lastExtra : maybeExtra
    const registrySpec = maybeExtra

    // The reference node is a node that matches the same id from the
    // current iterating node in the provided `actual` graph, this allows
    // for hydrating missing manifest, integrity, and resolved values
    // that may be missing from the lockfile
    const referenceNode = actual?.nodes.get(id)
    const mani = manifest ?? referenceNode?.manifest

    // if the lockfile has manifest data then it should just use that
    // otherwise tries to infer name / version value from the lockfile node
    const node =
      mani ?
        graph.addNode(id, mani)
      : graph.addNode(
          id,
          undefined,
          undefined,
          name ?? undefined,
          (
            type === 'registry' &&
              registrySpec &&
              registrySpec.indexOf('@') > 0
          ) ?
            registrySpec.split('@').slice(-1)[0]
          : undefined,
        )
    if (extra) {
      node.modifier = extra
    }

    const { dev, optional } = getBooleanFlagsFromNum(flags)
    node.dev = dev
    node.optional = optional
    node.integrity = integrity ?? referenceNode?.integrity
    node.resolved = resolved ?? referenceNode?.resolved
    if (!node.resolved) node.setResolved()
    if (location) {
      node.location = location
    } else {
      // set the location to file dependencies based on the id value
      if (type === 'file') {
        node.location = filepath
      }
    }
    if (mani && rawManifest) {
      node.setConfusedManifest(mani, rawManifest)
    }
  }
}
