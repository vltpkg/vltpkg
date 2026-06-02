import type { ParserState } from '../types.ts'
import {
  assertSecurityArchive,
  removeDanglingEdges,
  removeNode,
} from './helpers.ts'

/**
 * :vulnerable / :vuln Pseudo-Selector matches any package version
 * that has at least one CVE associated with it.
 */
export const vulnerable = async (state: ParserState) => {
  assertSecurityArchive(state, 'vulnerable')

  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    const hasCve = report?.alerts.some(alert => alert.props?.cveId)
    if (!hasCve) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
