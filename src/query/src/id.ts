import { error } from '@vltpkg/error-cause'
import { asIdentifierNode, type ParserState } from './types.ts'
import {
  attributeSelectorsMap,
  filterAttributes,
} from './attribute.ts'

/**
 * Parse ids, e.g: `#foo`
 */
export const id = async (state: ParserState) => {
  const { value } = asIdentifierNode(state.current)
  const comparator = attributeSelectorsMap.get('=')

  /* c8 ignore start - should not be possible */
  if (!value) {
    throw error('Missing identifier name')
  }
  if (!comparator) {
    throw error('Could not find attribute selector comparator')
  }
  /* c8 ignore stop */

  return filterAttributes(state, comparator, value, 'name', true)
}
