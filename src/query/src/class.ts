import {
  type ParserFn,
  asClassNode,
  type ParserState,
} from './types.ts'

const classSelectors: Record<string, ParserFn> = {
  prod: async (state: ParserState) => {
    for (const edge of state.partial.edges) {
      if (edge.type !== 'prod' || edge.from.dev) {
        state.partial.edges.delete(edge)
      }
    }
    for (const node of state.partial.nodes) {
      if (!node.edgesIn.size) {
        state.partial.nodes.delete(node)
        continue
      }
      const iterator = new Set(node.edgesIn)
      for (const edge of iterator) {
        if (!state.partial.edges.has(edge)) {
          iterator.delete(edge)
        }
      }
      if (!iterator.size) {
        state.partial.nodes.delete(node)
      }
    }
    return state
  },
  dev: async (state: ParserState) => {
    for (const edge of state.partial.edges) {
      if (edge.type !== 'dev' && !edge.from.dev) {
        state.partial.edges.delete(edge)
      }
    }
    for (const node of state.partial.nodes) {
      if (!node.edgesIn.size) {
        state.partial.nodes.delete(node)
        continue
      }
      const iterator = new Set(node.edgesIn)
      for (const edge of iterator) {
        if (!state.partial.edges.has(edge)) {
          iterator.delete(edge)
        }
      }
      if (!iterator.size) {
        state.partial.nodes.delete(node)
      }
    }
    return state
  },
  optional: async (state: ParserState) => {
    for (const edge of state.partial.edges) {
      if (edge.type !== 'optional' && !edge.from.optional) {
        state.partial.edges.delete(edge)
      }
    }
    for (const node of state.partial.nodes) {
      if (!node.edgesIn.size) {
        state.partial.nodes.delete(node)
        continue
      }
      const iterator = new Set(node.edgesIn)
      for (const edge of iterator) {
        if (!state.partial.edges.has(edge)) {
          iterator.delete(edge)
        }
      }
      if (!iterator.size) {
        state.partial.nodes.delete(node)
      }
    }
    return state
  },
  peer: async (state: ParserState) => {
    for (const edge of state.partial.edges) {
      if (edge.type !== 'peer') {
        state.partial.edges.delete(edge)
      }
    }
    for (const node of state.partial.nodes) {
      if (!node.edgesIn.size) {
        state.partial.nodes.delete(node)
        continue
      }
      for (const e of node.edgesIn) {
        if (!state.partial.edges.has(e)) {
          state.partial.nodes.delete(node)
        }
      }
    }
    return state
  },
  workspace: async (state: ParserState) => {
    for (const node of state.partial.nodes) {
      if (!node.importer || node.mainImporter) {
        state.partial.nodes.delete(node)
      }
    }
    for (const edge of state.partial.edges) {
      // workspaces can't be missing
      if (!edge.to) {
        state.partial.edges.delete(edge)
        // keep only edges that are linking to preivously kept nodes
      } else if (!state.partial.nodes.has(edge.to)) {
        state.partial.edges.delete(edge)
      }
    }
    return state
  },
  // TBD: all things bundled
  // bundled: () => false,
}

const classSelectorsMap = new Map<string, ParserFn>(
  Object.entries(classSelectors),
)

/**
 * Parse classes, e.g: `.prod`, `.dev`, `.optional`, etc
 */
export const classFn = async (state: ParserState) => {
  await state.cancellable()

  const curr = asClassNode(state.current)
  const comparatorFn = curr.value && classSelectorsMap.get(curr.value)
  if (!comparatorFn) {
    if (state.loose) {
      return state
    }

    throw new Error(`Unsupported class: ${state.current.value}`)
  }
  return comparatorFn(state)
}
