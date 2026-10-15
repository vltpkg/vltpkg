import { error } from '@vltpkg/error-cause'
import { Query } from '@vltpkg/query'
import type { QueryOptions } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import type { DepID } from '@vltpkg/dep-id'
import { asError } from '@vltpkg/types'
import type { NodeLike } from '@vltpkg/types'
import type { Graph } from './graph.ts'

/**
 * One top-level selector of a query: the ids it matched, and its
 * `:skill()` patterns (unset: every skill).
 */
export type QueryPartIds = { ids: Set<DepID>; patterns?: string[] }

const toIds = (nodes: { id: DepID }[]) =>
  new Set(nodes.map(n => n.id))

const search = async (
  graph: Graph,
  selector: string,
  partSelectors?: QueryOptions['partSelectors'],
) => {
  /* c8 ignore start */
  const securityArchive =
    Query.hasSecuritySelectors(selector) ?
      await SecurityArchive.start({
        nodes: [...graph.nodes.values()],
      })
    : undefined
  /* c8 ignore stop */

  return new Query({
    edges: graph.edges,
    nodes: new Set<NodeLike>(graph.nodes.values()),
    importers: graph.importers,
    securityArchive,
    partSelectors,
  }).search(selector, { signal: new AbortController().signal })
}

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
  return toIds((await search(graph, selector)).nodes)
}

/**
 * {@link filterNodesByQuery} for `allow-skills`: accepts `:skill()`,
 * and also returns one entry per top-level selector.
 */
export const filterNodesByQueryParts = async (
  graph: Graph,
  selector?: string,
): Promise<{ ids: Set<DepID>; parts: QueryPartIds[] }> => {
  if (!selector || selector === ':not(*)') {
    return { ids: new Set(), parts: [] }
  }
  if (selector === '*') {
    const ids = new Set(graph.nodes.keys())
    return { ids, parts: [{ ids }] }
  }
  const res = await search(graph, selector, ['skill'])
  return {
    ids: toIds(res.nodes),
    /* c8 ignore next -- always set when opted in */
    parts: (res.parts ?? []).map(p => ({
      ids: toIds(p.nodes),
      ...(p.patterns && { patterns: p.patterns }),
    })),
  }
}

/**
 * Throw `EUSAGE` unless `selector` is a valid DSS query. Runs it on an
 * empty graph: no fs, network or security data needed. `partSelectors`
 * allows e.g. `:skill()`.
 */
export const assertQuery = async (
  selector: string,
  flag: string,
  partSelectors?: QueryOptions['partSelectors'],
): Promise<void> => {
  try {
    await new Query({
      edges: new Set(),
      nodes: new Set(),
      importers: new Set(),
      securityArchive: new Map(),
      partSelectors,
    }).search(selector, { signal: new AbortController().signal })
  } catch (cause) {
    const { message, cause: c } = asError(cause) as Error & {
      cause?: { validOptions?: unknown[]; wanted?: unknown }
    }
    // a typo's suggestions, e.g. `:skill` for `:skills`
    const validOptions =
      c?.validOptions ??
      (c?.wanted === undefined ? undefined : [c.wanted])
    throw error(
      `Invalid --${flag} query: ${message}`,
      {
        code: 'EUSAGE',
        found: selector,
        cause,
        ...(validOptions && { validOptions }),
      },
      assertQuery,
    )
  }
}
