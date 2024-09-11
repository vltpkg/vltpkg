import { Diff } from '../diff.js'
import { Node } from '../node.js'
import { removeOptionalSubgraph } from '../remove-optional-subgraph.js'

/**
 * If the node is optional, then returns an error handler that removes
 * the node and its connected optional subgraph, by moving them into the
 * "deleted" portion of the Diff object.
 * Otherwise, it returns `undefined` so that the promise will simply reject.
 */
export function optionalFail(
  diff: Diff,
  node: Node & { optional: true },
): () => Promise<void>
export function optionalFail(
  diff: Diff,
  node: Node & { optional: false },
): undefined
export function optionalFail(
  diff: Diff,
  node: Node,
): (() => Promise<void>) | undefined
export function optionalFail(
  diff: Diff,
  node: Node,
): (() => Promise<void>) | undefined {
  return node.isOptional() ? () => del(diff, node) : undefined
}

const del = async (diff: Diff, node: Node & { optional: true }) => {
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