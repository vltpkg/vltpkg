import type { NodeLike } from '@vltpkg/types'
import type { ParserState } from '../types.ts'
import { removeNode, removeDanglingEdges } from './helpers.ts'

/**
 * Checks if a node needs to be built based on the conditions from the reify build process:
 * 1. Has install lifecycle scripts (install, preinstall, postinstall)
 * 2. Is an importer or git dependency with prepare scripts (prepare, preprepare, postprepare)
 */
const nodeNeedsBuild = (node: NodeLike): boolean => {
  const { manifest } = node
  /* c8 ignore next */
  if (!manifest) return false

  const { scripts = {} } = manifest

  // Check for install lifecycle scripts
  const runInstall = !!(
    scripts.install ||
    scripts.preinstall ||
    scripts.postinstall
  )
  if (runInstall) return true

  // Check for prepare scripts on importers or git dependencies
  const prepable = node.id.startsWith('git') || node.importer
  const runPrepare =
    !!(
      (scripts.prepare || scripts.preprepare || scripts.postprepare)
      /* c8 ignore next 2 */
    ) && prepable
  if (runPrepare) return true

  return false
}

/**
 * :scripts Pseudo-Selector filters nodes based on whether they need to be built.
 *
 * A node needs to be built if it has:
 * - Install lifecycle scripts (install, preinstall, postinstall)
 * - Prepare scripts on importers or git dependencies (prepare, preprepare, postprepare)
 */
export const scripts = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    if (!nodeNeedsBuild(node)) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
