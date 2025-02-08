import { type Diff } from '../diff.ts'
import { type Node } from '../node.ts'
import { removeOptionalSubgraph } from '../remove-optional-subgraph.ts'

/**
 * If the node is optional, then returns an error handler that removes
 * the node and its connected optional subgraph, by moving them into the
 * "deleted" portion of the Diff object.
 * Otherwise, it returns `undefined` so that the promise will simply reject.
 */
export function optionalFail(
  diff: Diff,
  node: Node & { optional: true },
): () => void
export function optionalFail(
  diff: Diff,
  node: Node & { optional: false },
): undefined
export function optionalFail(
  diff: Diff,
  node: Node,
): (() => void) | undefined
export function optionalFail(
  diff: Diff,
  node: Node,
): (() => void) | undefined {
  return node.isOptional() ? () => del(diff, node) : undefined
}

const del = (diff: Diff, node: Node & { optional: true }) => {
  diff.hadOptionalFailures = true
  for (const del of removeOptionalSubgraph(diff.to, node)) {
    // add it to the set of nodes being deleted
    diff.nodes.delete.add(del)
    // delete it from the set of nodes being added
    diff.nodes.add.delete(del)
  }
  diff.nodes.add.delete(node)
  diff.nodes.delete.add(node)
}
