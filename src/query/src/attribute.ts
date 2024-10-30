import { error } from '@vltpkg/error-cause'
import type { NodeLike } from '@vltpkg/graph'
import type { JSONField, Manifest } from '@vltpkg/types'
import { asAttributeNode, ParserState } from './types.js'

export type ComparatorFn = (attr: string, value?: string) => boolean

/**
 * Retrieve the {@link Manifest} values found at the given `properties`
 * location for a given {@link Node}.
 */
export const getManifestPropertyValues = (
  node: NodeLike,
  properties: string[],
  attribute: string,
): string[] | undefined => {
  if (!node.manifest) return

  const traverse = new Set<JSONField>([node.manifest as JSONField])
  const props = new Set<JSONField>()
  for (const key of properties) {
    for (const prop of traverse) {
      /* c8 ignore start - should be impossible */
      if (!prop) {
        throw error('failed to find nested property in :attr', {
          found: properties,
        })
      }
      /* c8 ignore stop */

      // expand the result list to include nested array values
      if (Array.isArray(prop)) {
        for (const p of prop) {
          traverse.add(p)
        }
        continue
      }

      // guard for inspecting keys of objects next
      if (
        typeof prop === 'string' ||
        typeof prop === 'number' ||
        typeof prop === 'boolean'
      ) {
        continue
      }

      // assign next value when found
      if (key in prop) {
        const nextValue = prop[key]
        if (nextValue) {
          if (key === attribute) {
            props.add(nextValue)
          } else {
            traverse.delete(prop)
            traverse.add(nextValue)
          }
        }
      }
    }
  }
  // if no value was found after trying a given key
  // then there's nothing to be collected
  if (!props.size) return

  // expand the result to include array values
  const collect = new Set<string>()
  for (const prop of props) {
    if (Array.isArray(prop)) {
      for (const p of prop) {
        collect.add(p ? String(p) : '')
      }
    } else {
      collect.add(String(prop))
    }
  }

  return [...collect]
}

// decorator style of function that will filter `ParserState` results
// based on a provided `comparator` function
export const filterAttributes = (
  state: ParserState,
  comparator: ComparatorFn | undefined,
  value: string,
  propertyName: string,
  insensitive: boolean,
  prefixProperties: string[] = [],
): ParserState => {
  const check = (attr: JSONField) =>
    comparator?.(
      insensitive ? String(attr).toLowerCase() : String(attr),
      insensitive ? value.toLowerCase() : value,
    )
  const deleteNode = (node: NodeLike) => {
    for (const edge of node.edgesIn) {
      state.partial.edges.delete(edge)
    }
    state.partial.nodes.delete(node)
  }

  for (const node of state.partial.nodes) {
    const prefixes =
      prefixProperties.length ? prefixProperties : [propertyName]
    const attrs = getManifestPropertyValues(
      node,
      prefixes,
      propertyName,
    )

    // if no attribute value was found, that means the attribute won't match
    if (!attrs?.length) {
      deleteNode(node)
      continue
    }

    // if the node attribute value won't match, then remove the node
    if (comparator && !attrs.some(check)) {
      deleteNode(node)
    }
  }

  for (const edge of state.partial.edges) {
    // edge.name is a special case in order
    // to be able to match missing nodes by name
    if (propertyName === 'name' && check(edge.name)) {
      continue
    }
    // remove any remaining dangling edge
    if (!edge.to) {
      state.partial.edges.delete(edge)
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
  undefined: (attr: string) => !!attr,
}
export const attributeSelectorsMap = new Map<string, ComparatorFn>(
  Object.entries(attributeSelectors),
)

/**
 * Parse attributes selectors, e.g: `[name]`, `[name=value]`, etc
 */
export const attribute = async (
  state: ParserState,
): Promise<ParserState> => {
  const curr = asAttributeNode(state.current)
  const operatorFn = attributeSelectorsMap.get(String(curr.operator))
  if (!operatorFn) {
    if (state.loose) {
      return state
    }

    throw new Error(
      `Unsupported attribute operator: ${curr.operator}`,
    )
  }

  const value = curr.value || ''
  const propertyName = curr.attribute
  const insensitive = !!curr.insensitive
  return filterAttributes(
    state,
    operatorFn,
    value,
    propertyName,
    insensitive,
  )
}
