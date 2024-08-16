import type { JSONField, ManifestMinified } from '@vltpkg/types'
import { asAttributeNode, ParserState } from './types.js'

export type ComparatorFn = (attr: string, value?: string) => boolean

// decorator style of function that will filter `ParserState` results
// based on a provided `comparator` function
const filterAttributes = (
  state: ParserState,
  comparator: ComparatorFn,
): ParserState => {
  const curr = asAttributeNode(state.current)
  for (const node of state.partial.nodes) {
    const jsonValue = node.manifest?.[
      curr.attribute as keyof ManifestMinified
    ] as JSONField
    const value = curr.value
    const attrs =
      Array.isArray(jsonValue) ?
        jsonValue.map(String)
      : [String(jsonValue)]
    if (
      !attrs.some(attr =>
        comparator(
          curr.insensitive ?
            String(attr).toLowerCase()
          : String(attr),
          curr.insensitive ? value?.toLowerCase() : value,
        ),
      )
    ) {
      state.partial.nodes.delete(node)
    }
  }
  return state
}

// ref: https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors
const attributeSelectors: Record<string, ComparatorFn> = {
  '=': (attr: string, value = '') => attr === value,
  '^=': (attr: string, value = '') => attr.startsWith(value),
  '$=': (attr: string, value = '') => attr.endsWith(value),
  '~=': (attr: string, value = '') =>
    new Set<string>(attr.match(/\w+/g)).has(value),
  '*=': (attr: string, value = '') => attr.includes(value),
  '|=': (attr: string, value = '') =>
    attr === value || attr.startsWith(`${value}-`),
}
export const attributeSelectorsMap = new Map<string, ComparatorFn>(
  Object.entries(attributeSelectors),
)

export const attribute = async (
  state: ParserState,
): Promise<ParserState> => {
  const curr = asAttributeNode(state.current)
  const operatorFn =
    curr.operator && attributeSelectorsMap.get(curr.operator)
  if (!operatorFn) {
    if (state.loose) {
      return state
    }

    throw new Error(
      `Unsupported attribute operator: ${curr.operator}`,
    )
  }
  return filterAttributes(state, operatorFn)
}
