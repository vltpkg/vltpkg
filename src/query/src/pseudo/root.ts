import { error } from '@vltpkg/error-cause'
import type { ParserState } from '../types.ts'

/**
 * :root Pseudo-Element will return the project root node for the graph.
 * It matches only the main importer node of the graph, which represents
 * the root of the project.
 */
export const root = async (state: ParserState) => {
  const [anyNode] = state.initial.nodes.values()
  const mainImporter = anyNode?.graph.mainImporter
  if (!mainImporter) {
    throw error(':root pseudo-element works on local graphs only')
  }
  for (const edge of state.partial.edges) {
    if (edge.to !== mainImporter) {
      state.partial.edges.delete(edge)
    }
  }
  state.partial.nodes.clear()
  state.partial.nodes.add(mainImporter)
  return state
}
