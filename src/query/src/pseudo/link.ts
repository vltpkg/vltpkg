import { splitDepID } from '@vltpkg/dep-id/browser'
import type { ParserState } from '../types.ts'
import { removeNode } from './helpers.ts'

/**
 * :link Pseudo-Selector, matches only nodes that are file links.
 *
 * It filters out any node that is not of type 'file' or nodes of 'file'
 * type that ends with 'tar.gz' since these are local tarballs.
 */
export const link = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    const [type, path] = splitDepID(node.id)
    if (type !== 'file' || path.endsWith('tar.gz') || path === '.') {
      removeNode(state, node)
    }
  }

  for (const edge of state.partial.edges) {
    if (
      !edge.spec.file ||
      edge.spec.file.endsWith('tar.gz') ||
      edge.spec.file === '.'
    ) {
      state.partial.edges.delete(edge)
    }
  }

  return state
}
