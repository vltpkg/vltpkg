import { prerelease } from '@vltpkg/semver'
import type { ParserState } from '../types.ts'
import { removeNode, removeDanglingEdges } from './helpers.ts'

/**
 * :prerelease Pseudo-Selector will only match packages that have
 * prerelease versions (e.g., 1.2.3-alpha.1, 2.0.0-rc.2).
 */
export const prereleaseParser = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    const version = node.version
    if (!version) {
      removeNode(state, node)
      continue
    }

    const prereleaseIdentifiers = prerelease(version)
    if (
      !prereleaseIdentifiers ||
      prereleaseIdentifiers.length === 0
    ) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
