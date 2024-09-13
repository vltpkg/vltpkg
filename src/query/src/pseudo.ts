import { delimiter } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { fastSplit } from '@vltpkg/fast-split'
import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import { asManifest, JSONField } from '@vltpkg/types'
import { attributeSelectorsMap } from './attribute.js'
import {
  asAttributeNode,
  asPostcssNodeWithChildren,
  asPseudoNode,
  asTagNode,
  isSelectorNode,
  ParserFn,
  ParserState,
  PostcssNode,
} from './types.js'

interface AttrInternals {
  attribute: string
  operator?: string
  value?: string
  properties: string[]
}

/**
 * Parses the internal / nested selectors of a `:attr` selector.
 */
const parseAttrInternals = (nodes: PostcssNode[]): AttrInternals => {
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
    operator: attributeSelector.operator,
    value: attributeSelector.value,
    properties,
  }
}

/**
 * Retrieve the {@link Manifest} values found at the given `properties`
 * location for a given {@link Node}.
 */
const getManifestPropertyValues = (
  node: NodeLike,
  properties: string[],
  attribute: string,
): string[] | undefined => {
  if (!node.manifest) return

  const traverse = new Set<JSONField>([node.manifest])
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
        collect.add(String(p))
      }
    } else {
      collect.add(String(prop))
    }
  }

  return [...collect]
}

/**
 * :attr Pseudo-Selector, allows for retrieving nodes based on nested
 * properties of the `package.json` metadata.
 */
const attr = async (state: ParserState) => {
  // Parses and retrieves the values for the nested selectors
  let internals
  try {
    internals = parseAttrInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :attr selector', {
      cause: err as Error,
    })
  }
  // Filters the results to include only those that match the query
  for (const node of state.partial.nodes) {
    const props = getManifestPropertyValues(
      node,
      internals.properties,
      internals.attribute,
    )
    if (!props?.length) {
      state.partial.nodes.delete(node)
      continue
    }

    if (internals.operator) {
      const operatorFn = attributeSelectorsMap.get(internals.operator)
      if (
        operatorFn &&
        !props.some(p => operatorFn(p, internals.value))
      ) {
        state.partial.nodes.delete(node)
      }
    }
  }
  return state
}
/**
 * :empty Pseudo-Selector, matches only nodes that have no children.
 */
const empty = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    if (node.edgesOut.size > 0) {
      state.partial.nodes.delete(node)
    }
  }
  return state
}

/**
 * :has Pseudo-Selector, matches only nodes that have valid results
 * for its nested selector expressions.
 */
const has = async (state: ParserState) => {
  const top = asPostcssNodeWithChildren(state.current)
  const collectNodes = new Set<NodeLike>()
  const collectEdges = new Set<EdgeLike>()

  for (const node of top.nodes) {
    if (isSelectorNode(node)) {
      const nestedState = await state.walk({
        initial: {
          nodes: new Set(state.initial.nodes),
          edges: new Set(state.initial.edges),
        },
        current: node,
        walk: state.walk,
        collect: new Set(),
        partial: {
          nodes: new Set(state.partial.nodes),
          edges: new Set(state.partial.edges),
        },
      })
      for (const n of nestedState.collect) {
        collectNodes.add(n)
      }
      for (const e of nestedState.partial.edges) {
        collectEdges.add(e)
      }
    }
  }

  // if the nested selector did not match anything, that means
  // no current node has any matches
  if (collectNodes.size === 0) {
    state.partial.nodes.clear()
    return state
  }

  // did not filtered using combinators
  // nested selector is treated as trying to match
  // a direct children of current results
  if (collectEdges.size === state.partial.edges.size) {
    // reduce all the edges found in the selector result to
    // a single set so that we can use that to compare with
    // the edges from the current result
    const edgesFound = new Set<EdgeLike>()
    for (const node of collectNodes) {
      for (const edge of node.edgesIn) {
        edgesFound.add(edge)
      }
    }
    // for each node in the current list checks to see if
    // it has a node in the resulting nested state that is
    // a direct children.
    for (const node of state.partial.nodes) {
      if (node.edgesOut.size === 0) {
        state.partial.nodes.delete(node)
        continue
      }
      let found = false
      for (const edge of node.edgesOut.values()) {
        if (edgesFound.has(edge)) {
          found = true
          break
        }
      }
      if (!found) {
        state.partial.nodes.delete(node)
      }
    }
    return state
  }

  // handles transitive dependencies
  // compareNodes collects a list of all ancestor nodes
  // from the resulting nodes of the nested selector
  const compareNodes = new Set<NodeLike>()
  const traverse = new Set(collectNodes)
  for (const node of traverse) {
    for (const edge of node.edgesIn) {
      compareNodes.add(edge.from)
      if (edge.from.edgesIn.size) {
        traverse.add(edge.from)
      }
    }
  }

  // for each node in the current list checks to see if
  // it has a node in the resulting nested state that is
  // a transitive dependency / children.
  nodesLoop: for (const node of state.partial.nodes) {
    if (node.edgesOut.size === 0 || !compareNodes.has(node)) {
      state.partial.nodes.delete(node)
      continue
    }

    for (const edge of node.edgesOut.values()) {
      if (collectEdges.has(edge)) {
        continue nodesLoop
      }
    }
    state.partial.nodes.delete(node)
  }
  return state
}

/**
 * :is Pseudo-selector, acts as a shortcut for writing more compact expressions
 * by allowing multiple nested selectors to match on the previous results.
 *
 * It also enables the loose parsing mode, skipping instead of erroring usage
 * of non-existing classes, identifiers, pseudo-classes, etc.
 */
const is = async (state: ParserState) => {
  const top = asPostcssNodeWithChildren(state.current)
  const collect = new Set()
  for (const node of top.nodes) {
    if (isSelectorNode(node)) {
      const nestedState = await state.walk({
        collect: new Set(),
        current: node,
        initial: state.initial,
        loose: true,
        partial: {
          nodes: new Set(state.partial.nodes),
          edges: new Set(state.partial.edges),
        },
        walk: state.walk,
      })
      for (const n of nestedState.collect) {
        collect.add(n)
      }
    }
  }
  for (const node of state.partial.nodes) {
    if (!collect.has(node)) {
      state.partial.nodes.delete(node)
    }
  }
  return state
}

/**
 * :not Pseudo-class, serves to create negate expressions, anything that
 * matches selectors declared inside the `:not()` expression is going to be
 * filtered out in the final result.
 */
const not = async (state: ParserState) => {
  const top = asPostcssNodeWithChildren(state.current)
  const collect = new Set()
  for (const node of top.nodes) {
    if (isSelectorNode(node)) {
      const nestedState = await state.walk({
        collect: new Set(),
        current: node,
        initial: state.initial,
        partial: {
          nodes: new Set(state.partial.nodes),
          edges: new Set(state.partial.edges),
        },
        walk: state.walk,
      })
      for (const n of nestedState.collect) {
        collect.add(n)
      }
      /* c8 ignore start - should be impossible */
    } else {
      throw error('Error parsing :not() selectors', {
        wanted: { type: 'selector' },
        found: node,
      })
    }
    /* c8 ignore stop */
  }
  for (const node of state.partial.nodes) {
    if (collect.has(node)) {
      state.partial.nodes.delete(node)
    }
  }
  return state
}

/**
 * :private Pseudo-Selector will only match packages that have
 * a `private: true` key set in their `package.json` metadata.
 */
const privateFn = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    if (!asManifest(node.manifest).private) {
      state.partial.nodes.delete(node)
    }
  }
  return state
}

/**
 * :root Pseudo-Element will return the project root node for the graph.
 */
const root = async (state: ParserState) => {
  const [anyNode] = state.initial.nodes.values()
  const mainImporter = anyNode?.graph.mainImporter
  if (!mainImporter) {
    throw error(':root pseudo-element works on local graphs only')
  }
  state.partial.nodes = new Set<NodeLike>([mainImporter])
  return state
}

/**
 * :project Pseudo-Element, returns all graph importers (e.g: the
 * root node along with any configured workspace)
 */
const project = async (state: ParserState) => {
  const [anyNode] = state.initial.nodes.values()
  const importers = anyNode?.graph.importers
  if (!importers?.size) {
    throw error(':project pseudo-element works on local graphs only')
  }
  state.partial.nodes = new Set<NodeLike>(importers)
  return state
}

/**
 * :scope Pseudo-Element, returns the original scope of items
 * at the start of a given selector.
 */
const scope = async (state: ParserState) => {
  state.partial = {
    edges: new Set(state.initial.edges),
    nodes: new Set(state.initial.nodes),
  }
  return state
}

/**
 * :type(str) Pseudo-Element will match only nodes that are of
 * the same type as the value used
 */
const typeFn = async (state: ParserState) => {
  const type = asPostcssNodeWithChildren(state.current)
  const selector = asPostcssNodeWithChildren(type.nodes[0])
  const name = asTagNode(selector.nodes[0]).value
  const compareName = name === 'registry' ? '' : name
  for (const node of state.partial.nodes) {
    const nodeType = fastSplit(node.id, delimiter, 2)[0]
    if (nodeType !== compareName) {
      state.partial.nodes.delete(node)
    }
  }
  return state
}

const pseudoSelectors = new Map<string, ParserFn>(
  Object.entries({
    attr,
    empty,
    has,
    is,
    // TODO: link
    not,
    // TODO: overridden
    private: privateFn,
    project,
    root,
    scope,
    type: typeFn,
    // TODO: semver
    // TODO: outdated
  }),
)

/**
 * Parsers the `pseudo` node types.
 */
export const pseudo = async (state: ParserState) => {
  const curr = asPseudoNode(state.current)
  const parserFn =
    curr.value && pseudoSelectors.get(curr.value.slice(1))

  if (!parserFn) {
    if (state.loose) {
      return state
    }

    throw new Error(
      `Unsupported pseudo-class: ${state.current.value}`,
    )
  }
  return parserFn(state)
}
