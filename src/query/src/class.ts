import { asClassNode, type ParserState } from './types.js'
import type { NodeLike } from '@vltpkg/graph'

type ComparatorFn = (types: Set<string>, node: NodeLike) => boolean

/**
 * Filter the current list of nodes, using the `comparator` function
 * removing any nodes that are not of the same type requested.
 */
const filterTypes = (
  state: ParserState,
  comparator: ComparatorFn,
): ParserState => {
  for (const node of state.partial.nodes) {
    const types = new Set<string>()
    for (const edge of node.edgesIn) {
      types.add(edge.type)
    }
    if (!comparator(types, node)) {
      state.partial.nodes.delete(node)
    }
  }
  return state
}

const classSelectors: Record<string, ComparatorFn> = {
  prod: (types: Set<string>, node: NodeLike) =>
    types.has('prod') && !node.dev && !node.optional,
  dev: (_: Set<string>, node: NodeLike) => node.dev,
  optional: (_: Set<string>, node: NodeLike) => node.optional,
  peer: (types: Set<string>) => types.has('peer'),
  workspace: (_: Set<string>, node: NodeLike) =>
    node.importer && !node.mainImporter,
  // TBD: all things bundled
  // bundled: () => false,
}

const classSelectorsMap = new Map<string, ComparatorFn>(
  Object.entries(classSelectors),
)

/**
 * Parse classes, e.g: `.prod`, `.dev`, `.optional`, etc
 */
export const classFn = async (state: ParserState) => {
  const curr = asClassNode(state.current)
  const comparatorFn = curr.value && classSelectorsMap.get(curr.value)
  if (!comparatorFn) {
    if (state.loose) {
      return state
    }

    throw new Error(`Unsupported class: ${state.current.value}`)
  }
  return filterTypes(state, comparatorFn)
}
