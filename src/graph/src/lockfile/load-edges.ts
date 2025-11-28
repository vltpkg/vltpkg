import { asDepID } from '@vltpkg/dep-id/browser'
import { error } from '@vltpkg/error-cause'
import { fastSplit } from '@vltpkg/fast-split'
import { Spec } from '@vltpkg/spec/browser'
import type { SpecOptions } from '@vltpkg/spec/browser'
import { longDependencyTypes } from '@vltpkg/types'
import type {
  DependencyTypeShort,
  GraphLike,
  NodeLike,
} from '@vltpkg/types'
import { isDependencyTypeShort } from '../dependencies.ts'
import type {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdgeValue,
} from './types.ts'

export type ProcessingEdge = {
  fromNode: NodeLike
  toNode: NodeLike | undefined
  depType: DependencyTypeShort
  spec: Spec
}

const retrieveNodeFromGraph = (
  key: string,
  value: string,
  graph: GraphLike,
  fromId: string,
  seenNodes?: Map<string, NodeLike>,
): NodeLike => {
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
  if (seenNodes) {
    seenNodes.set(fromId, foundNode)
  }
  return foundNode
}

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
  // Only use optimizations for non-trivial graphs
  const useOptimizations = edgeCount > 50
  const edgeProcessingQueue: ProcessingEdge[] = []

  // Cache for frequently accessed nodes to avoid repeated Map lookups
  const seenNodes =
    useOptimizations ? new Map<string, NodeLike>() : undefined

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
    if (seenNodes) {
      const seen = seenNodes.get(fromId)
      if (seen) {
        fromNode = seen
      } else {
        fromNode = retrieveNodeFromGraph(
          key,
          value,
          graph,
          fromId,
          seenNodes,
        )
      }
    } else {
      fromNode = retrieveNodeFromGraph(key, value, graph, fromId)
    }

    const toId = valRest.substring(vrSplit + 1)
    let toNode: NodeLike | undefined = undefined

    if (toId !== 'MISSING') {
      if (seenNodes) {
        const seen = seenNodes.get(toId)
        if (seen) {
          toNode = seen
        } else {
          toNode = graph.nodes.get(asDepID(toId))
          if (toNode) {
            seenNodes.set(toId, toNode)
          }
        }
      } else {
        toNode = graph.nodes.get(asDepID(toId))
      }
    }

    // Parse spec once we know the nodes are valid
    const spec = Spec.parse(specName, valRest.substring(0, vrSplit), {
      ...options,
      registry: fromNode.registry,
    })

    if (useOptimizations) {
      edgeProcessingQueue.push({
        fromNode,
        toNode,
        depType,
        spec,
      })
    } else {
      // Process immediately for small graphs
      graph.addEdge(depType, spec, fromNode, toNode)
    }
  }

  // Batch process all edges (only for non-trivial graphs)
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
