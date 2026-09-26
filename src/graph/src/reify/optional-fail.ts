import { platformCheck } from '@vltpkg/pick-manifest'
import type { Diff } from '../diff.ts'
import type { Node } from '../node.ts'
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

/**
 * True if the node is deprecated or can't run on this platform.
 * Uses lockfile platform data when present, else the manifest.
 */
export const isUnsupported = (node: Node): boolean =>
  !!node.manifest?.deprecated ||
  !platformCheck(
    node.platform ?? node.manifest ?? {},
    process.version,
    process.platform,
    process.arch,
  )

/**
 * Drop optional adds that can't install here, and deps only they
 * need, before anything is extracted. Lockfile data must be taken
 * first, so it keeps them for other platforms.
 */
export const pruneUnsupportedOptional = (diff: Diff): void => {
  let pruned = false
  for (const node of diff.nodes.add) {
    if (
      node.inVltStore() &&
      !node.extracted &&
      node.isOptional() &&
      isUnsupported(node)
    ) {
      del(diff, node)
      pruned = true
    }
  }
  if (!pruned) return
  for (const node of diff.to.gc().values()) {
    diff.nodes.add.delete(node)
    diff.nodes.delete.add(node)
  }
  // edges out of removed nodes keep their `to`; never link them
  for (const edge of diff.edges.add) {
    if (diff.to.nodes.get(edge.from.id) !== edge.from) {
      diff.edges.add.delete(edge)
    }
  }
}
