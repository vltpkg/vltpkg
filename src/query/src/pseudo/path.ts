import { minimatch } from 'minimatch'
import { error } from '@vltpkg/error-cause'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '@vltpkg/dss-parser'
import { removeNode, removeDanglingEdges, removeQuotes } from './helpers.ts'
import type { ParserState } from '../types.ts'

/**
 * :path(glob) Pseudo-Selector will match only nodes whose file path
 * matches the provided glob pattern relative to the project root.
 */
export const path = async (state: ParserState) => {
  const pathContainer = asPostcssNodeWithChildren(state.current)
  
  // Handle case where no parameter is provided
  if (!pathContainer.nodes[0]) {
    // No pattern provided, remove all nodes
    state.partial.nodes.clear()
    state.partial.edges.clear()
    return state
  }

  const selector = asPostcssNodeWithChildren(pathContainer.nodes[0])
  
  // Handle case where the selector is empty
  if (!selector.nodes[0]) {
    state.partial.nodes.clear()
    state.partial.edges.clear()
    return state
  }

  let pathPattern = ''
  
  try {
    // Try to parse as a string node first (quoted values)
    if (isStringNode(selector.nodes[0])) {
      pathPattern = removeQuotes(asStringNode(selector.nodes[0]).value)
    } else if (isTagNode(selector.nodes[0])) {
      // Handle tag node (unquoted values)
      pathPattern = asTagNode(selector.nodes[0]).value
    } else {
      throw error('Invalid path pattern node type', {
        found: selector.nodes[0],
      })
    }
  } catch (err) {
    if (state.loose) {
      // In loose mode, ignore invalid patterns and match nothing
      state.partial.nodes.clear()
      state.partial.edges.clear()
      return state
    }
    throw error('Failed to parse path pattern in :path selector', {
      cause: err,
    })
  }

  // If no pattern or empty pattern, remove all nodes
  if (!pathPattern) {
    state.partial.nodes.clear()
    state.partial.edges.clear()
    return state
  }

  // Use minimatch to create a filter function for the glob pattern
  let matchPattern
  try {
    matchPattern = minimatch.filter(pathPattern)
  } catch (err) {
    if (state.loose) {
      // Invalid glob pattern in loose mode - match nothing
      state.partial.nodes.clear()
      state.partial.edges.clear()
      return state
    }
    throw error('Invalid glob pattern in :path selector', {
      cause: err,
      pattern: pathPattern,
    })
  }

  for (const node of state.partial.nodes) {
    // Get the node's location (file path)
    const nodePath = node.location
    
    // Check if the path matches the glob pattern
    if (!matchPattern(nodePath)) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}