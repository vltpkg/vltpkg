import { error } from '@vltpkg/error-cause'
import { Query } from '@vltpkg/query'
import {
  SecurityArchive,
  usesNpmRegistry,
} from '@vltpkg/security-archive'
import type { DepID } from '@vltpkg/dep-id'
import { asError } from '@vltpkg/types'
import type { NodeLike } from '@vltpkg/types'
import type { Graph } from './graph.ts'

/**
 * Filter nodes using a DSS query string
 */
export const filterNodesByQuery = async (
  graph: Graph,
  selector?: string,
): Promise<Set<DepID>> => {
  // shortcut no packages included
  if (selector === ':not(*)' /* c8 ignore next */ || !selector) {
    return new Set()
  }
  // shortcut all packages included
  if (selector === '*') {
    return new Set(graph.nodes.keys())
  }
  /* c8 ignore start */
  const securityArchive =
    Query.hasSecuritySelectors(selector) ?
      await SecurityArchive.start({
        nodes: [...graph.nodes.values()],
      })
    : undefined
  /* c8 ignore stop */

  const edges = graph.edges
  const nodes = new Set<NodeLike>(graph.nodes.values())
  const importers = graph.importers

  const query = new Query({
    edges,
    nodes,
    importers,
    securityArchive,
  })

  const { nodes: resultNodes } = await query.search(selector, {
    signal: new AbortController().signal,
  })

  // fail closed: never run scripts of pkgs with no security data, be it
  // from a timed out request or not scanned by socket.dev yet
  const allowed =
    securityArchive ?
      resultNodes.filter(
        node =>
          securityArchive.has(node.id) || !usesNpmRegistry(node),
      )
    : resultNodes
  return new Set(allowed.map(node => node.id))
}

/**
 * Throw `EUSAGE` unless `selector` is a valid DSS query. Runs it on an
 * empty graph: no fs, network or security data needed.
 */
export const assertQuery = async (
  selector: string,
  flag: string,
): Promise<void> => {
  try {
    await new Query({
      edges: new Set(),
      nodes: new Set(),
      importers: new Set(),
      securityArchive: new Map(),
    }).search(selector, { signal: new AbortController().signal })
  } catch (cause) {
    throw error(
      `Invalid --${flag} query: ${asError(cause).message}`,
      { code: 'EUSAGE', found: selector, cause },
      assertQuery,
    )
  }
}
