import { parse } from '@vltpkg/semver'
import { removeNode, removeDanglingEdges } from './helpers.ts'
import type { ParserState } from '../types.ts'

/**
 * :prerelease Pseudo-selector, matches only nodes that have prerelease
 * elements in their parsed semver value.
 *
 * Examples of versions that should match:
 * - 19.2.0-canary-fa3feba6-20250623
 * - 1.0.0-beta.0
 * - 0.0.0-16
 * - 1.2.3-rc.1+rev.2
 *
 * Examples of versions that should NOT match:
 * - 1.0.0
 * - 99.9.9
 * - 0.0.1
 */
export const prerelease = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    const version = node.manifest?.version

    // Skip nodes without a version (like root/importer nodes)
    if (!version) {
      removeNode(state, node)
      continue
    }

    const parsedVersion = parse(version)
    if (!parsedVersion) {
      // Remove nodes with invalid semver versions
      removeNode(state, node)
      continue
    }

    // Check if the version has prerelease identifiers
    if (!parsedVersion.prerelease?.length) {
      // Remove nodes that don't have prerelease identifiers
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
