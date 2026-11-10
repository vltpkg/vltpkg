import type { ParserState } from '../types.ts'
import { removeDanglingEdges, removeNode } from './helpers.ts'

export const types = async (state: ParserState) => {
  const targets = new Set<string>()
  // use the full selection so #react:types still sees @types/react.
  for (const node of state.initial.nodes) {
    const target = node.typeTarget
    if (target) targets.add(target)
  }
  for (const node of state.partial.nodes) {
    if (!node.name || !targets.has(node.name)) removeNode(state, node)
  }
  removeDanglingEdges(state)
  return state
}

export const typePackages = async (
  state: ParserState,
  orphan = false,
) => {
  const names = new Set([...state.initial.nodes].map(n => n.name))
  for (const node of state.partial.nodes) {
    const target = node.typeTarget
    if (!target || (orphan && names.has(target))) {
      removeNode(state, node)
    }
  }
  removeDanglingEdges(state)
  return state
}
