import { error } from '@vltpkg/error-cause'
import {
  asAttributeNode,
  asPostcssNodeWithChildren,
  asTagNode,
} from '../types.ts'
import type { ParserState, PostcssNode } from '../types.ts'
import {
  attributeSelectorsMap,
  filterAttributes,
} from '../attribute.ts'

export type AttrInternals = {
  attribute: string
  insensitive: boolean
  operator?: string
  value?: string
  properties: string[]
}

/**
 * Parses the internal / nested selectors of a `:attr` selector.
 */
export const parseInternals = (
  nodes: PostcssNode[],
): AttrInternals => {
  // the last part is the attribute selector
  const attributeSelector = asAttributeNode(
    asPostcssNodeWithChildren(nodes.pop()).nodes[0],
  )
  // all preppending selectors are naming nested properties
  const properties: string[] = []
  for (const selector of nodes) {
    properties.push(
      asTagNode(asPostcssNodeWithChildren(selector).nodes[0]).value,
    )
  }
  // include the attribute selector as the last part of the property lookup
  properties.push(attributeSelector.attribute)

  return {
    attribute: attributeSelector.attribute,
    insensitive: attributeSelector.insensitive || false,
    operator: attributeSelector.operator,
    value: attributeSelector.value,
    properties,
  }
}

/**
 * :attr Pseudo-Selector, allows for retrieving nodes based on nested
 * properties of the `package.json` metadata.
 */
export const attr = async (state: ParserState) => {
  // Parses and retrieves the values for the nested selectors
  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :attr selector', {
      cause: err,
    })
  }

  // reuses the attribute selector logic to filter the nodes
  const comparator =
    internals.operator ?
      attributeSelectorsMap.get(internals.operator)
    : undefined
  const value = internals.value || ''
  const propertyName = internals.attribute
  const insensitive = internals.insensitive
  const prefixProperties = internals.properties
  return filterAttributes(
    state,
    comparator,
    value,
    propertyName,
    insensitive,
    prefixProperties,
  )
}
