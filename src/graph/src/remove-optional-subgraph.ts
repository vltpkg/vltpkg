import { type Graph } from './graph.ts'
import { type Node } from './node.ts'

/**
 * Remove the affected optional nodes starting from a given optional node
 * that failed to resolve/install.
 *
 * Removing these dependents will frequently leave optional *dependencies*
 * behind that are made unreachable from any project importer. For performance
 * reasons, `graph.gc()` is not called automatically by this method, since
 * multiple optional subgraphs may need to be removed in a single operation,
 * and the mark-and-sweep garbage collection (a) can be excessively expensive,
 * and (b) may need to communicate the set of garbage-collected nodes
 * for cleanup (as in the case of optional node build failures during
 * reification).
 */
export const removeOptionalSubgraph = (
  graph: Graph,
  startingNode: Node & { optional: true },
) => {
  const removed = new Set<Node>()
  for (const node of findOptionalSubgraph(startingNode)) {
    graph.removeNode(node)
    removed.add(node)
  }
  return removed
}

/**
 * Given a starting node, this generator will walk back from the optional node
 * to all of its optional dependents, emitting each one, and skipping any
 * cycles.
 *
 * Note that when these are removed, it may create unreachable nodes in the
 * graph! Be sure to call `graph.gc()` if these are removed.
 */
export function* findOptionalSubgraph(
  node: Node & { optional: true },
  seen = new Set<Node & { optional: true }>(),
): Generator<Node & { optional: true }, void> {
  // already visited, prevent looping
  if (seen.has(node)) return

  // the node itself is part of the subgraph, of course
  seen.add(node)
  yield node

  // and any of its dependents that are also optional
  for (const { from, optional } of node.edgesIn) {
    // if it's an optional *edge*, we don't need to remove it, because it
    // doesn't need the node anyway. But if the node is optional and the
    // dep isn't, then we do need to remove it.
    if (from.isOptional() && !optional) {
      for (const dep of findOptionalSubgraph(from, seen)) yield dep
    }
  }
}
