import pRetry, { AbortError } from 'p-retry'
import { hydrate, splitDepID } from '@vltpkg/dep-id/browser'
import { error } from '@vltpkg/error-cause'
import {
  asPostcssNodeWithChildren,
  asTagNode,
  asStringNode,
  isTagNode,
} from '@vltpkg/dss-parser'
import {
  removeDanglingEdges,
  removeNode,
  removeQuotes,
} from './helpers.ts'
import type { NodeLike, Packument } from '@vltpkg/types'
import type { ParserState } from '../types.ts'

/**
 * Fetches the dist-tags of a package from the registry.
 */
export const retrieveDistTags = async (
  node: NodeLike,
  signal?: AbortSignal,
): Promise<Record<string, string>> => {
  const spec = hydrate(node.id, String(node.name), node.options)
  if (!spec.registry || !node.name) {
    return {}
  }

  const url = new URL(spec.registry)
  url.pathname = `/${node.name}`

  const response = await fetch(String(url), {
    headers: {
      Accept: 'application/vnd.npm.install-v1+json',
    },
    signal,
  })
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
  return packument['dist-tags']
}

/**
 * Checks whether a node's installed version matches the version
 * associated with the given dist-tag. Returns the node if it should
 * be removed (does NOT match), or undefined if it matches.
 */
export const queueNode = async (
  state: ParserState,
  node: NodeLike,
  tagName: string,
): Promise<NodeLike | undefined> => {
  if (!node.name || !node.version) {
    return node
  }

  let distTags: Record<string, string>
  try {
    distTags = await pRetry(
      () => retrieveDistTags(node, state.signal),
      {
        retries: state.retries,
        signal: state.signal,
      },
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      error('Could not retrieve dist-tags', {
        name: node.name,
        cause: err,
      }),
    )
    return node
  }

  const tagVersion = distTags[tagName]
  if (tagVersion !== node.version) {
    return node
  }

  return undefined
}

/**
 * :dist(tag) Pseudo-Selector, matches only nodes whose installed
 * version corresponds to the given dist-tag in the registry.
 *
 * Examples:
 * - :dist(latest) — matches packages at the `latest` dist-tag version
 * - :dist(nightly) — matches packages at the `nightly` dist-tag version
 * - :not(:dist(nightly)) — excludes nightly-tagged versions
 */
export const dist = async (state: ParserState) => {
  const top = asPostcssNodeWithChildren(state.current)
  const selector = asPostcssNodeWithChildren(top.nodes[0])
  const firstChild = selector.nodes[0]

  let tagName: string
  try {
    tagName = removeQuotes(asStringNode(firstChild).value)
  } catch {
    if (isTagNode(firstChild)) {
      tagName = asTagNode(firstChild).value
      /* c8 ignore start */
    } else {
      throw error('Failed to parse :dist selector', {
        found: firstChild,
      })
    }
    /* c8 ignore stop */
  }

  const queue = []

  for (const node of state.partial.nodes) {
    if (splitDepID(node.id)[0] !== 'registry') {
      removeNode(state, node)
      continue
    }
    queue.push(queueNode(state, node, tagName))
  }

  const removeNodeQueue = await Promise.all(queue)
  for (const node of removeNodeQueue) {
    if (node) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
