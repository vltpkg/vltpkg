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

  if (nodes.length === 0) {
    throw new Error('No nodes provided to parseInternals')
  }

  const firstNode = asPostcssNodeWithChildren(nodes[0])

  if (firstNode.nodes.length === 0) {
    throw new Error('First node has no child nodes')
  }

  // Try to parse as a quoted string first (single string node)
  if (firstNode.nodes.length === 1) {
    const targetNode = firstNode.nodes[0]
    try {
      specValue = removeQuotes(asStringNode(targetNode).value)
      return { specValue }
    } catch (err) {
      if (
        asError(err).message === 'Mismatching query node' &&
        isTagNode(targetNode)
        /* c8 ignore start */
      ) {
        // Handle simple unquoted single-token values like "1"
        const tagNode = asTagNode(targetNode)
        specValue = tagNode.value
        return { specValue }
        /* c8 ignore stop */
      } else {
        throw err
      }
    }
  }

  // Handle unquoted complex values that get parsed into multiple nodes
  // This happens when unquoted values contain dots, like ^1.0.0 which becomes:
  // - Tag: "^1"
  // - ClassName: "0" (from .0)
  // - ClassName: "0" (from .0)
  // We need to reconstruct the original value by concatenating all nodes
  const parts: string[] = []

  for (const node of firstNode.nodes) {
    switch (node.type) {
      case 'tag':
        parts.push(asTagNode(node).value)
        break
      case 'class':
        // Class nodes represent .className in CSS, so we need to add the dot back
        parts.push('.' + node.value)
        break
      case 'id':
        // ID nodes represent #idName in CSS, so we need to add the hash back
        parts.push('#' + node.value)
        break
      case 'string':
        parts.push(removeQuotes(asStringNode(node).value))
        break
      default:
        // For other node types, try to get the value property or convert to string
        /* c8 ignore next */
        parts.push(node.value ?? String(node))
        break
    }
  }

  specValue = parts.join('')
  return { specValue }
}

/**
 * :spec Pseudo-Selector, matches edges where edge.spec.bareSpec equals the provided value.
 *
 * Examples:
 * - :spec("*") matches edges with a package specifier equal to "*"
 * - :spec(^1.0.0) matches edges with a package specifier equal to "^1.0.0"
 * - :spec("catalog:") matches edges with a package specifier equal to "catalog:"
 * - :spec("workspace:dev") matches edges with a package specifier equal to "workspace:dev"
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
