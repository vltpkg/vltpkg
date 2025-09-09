import pRetry, { AbortError } from 'p-retry'
import { hydrate, splitDepID } from '@vltpkg/dep-id/browser'
import { error } from '@vltpkg/error-cause'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '@vltpkg/dss-parser'
import {
  removeDanglingEdges,
  removeNode,
  removeQuotes,
} from './helpers.ts'
import type { NodeLike, Packument } from '@vltpkg/types'
import type { ParserState } from '../types.ts'
import type { PostcssNode } from '@vltpkg/dss-parser'

/**
 * The possible comparator values accepted by the :published() pseudo selector.
 */
export type PublishedComparator = '>' | '<' | '>=' | '<=' | undefined

/**
 * Result of the internal parsing of the :published() pseudo selector.
 */
export type PublishedInternals = {
  relativeDate: string
  comparator: PublishedComparator
}

/**
 * Fetches the published date of a package version from the npm registry.
 */
export const retrieveRemoteDate = async (
  node: NodeLike,
  signal?: AbortSignal,
): Promise<string | undefined> => {
  const spec = hydrate(node.id, String(node.name), node.options)
  if (!spec.registry || !node.name || !node.version) {
    return undefined
  }

  const url = new URL(spec.registry)
  url.pathname = `/${node.name}`

  const response = await fetch(String(url), {
    signal,
  })
  // on missing valid auth or API, it should abort the retry logic
  if (response.status === 404) {
    throw new AbortError('Missing API')
  }
  if (!response.ok) {
    throw error('Failed to fetch packument', {
      name: node.name,
      spec,
      response,
    })
  }
  const packument = (await response.json()) as Packument
  const res = packument.time?.[node.version]
  return res
}

/**
 * Retrieves what kind of check the :published selector should perform.
 */
export const parseInternals = (
  nodes: PostcssNode[],
): PublishedInternals => {
  let value = ''

  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    value = removeQuotes(
      asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
        .value,
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    const tagNode = asTagNode(
      asPostcssNodeWithChildren(nodes[0]).nodes[0],
    )
    value = tagNode.value
  }

  // Check if the value starts with a comparator
  let comparator: PublishedComparator
  let relativeDate = value

  if (value.startsWith('>=')) {
    comparator = '>='
    relativeDate = value.slice(2)
  } else if (value.startsWith('<=')) {
    comparator = '<='
    relativeDate = value.slice(2)
  } else if (value.startsWith('>')) {
    comparator = '>'
    relativeDate = value.slice(1)
  } else if (value.startsWith('<')) {
    comparator = '<'
    relativeDate = value.slice(1)
  }

  return { relativeDate, comparator }
}

/**
 * Filter nodes by queueing up for removal those that don't match the date criteria.
 */
export const queueNode = async (
  state: ParserState,
  node: NodeLike,
  relativeDate: string,
  comparator: PublishedComparator,
): Promise<NodeLike | undefined> => {
  if (!node.name || !node.version) {
    return node
  }

  let publishedDate: string | undefined
  try {
    publishedDate = await pRetry(
      () => retrieveRemoteDate(node, state.signal),
      {
        retries: state.retries,
        signal: state.signal,
      },
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      error('Could not retrieve registry publish date', {
        name: node.name,
        cause: err,
      }),
    )
    return node
  }

  if (!publishedDate) {
    return node
  }

  // only matches the same amount of date information
  // as provided in the relative date
  const nodeDate = new Date(
    publishedDate.slice(0, relativeDate.length),
  )
  const compareDate = new Date(relativeDate)

  switch (comparator) {
    case '>':
      return nodeDate > compareDate ? undefined : node
    case '<':
      return nodeDate < compareDate ? undefined : node
    case '>=':
      return nodeDate >= compareDate ? undefined : node
    case '<=':
      return nodeDate <= compareDate ? undefined : node
    default:
      return nodeDate.getTime() === compareDate.getTime() ?
          undefined
        : node
  }
}

/**
 * Filters out nodes that don't match the published date criteria.
 *
 * The :published() pseudo selector supports a date parameter that can be prefixed
 * with a comparator (>, <, >=, <=). If no comparator is provided, it will match
 * exact dates.
 *
 * Examples:
 * - :published("2024-01-01") - Matches packages published exactly on January 1st, 2024
 * - :published(">2024-01-01") - Matches packages published after January 1st, 2024
 * - :published("<=2023-12-31") - Matches packages published on or before December 31st, 2023
 */
export const published = async (state: ParserState) => {
  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :published selector', {
      cause: err,
    })
  }

  const { relativeDate, comparator } = internals
  const queue = []

  for (const node of state.partial.nodes) {
    // filter out nodes that are always ignored by the published selector
    if (
      node.mainImporter ||
      node.manifest?.private ||
      splitDepID(node.id)[0] !== 'registry'
    ) {
      removeNode(state, node)
      continue
    }

    // fetch published date info and perform checks to define
    // whether or not a node should be filtered out
    queue.push(queueNode(state, node, relativeDate, comparator))
  }

  // nodes queued for removal are then finally removed
  const removeNodeQueue = await Promise.all(queue)
  for (const node of removeNodeQueue) {
    if (node) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
