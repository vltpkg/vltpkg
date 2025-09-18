import { error } from '@vltpkg/error-cause'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '@vltpkg/dss-parser'
import { removeQuotes } from './helpers.ts'
import type { ParserState } from '../types.ts'
import type { PostcssNode } from '@vltpkg/dss-parser'

/**
 * Parses the internal parameters of the :host() pseudo selector.
 * Returns the context key that should be used to look up the host context function.
 */
export const parseInternals = (nodes: PostcssNode[]): string => {
  let contextKey = ''

  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    contextKey = removeQuotes(
      asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
        .value,
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    const tagNode = asTagNode(
      asPostcssNodeWithChildren(nodes[0]).nodes[0],
    )
    contextKey = tagNode.value
  }

  if (!contextKey) {
    throw error('Expected a context key parameter for :host selector')
  }

  return contextKey
}

/**
 * :host Pseudo-Selector, switches the current graph context to a new
 * set of graphs loaded from a specific host context.
 *
 * This selector accepts a single parameter that specifies which host context
 * to use. The host context must be defined in the hostContexts map provided
 * to the Query constructor.
 *
 * Example:
 * - :host(local) - Switches to graphs loaded from the local context
 */
export const hostContext = async (state: ParserState) => {
  if (!state.hostContexts) {
    throw error('No host contexts available for :host selector')
  }

  let contextKey: string
  try {
    contextKey = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :host selector', {
      cause: err,
    })
  }

  const contextFunction = state.hostContexts.get(contextKey)
  if (!contextFunction) {
    throw error(`Unknown host context: ${contextKey}`, {
      validOptions: Array.from(state.hostContexts.keys()),
    })
  }

  // Get the graphs from the host context function
  const {
    initialEdges,
    initialNodes,
    edges,
    nodes,
    securityArchive,
  } = await contextFunction()

  // Clear current nodes and edges
  state.securityArchive = securityArchive
  state.initial.nodes.clear()
  state.initial.edges.clear()
  state.partial.nodes.clear()
  state.partial.edges.clear()
  state.importers.clear()

  // Reset the initial state
  for (const node of initialNodes) {
    state.initial.nodes.add(node)
  }
  for (const edge of initialEdges) {
    state.initial.edges.add(edge)
  }

  // Populate with nodes and edges from all returned graphs
  for (const node of nodes) {
    state.partial.nodes.add(node)
    // use the current selected nodes by the context function as importers
    state.importers.add(node)
  }
  for (const edge of edges) {
    state.partial.edges.add(edge)
  }

  return state
}
