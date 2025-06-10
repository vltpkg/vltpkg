import { minimatch } from 'minimatch'
import { error } from '@vltpkg/error-cause'
import { asError } from '@vltpkg/types'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '@vltpkg/dss-parser'
import { removeNode, removeDanglingEdges, removeQuotes } from './helpers.ts'
import type { ParserState } from '../types.ts'
import type { PostcssNode } from '@vltpkg/dss-parser'

export type PathInternals = {
  pathPattern: string
}

export const parseInternals = (
  nodes: PostcssNode[],
  loose: boolean,
): PathInternals => {
  // Parse the first parameter as the path pattern
  let pathPattern = ''
  
  if (!nodes[0]) {
    throw error('Missing path pattern in :path() selector', {
      found: nodes,
    })
  }

  try {
    // Try to parse as a string node first (quoted values)
    pathPattern = removeQuotes(
      asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0]).value,
    )
  } catch (err) {
    if (
      asError(err).message === 'Mismatching query node' &&
      isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
    ) {
      // Handle tag node (unquoted values)
      pathPattern = asTagNode(
        asPostcssNodeWithChildren(nodes[0]).nodes[0],
      ).value
    } else {
      if (!loose) {
        throw err
      }
      // In loose mode, default to empty pattern which matches nothing
      pathPattern = ''
    }
  }

  return {
    pathPattern,
  }
}

/**
 * :path(glob) Pseudo-Selector will match only nodes whose file path
 * matches the provided glob pattern relative to the project root.
 */
export const path = async (state: ParserState) => {
  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
      !!state.loose,
    )
  } catch (err) {
    throw error('Failed to parse :path selector', {
      cause: err,
    })
  }

  const { pathPattern } = internals

  // If no pattern or empty pattern, remove all nodes
  if (!pathPattern) {
    state.partial.nodes.clear()
    state.partial.edges.clear()
    return state
  }

  // Use minimatch to create a filter function for the glob pattern
  const matchPattern = minimatch.filter(pathPattern)

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