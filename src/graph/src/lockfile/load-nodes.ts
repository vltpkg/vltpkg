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
  const nodeCount = entries.length
  const useOptimizations = nodeCount > 50 // Only use optimizations for larger graphs

  // Pre-filter existing nodes to avoid unnecessary work
  const nodesToProcess = entries.filter(
    ([id]) => !graph.nodes.has(id),
  )

  // Cache for splitDepID results to avoid repeated parsing (only for large graphs)
  const depIdCache =
    useOptimizations ?
      new Map<DepID, ReturnType<typeof splitDepID>>()
    : null

  // Batch process registry spec parsing (only for large graphs)
  const registryVersionCache =
    useOptimizations ? new Map<string, string>() : null

  for (const [id, lockfileNode] of nodesToProcess) {
    const [
      flags,
      name,
      integrity,
      resolved,
      location,
      manifest,
      rawManifest,
    ] = lockfileNode

    // Cache splitDepID results for large graphs, compute directly for small ones
    let depIdParts: ReturnType<typeof splitDepID>
    if (useOptimizations && depIdCache) {
      depIdParts =
        depIdCache.get(id) ??
        (() => {
          const parts = splitDepID(id)
          depIdCache.set(id, parts)
          return parts
        })()
    } else {
      depIdParts = splitDepID(id)
    }

    const [type, filepath, maybeExtra, lastExtra] = depIdParts
    const extra =
      type === 'registry' || type === 'git' ? lastExtra : maybeExtra
    const registrySpec = maybeExtra

    // The reference node is a node that matches the same id from the
    // current iterating node in the provided `actual` graph, this allows
    // for hydrating missing manifest, integrity, and resolved values
    // that may be missing from the lockfile
    const referenceNode = actual?.nodes.get(id)
    const mani = manifest ?? referenceNode?.manifest

    // Optimize registry version extraction with caching for large graphs
    let version: string | undefined
    if (
      type === 'registry' &&
      registrySpec &&
      registrySpec.indexOf('@') > 0
    ) {
      if (useOptimizations && registryVersionCache) {
        version =
          registryVersionCache.get(registrySpec) ??
          (() => {
            const v =
              registrySpec.split('@').slice(-1)[0] || undefined
            if (v) {
              registryVersionCache.set(registrySpec, v)
            }
            return v
          })()
      } else {
        version = registrySpec.split('@').slice(-1)[0] || undefined
      }
    }

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
          version,
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
