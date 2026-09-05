import { satisfies } from '@vltpkg/satisfies'
import type { Test } from 'tap'
import type { Graph } from '../../src/graph.ts'

/**
 * Rule C for optional peers, checked on a built graph: no `peerOptional`
 * edge is MISSING while a regular (non-peer) dependent of the node has a
 * satisfying edge to that name, and every resolved one is valid and
 * points at an attached node.
 *
 * Only direct dependents are walked: a provision that only reaches the
 * node through an intermediate is out of scope (see F2 of the plan).
 */
export const assertOptionalPeerProvisions = (
  t: Test,
  graph: Graph,
  msg = 'optional peers follow their placement context',
) => {
  const bad: string[] = []
  for (const edge of graph.edges) {
    if (edge.type !== 'peerOptional') continue
    if (!edge.to) {
      for (const dep of edge.from.edgesIn) {
        if (dep.type === 'peer' || dep.type === 'peerOptional')
          continue
        const provided = dep.from.edgesOut.get(edge.name)?.to
        if (
          provided &&
          satisfies(
            provided.id,
            edge.spec,
            edge.from.location,
            edge.from.projectRoot,
            graph.monorepo,
          )
        ) {
          bad.push(
            `${edge.from.id} ${edge.name} MISSING, ${dep.from.id} has ${provided.id}`,
          )
        }
      }
      continue
    }
    if (!edge.valid())
      bad.push(`${edge.from.id} ${edge.name} invalid`)
    if (edge.to.detached) {
      bad.push(`${edge.from.id} ${edge.name} target is detached`)
    }
  }
  t.strictSame(bad, [], msg)
}
