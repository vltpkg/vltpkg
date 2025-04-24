import pRetry, { AbortError } from 'p-retry'
import { hydrate, splitDepID } from '@vltpkg/dep-id/browser'
import { asError, error } from '@vltpkg/error-cause'
import type { NodeLike } from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec/browser'
import {
  compare,
  gt,
  major,
  minor,
  patch,
  satisfies,
} from '@vltpkg/semver'
import type { Packument } from '@vltpkg/types'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '../types.ts'
import type { ParserState, PostcssNode } from '../types.ts'
import { removeNode, removeQuotes } from './helpers.ts'

/**
 * The possible values accepted by the :outdated() pseudo selector.
 */
export type OutdatedKinds =
  | 'any'
  | 'major'
  | 'minor'
  | 'patch'
  | 'in-range'
  | 'out-of-range'

/**
 * Result of the internal parsing of the :outdated() pseudo selector.
 */
export type OutdatedInternals = {
  kind: OutdatedKinds
}

/**
 * Extracts a semver type from a version string.
 */
export type SemverTypeExtraction = (
  version: string,
) => number | undefined

const kinds = new Set<OutdatedKinds>([
  'any',
  'major',
  'minor',
  'patch',
  'in-range',
  'out-of-range',
])

/**
 * Checks if a string is a valid {@link OutdatedKinds}.
 */
export const isOutdatedKind = (
  value: string,
): value is OutdatedKinds => kinds.has(value as OutdatedKinds)

/**
 * Asserts that a string is a valid {@link OutdatedKinds}.
 */
export const asOutdatedKind = (value: string): OutdatedKinds => {
  if (!isOutdatedKind(value)) {
    throw error('Expected a valid outdated kind', {
      found: value,
      validOptions: Array.from(kinds),
    })
  }
  return value
}

/**
 * Fetches the available versions of a package from the npm registry.
 */
export const retrieveRemoteVersions = async (
  node: NodeLike,
  specOptions: SpecOptions,
  signal?: AbortSignal,
): Promise<string[]> => {
  const spec = hydrate(node.id, String(node.name), specOptions)
  if (!spec.registry || !node.name) {
    return []
  }

  const url = new URL(spec.registry)
  url.pathname = `/${node.name}`

  const response = await fetch(String(url), {
    headers: {
      Accept: 'application/vnd.npm.install-v1+json',
    },
    signal,
  })
  // on missing valid auth or API, it should abort the retry logic
  if (response.status === 404) {
    throw new AbortError('Missing API')
  }
  if (!response.ok) {
    throw error('Failed to fetch packument', {
      name: String(node.name),
      spec,
      response,
    })
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const packument: Packument = await response.json()
  return Object.keys(packument.versions).sort(compare)
}

/**
 * Retrieves what kind of check the :outdated selector should perform.
 */
export const parseInternals = (
  nodes: PostcssNode[],
): OutdatedInternals => {
  let kind: OutdatedKinds = 'any'

  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    kind = asOutdatedKind(
      removeQuotes(
        asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
          .value,
      ),
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    kind = asOutdatedKind(
      asTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0]).value,
    )
  }

  return { kind }
}

/**
 * Filter nodes by queueing up for removal those that are not outdated.
 */
export const queueNode = async (
  state: ParserState,
  node: NodeLike,
  kind: OutdatedKinds,
): Promise<NodeLike | undefined> => {
  if (!node.name || !node.version) {
    return node
  }

  const nodeVersion: string = node.version
  let versions: string[]
  try {
    versions = await pRetry(
      () =>
        retrieveRemoteVersions(node, state.specOptions, state.signal),
      {
        retries: state.retries,
        signal: state.signal,
      },
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      error('Could not retrieve registry versions', {
        name: String(node.name),
        cause: err,
      }),
    )
    versions = []
  }

  const greaterVersions = versions.filter((version: string) =>
    gt(version, nodeVersion),
  )

  // if there are no greater versions, then the node is not outdated
  if (!greaterVersions.length) {
    return node
  }

  const checkKind = new Map<OutdatedKinds, SemverTypeExtraction>([
    ['major', major],
    ['minor', minor],
    ['patch', patch],
  ])

  switch (kind) {
    case 'any':
      return
    case 'major':
    case 'minor':
    case 'patch': {
      return (
          greaterVersions.some((version: string) => {
            const va = checkKind.get(kind)?.(version)
            const vb = checkKind.get(kind)?.(nodeVersion)
            /* c8 ignore next - impossible but typescript doesn't know */
            if (va === undefined || vb === undefined) return false
            return va > vb
          })
        ) ?
          undefined
        : node
    }
    // the node should be part of the result as long as it has at least
    // one parent node that has a spec definition that satisfies one
    // of the available remove versions
    case 'in-range': {
      for (const edge of node.edgesIn) {
        // if the edge is not part of the partial results, skip it
        /* c8 ignore next */
        if (!state.partial.edges.has(edge)) continue

        if (
          greaterVersions.some(
            version =>
              edge.spec.final.range &&
              satisfies(version, edge.spec.final.range),
          )
        ) {
          return
        }
      }
      return node
    }
    // the node is part of the result as long as none of its parents has
    // a spec definition that satisfies one of the available remote versions
    case 'out-of-range': {
      for (const edge of node.edgesIn) {
        // if the edge is not part of the partial results, skip it
        /* c8 ignore next */
        if (!state.partial.edges.has(edge)) continue

        if (
          greaterVersions.some(
            version =>
              edge.spec.final.range &&
              satisfies(version, edge.spec.final.range),
          )
        ) {
          return node
        }
      }
      return
    }
  }
}

/**
 * Filters out nodes that are not outdated.
 *
 * The :outdated() pseudo selector supports one `type` argument,
 * possible values are the following:
 *
 * - `any`: Selects all nodes that have a greater version available.
 * - `major`: Selects all nodes that have a greater major version available.
 * - `minor`: Selects all nodes that have a greater minor version available.
 * - `patch`: Selects all nodes that have a greater patch version available.
 * - `in-range`: Selects all nodes that have a parent node with a spec definition
 *  that satisfies one of the available remote versions.
 *  - `out-of-range`: Selects all nodes that have a parent node with a spec definition
 *  that does not satisfy any of the available remote versions.
 */
export const outdated = async (state: ParserState) => {
  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    if (asError(err).message === 'Expected a query node') {
      internals = { kind: 'any' } satisfies OutdatedInternals
    } else {
      throw error('Failed to parse :outdated selector', {
        cause: err,
      })
    }
  }

  const { kind } = internals
  const queue = []

  for (const node of state.partial.nodes) {
    // filter out nodes that are always ignored by the outdated selector
    if (
      node.mainImporter ||
      node.manifest?.private ||
      splitDepID(node.id)[0] !== 'registry'
    ) {
      removeNode(state, node)
      continue
    }

    // fetchs outdated info and performs checks to define
    // whether or not a node should be filtered out
    queue.push(queueNode(state, node, kind))
  }

  // nodes queued for removal are then finally removed
  const removeNodeQueue = await Promise.all(queue)
  for (const node of removeNodeQueue) {
    if (node) {
      removeNode(state, node)
    }
  }

  return state
}
