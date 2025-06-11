import { minimatch } from 'minimatch'
import { error } from '@vltpkg/error-cause'
import { splitDepID } from '@vltpkg/dep-id'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  isStringNode,
} from '@vltpkg/dss-parser'
import {
  removeNode,
  removeDanglingEdges,
  removeQuotes,
  clear,
} from './helpers.ts'
import type { ParserState } from '../types.ts'

/**
 * :path("glob") Pseudo-Selector will match only workspace & file 
 * nodes whose file path matches the provided glob pattern relative
 * to the project root. Path patterns must be quoted strings to avoid
 * parser conflicts with special characters.
 */
export const path = async (state: ParserState) => {
  const pathContainer = asPostcssNodeWithChildren(state.current)

  // Handle case where no parameter is provided
  if (!pathContainer.nodes[0]) {
    return clear(state)
  }

  const selector = asPostcssNodeWithChildren(pathContainer.nodes[0])

  // Handle case where the selector is empty
  if (!selector.nodes[0]) {
    return clear(state)
  }

  let pathPattern = ''

  try {
    // Only accept quoted string values for path patterns
    if (isStringNode(selector.nodes[0])) {
      pathPattern = removeQuotes(
        asStringNode(selector.nodes[0]).value,
      )
    } else {
      throw error('Path pattern must be a quoted string', {
        found: selector.nodes[0],
        type: selector.nodes[0].type,
      })
    }
  } catch (err) {
    // In loose mode, ignore invalid patterns and match nothing
    if (state.loose) {
      return clear(state)
    }
    throw error(
      'Failed to parse path pattern in :path selector. Path patterns must be quoted strings.',
      {
        cause: err,
      },
    )
  }

  // If no pattern or empty pattern, remove all nodes
  if (!pathPattern) {
    return clear(state)
  }

  // Use minimatch to create a filter function for the glob pattern
  let matchPattern
  try {
    matchPattern = minimatch.filter(pathPattern)
  } catch (err) {
    // Invalid glob pattern in loose mode - match nothing
    if (state.loose) {
      return clear(state)
    }
    throw error('Invalid glob pattern in :path selector', {
      cause: err,
      pattern: pathPattern,
    })
  }

  for (const node of state.partial.nodes) {
    const nodePath = node.location
    const [type] = splitDepID(node.id)
    // should only match packages in which their realpath
    // is located outside the node_modules/.vlt store folder
    const pathBased = type === 'workspace' || type === 'file'

    // check if the path matches the glob pattern
    if (!pathBased || !matchPattern(nodePath)) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
