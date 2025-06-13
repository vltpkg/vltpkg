import { minimatch } from 'minimatch'
import { error } from '@vltpkg/error-cause'
import { splitDepID } from '@vltpkg/dep-id/browser'
import { asError } from '@vltpkg/types'
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
 * Creates a path matcher function that tests if
 * a given path matches a glob pattern.
 */
export function createPathMatcher(pattern: string, loose = false) {
  const isRoot = pattern === '.'
  return (path: string) => {
    if (isRoot) {
      return path === '.' || path === ''
    }
    try {
      return minimatch(path, pattern, {
        dot: true,
        nocase: false,
        matchBase: pattern === '*',
      })
    } catch (err) {
      // In loose mode, return false for invalid patterns
      if (loose) {
        return false
      }
      // In strict mode, throw an error
      throw error(
        'Invalid glob pattern in :path selector',
        asError(err),
      )
    }
  }
}

/**
 * :path("glob") Pseudo-Selector will match only workspace & file
 * nodes whose file path matches the provided glob pattern relative
 * to the project root. Path patterns must be quoted strings to avoid
 * parser conflicts with special characters.
 */
export const path = async (state: ParserState) => {
  // Extract path container and handle empty parameters
  const pathContainer = asPostcssNodeWithChildren(state.current)
  if (!pathContainer.nodes[0]) {
    return clear(state)
  }

  // Extract the selector node and handle empty selectors
  const selector = asPostcssNodeWithChildren(pathContainer.nodes[0])
  if (!selector.nodes[0]) {
    return clear(state)
  }

  // Extract and validate the path pattern
  let pathPattern = ''
  if (isStringNode(selector.nodes[0])) {
    pathPattern = removeQuotes(asStringNode(selector.nodes[0]).value)
  } else {
    if (state.loose) {
      return clear(state)
    }
    throw error(
      'Failed to parse path pattern in :path selector',
      new Error('Path pattern must be a quoted string'),
    )
  }

  // If no pattern provided, match nothing
  if (!pathPattern) {
    return clear(state)
  }

  // Check for unmatched brackets
  if (
    pathPattern === '[' ||
    (pathPattern.includes('[') && !pathPattern.includes(']'))
  ) {
    if (state.loose) {
      return clear(state)
    }
    throw error(
      'Invalid glob pattern in :path selector',
      new Error(`Unmatched bracket in pattern: ${pathPattern}`),
    )
  }

  // Create path matcher function
  const matchPath = createPathMatcher(pathPattern, state.loose)

  // Filter nodes by path
  for (const node of state.partial.nodes) {
    /* c8 ignore next */
    const nodePath = node.location || ''
    const [type] = splitDepID(node.id)

    // Special case for main importer with root path pattern
    if (pathPattern === '.' && node.mainImporter) {
      continue // Keep main importer node for root path pattern
    }

    // Only match workspace or file nodes with matching paths
    const pathBased = type === 'workspace' || type === 'file'
    if (!pathBased || !matchPath(nodePath)) {
      removeNode(state, node)
    }
  }

  // Clean up any dangling edges
  removeDanglingEdges(state)
  return state
}
