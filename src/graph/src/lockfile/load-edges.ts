import { asDepID } from '@vltpkg/dep-id/browser'
import { error } from '@vltpkg/error-cause'
import { fastSplit } from '@vltpkg/fast-split'
import { Spec, type SpecOptions } from '@vltpkg/spec/browser'
import { longDependencyTypes } from '@vltpkg/types'
import { isDependencyTypeShort } from '../dependencies.js'
import { type GraphLike } from '../types.js'
import {
  type LockfileData,
  type LockfileEdgeKey,
  type LockfileEdgeValue,
} from './types.js'

export const loadEdges = (
  graph: GraphLike,
  edges: LockfileData['edges'],
  options: SpecOptions,
) => {
  const entries = Object.entries(edges) as [
    LockfileEdgeKey,
    LockfileEdgeValue,
  ][]
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
    const spec = Spec.parse(
      specName,
      valRest.substring(0, vrSplit),
      options,
    )
    const toId = valRest.substring(vrSplit + 1)
    const from = graph.nodes.get(asDepID(fromId))
    if (!from) {
      throw error('Edge info missing its `from` node', {
        found: {
          nodes: [...graph.nodes].map(([id]) => id),
          from,
          fromId,
          edge: { [key]: value },
        },
      })
    }
    const to =
      toId === 'MISSING' ? undefined : graph.nodes.get(asDepID(toId))
    if (!isDependencyTypeShort(depType)) {
      throw error('Found unsupported dependency type in lockfile', {
        validOptions: [...longDependencyTypes],
      })
    }
    graph.addEdge(depType, spec, from, to)
  }
}
