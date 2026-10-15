import { error } from '@vltpkg/error-cause'
import { Query } from '@vltpkg/query'
import type { QueryOptions, QueryResponse } from '@vltpkg/query'
import {
  SecurityArchive,
  usesNpmRegistry,
} from '@vltpkg/security-archive'
import type { DepID } from '@vltpkg/dep-id'
import { asError } from '@vltpkg/types'
import type { NodeLike } from '@vltpkg/types'
import type { Graph } from './graph.ts'

/**
 * One top-level selector of a query: the ids it matched, and its
 * `:skill()` patterns (unset: every skill).
 */
export type QueryPartIds = { ids: Set<DepID>; patterns?: string[] }

/**
 * Matched npm registry pkgs with no security data, and why: the
 * request timed out, or socket.dev has not scanned them yet.
 */
export type Unscanned = {
  ids: Set<DepID>
  reason: 'timeout' | 'unscanned'
}

const toIds = (nodes: { id: DepID }[]) =>
  new Set(nodes.map(n => n.id))

const search = async (
  graph: Graph,
  selector: string,
  partSelectors?: QueryOptions['partSelectors'],
): Promise<QueryResponse & { unscanned?: Unscanned }> => {
  /* c8 ignore start */
  const securityArchive =
    Query.hasSecuritySelectors(selector) ?
      await SecurityArchive.start({
        nodes: [...graph.nodes.values()],
      })
    : undefined
  /* c8 ignore stop */

  const res = await new Query({
    edges: graph.edges,
    nodes: new Set<NodeLike>(graph.nodes.values()),
    importers: graph.importers,
    securityArchive,
    partSelectors,
  }).search(selector, { signal: new AbortController().signal })
  if (!securityArchive) return res
  // fail closed: callers skip pkgs with no security data, be it from a
  // timed out request or not scanned by socket.dev yet
  const ids = toIds(
    res.nodes.filter(
      n => !securityArchive.has(n.id) && usesNpmRegistry(n),
    ),
  )
  if (!ids.size) return res
  const reason = securityArchive.timedOut ? 'timeout' : 'unscanned'
  return { ...res, unscanned: { ids, reason } }
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
  const { nodes, unscanned } = await search(graph, selector)
  return toIds(nodes.filter(n => !unscanned?.ids.has(n.id)))
}

/**
 * {@link filterNodesByQuery} for `allow-skills`: accepts `:skill()`,
 * and also returns one entry per top-level selector. Unlike it, keeps
 * `unscanned` pkgs: callers must drop them (fail closed).
 */
export const filterNodesByQueryParts = async (
  graph: Graph,
  selector?: string,
): Promise<{
  ids: Set<DepID>
  parts: QueryPartIds[]
  unscanned?: Unscanned
}> => {
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
    ...(res.unscanned && { unscanned: res.unscanned }),
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
