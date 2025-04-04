import { error } from '@vltpkg/error-cause'
import { fastSplit } from '@vltpkg/fast-split'
import { asIdentifierNode } from './types.ts'
import type { ParserState } from './types.ts'
import {
  attributeSelectorsMap,
  filterAttributes,
} from './attribute.ts'
import { semverFilter } from './pseudo/semver.ts'

/**
 * Parse ids, e.g: `#foo`
 */
export const id = async (state: ParserState) => {
  const { value: rawValue } = asIdentifierNode(state.current)
  const splitValues = fastSplit(rawValue, '@')
  const value =
    rawValue.startsWith('@') ? `@${splitValues[1]}` : splitValues[0]
  const semverValue = fastSplit(rawValue, `${value}@`)[1]

  const comparator = attributeSelectorsMap.get('=')

  /* c8 ignore start - should not be possible */
  if (!value) {
    throw error('Missing identifier name')
  }
  if (!comparator) {
    throw error('Could not find attribute selector comparator')
  }
  /* c8 ignore stop */

  state = filterAttributes(state, comparator, value, 'name', true)
  if (semverValue) {
    state = semverFilter(state, {
      semverValue,
    })
  }
  return state
}
