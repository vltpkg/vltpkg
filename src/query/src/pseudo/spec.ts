import { error } from '@vltpkg/error-cause'
import { asError } from '@vltpkg/types'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isTagNode,
} from '@vltpkg/dss-parser'
import {
  removeEdge,
  removeUnlinkedNodes,
  removeQuotes,
} from './helpers.ts'
import type { ParserState } from '../types.ts'
import type { PostcssNode } from '@vltpkg/dss-parser'

export type SpecInternals = {
  specValue: string
}

export const parseInternals = (
  nodes: PostcssNode[],
): SpecInternals => {
  // tries to parse the first param as a string node, otherwise defaults
  // to reading all postcss nodes as just strings, since it just means
  // the value was defined as an unquoted string
  let specValue = ''
  try {
    specValue = removeQuotes(
      asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
        .value,
    )
  } catch (err) {
    if (
      asError(err).message === 'Mismatching query node' &&
      isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
    ) {
      // Handle tag node (unquoted values like ^1.0.0)
      const tagNode = asTagNode(
        asPostcssNodeWithChildren(nodes[0]).nodes[0],
      )
      specValue = tagNode.value
    } else {
      throw err
    }
  }

  return {
    specValue,
  }
}

/**
 * :spec Pseudo-Selector, matches edges where edge.spec.bareSpec equals the provided value.
 *
 * Examples:
 * - :spec("*") matches edges with bareSpec equal to "*"
 * - :spec(^1.0.0) matches edges with bareSpec equal to "^1.0.0"
 * - :spec("catalog:") matches edges with bareSpec equal to "catalog:"
 * - :spec("workspace:dev") matches edges with bareSpec equal to "workspace:dev"
 */
export const spec = async (state: ParserState) => {
  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :spec selector', {
      cause: err,
    })
  }

  const { specValue } = internals

  for (const edge of state.partial.edges) {
    if (edge.spec.bareSpec !== specValue) {
      removeEdge(state, edge)
    }
  }

  // Clean up unlinked nodes after removing edges
  removeUnlinkedNodes(state)

  return state
}
