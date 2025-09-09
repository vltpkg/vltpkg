import { asAttributeNode } from '@vltpkg/dss-parser'
import { error } from '@vltpkg/error-cause'
import { removeDanglingEdges } from './pseudo/helpers.ts'
import type { NodeLike, JSONField, Manifest } from '@vltpkg/types'
import type { ParserState } from './types.ts'

export type ComparatorFn = (attr: string, value?: string) => boolean

// JSONField has a mapped type constituent that would coerce to [object Object]
// when stringified, which is what we want in this case.
// eslint-disable-next-line @typescript-eslint/no-base-to-string
const jsonFieldToString = (v: JSONField) => String(v)

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
        collect.add(p ? jsonFieldToString(p) : '')
      }
    } else {
      collect.add(jsonFieldToString(prop))
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
      insensitive ?
        jsonFieldToString(attr).toLowerCase()
      : jsonFieldToString(attr),
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

  removeDanglingEdges(state)
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
  await state.cancellable()

  const curr = asAttributeNode(state.current)
  const operatorFn = attributeSelectorsMap.get(String(curr.operator))
  if (!operatorFn) {
    if (state.loose) {
      return state
    }

    throw error(`Unsupported attribute operator: ${curr.operator}`, {
      found: state.current,
    })
  }

  const value = curr.value || ''
  const propertyName = curr.attribute
  const insensitive = !!curr.insensitive

  // Increment the commonCounter for specificity
  state.specificity.commonCounter += 1

  return filterAttributes(
    state,
    operatorFn,
    value,
    propertyName,
    insensitive,
  )
}
