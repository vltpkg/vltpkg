import { asIdentifierNode, type ParserState } from './types.js'
import { attributeSelectorsMap } from './attribute.js'
import { error } from '@vltpkg/error-cause'

/**
 * Parse ids, e.g: `#foo`
 */
export const id = async (state: ParserState) => {
  const { value } = asIdentifierNode(state.current)
  const matcher = attributeSelectorsMap.get('=')

  /* c8 ignore start - should not be possible */
  if (!value) {
    throw error('Missing identifier name')
  }
  if (!matcher) {
    throw error('Could not find attribute selector comparator')
  }
  /* c8 ignore stop */

  for (const node of state.partial.nodes) {
    const jsonValue = node.manifest?.name
    if (!jsonValue || !matcher(jsonValue, value)) {
      state.partial.nodes.delete(node)
    }
  }

  return state
}
