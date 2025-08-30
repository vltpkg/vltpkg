import { asDepID } from '@vltpkg/dep-id/browser'
import { error } from '@vltpkg/error-cause'
import { fastSplit } from '@vltpkg/fast-split'
import { Spec } from '@vltpkg/spec/browser'
import type { SpecOptions } from '@vltpkg/spec/browser'
import { longDependencyTypes } from '@vltpkg/types'
import type { DependencyTypeShort } from '@vltpkg/types'
import { isDependencyTypeShort } from '../dependencies.ts'
import type { GraphLike, NodeLike } from '../types.ts'
import type {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdgeValue,
} from './types.ts'

export const loadEdges = (
  graph: GraphLike,
  edges: LockfileData['edges'],
  options: SpecOptions,
) => {
  const entries = Object.entries(edges) as [
    LockfileEdgeKey,
    LockfileEdgeValue,
  ][]

  const edgeCount = entries.length
  const useOptimizations = edgeCount > 50 // Only use optimizations for larger graphs

  // For large graphs, use batch processing and caching
  const edgeProcessingQueue: {
    fromNode: NodeLike
    toNode: NodeLike | undefined
    depType: DependencyTypeShort
    spec: Spec
  }[] = []

  // Cache for frequently accessed nodes to avoid repeated Map lookups
  const nodeCache =
    useOptimizations ? new Map<string, NodeLike>() : null

  for (const [key, value] of entries) {
    const [fromId, specName] = fastSplit(key, ' ', 2)
    const [depType, valRest] = fastSplit(value, ' ', 2)
    const vrSplit = valRest?.lastIndexOf(' ') ?? -1

    // not a valid edge record
    /* c8 ignore start */
    if (!valRest || !depType || !fromId || !specName || vrSplit < 1) {
      continue
    }
    /* c8 ignore stop */

    // Validate dependency type early
    if (!isDependencyTypeShort(depType)) {
      throw error('Found unsupported dependency type in lockfile', {
        validOptions: [...longDependencyTypes],
      })
    }

    // Use cached node lookup for large graphs, direct lookup for small ones
    let fromNode: NodeLike
    if (useOptimizations && nodeCache) {
      fromNode =
        nodeCache.get(fromId) ??
        (() => {
          const foundNode = graph.nodes.get(asDepID(fromId))
          if (!foundNode) {
            throw error('Edge info missing its `from` node', {
              found: {
                nodes: [...graph.nodes].map(([id]) => id),
                from: foundNode,
                fromId,
                edge: { [key]: value },
              },
            })
          }
          nodeCache.set(fromId, foundNode)
          return foundNode
        })()
    } else {
      const foundNode = graph.nodes.get(asDepID(fromId))
      if (!foundNode) {
        throw error('Edge info missing its `from` node', {
          found: {
            nodes: [...graph.nodes].map(([id]) => id),
            from: foundNode,
            fromId,
            edge: { [key]: value },
          },
        })
      }
      fromNode = foundNode
    }

    const toId = valRest.substring(vrSplit + 1)
    let toNode: NodeLike | undefined = undefined

    if (toId !== 'MISSING') {
      if (useOptimizations && nodeCache) {
        toNode =
          nodeCache.get(toId) ??
          (() => {
            const foundToNode = graph.nodes.get(asDepID(toId))
            if (foundToNode) {
              nodeCache.set(toId, foundToNode)
            }
            return foundToNode
          })()
      } else {
        toNode = graph.nodes.get(asDepID(toId))
      }
    }

    // Parse spec once we know the nodes are valid
    const spec = Spec.parse(
      specName,
      valRest.substring(0, vrSplit),
      options,
    )

    // sets a registry for this spec to inherit from
    spec.inheritedRegistry = fromNode.registry

    if (useOptimizations) {
      edgeProcessingQueue.push({
        fromNode,
        toNode,
        depType: depType,
        spec,
      })
    } else {
      // Process immediately for small graphs
      graph.addEdge(depType, spec, fromNode, toNode)
    }
  }

  // Batch process all edges (only for large graphs)
  if (useOptimizations) {
    for (const {
      fromNode,
      toNode,
      depType,
      spec,
    } of edgeProcessingQueue) {
      graph.addEdge(depType, spec, fromNode, toNode)
    }
  }
}
