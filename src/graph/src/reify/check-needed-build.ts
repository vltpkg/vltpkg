import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import type { Node } from '../node.ts'

/**
 * Build data containing the queue of DepIDs that need building
 */
export type BuildData = {
  needsBuildNodes: Node[]
}

/**
 * Options for checking needed build data
 */
export type CheckNeededBuildOptions = {
  /**
   * The diff object containing nodes to process
   */
  diff: Diff
  /**
   * PathScurry instance for filesystem access
   */
  scurry: PathScurry
}

/**
 * Checks if a node needs to be built based on the conditions from build.ts:
 * 1. Has install lifecycle scripts (install, preinstall, postinstall)
 * 2. Has binding.gyp file with no install/preinstall scripts (implicit install)
 * 3. Is an importer or git dependency with prepare scripts (prepare, preprepare, postprepare)
 * 4. Has binary files that need to be linked
 */
const nodeNeedsBuild = (node: Node, scurry: PathScurry): boolean => {
  // If the node has already been built during reify, no need to build again
  if (node.built) return false

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

  // Check for binding.gyp file (npm's implicit install detection)
  // "If there is a binding.gyp file in the root of your package and you
  // haven't defined your own install or preinstall scripts, npm will default
  // the install command to compile using node-gyp via node-gyp rebuild"
  const hasBindingGyp =
    scurry
      .lstatSync(node.resolvedLocation(scurry) + '/binding.gyp')
      ?.isFile() ?? false
  if (hasBindingGyp && !scripts.install && !scripts.preinstall) return true

  // Check for prepare scripts on importers or git dependencies
  const prepable =
    node.id.startsWith('git') || node.importer || !node.inVltStore()
  const runPrepare =
    !!(
      (scripts.prepare || scripts.preprepare || scripts.postprepare)
      /* c8 ignore next 2 */
    ) && prepable
  if (runPrepare) return true

  return false
}

/**
 * Check which nodes need to be built and set buildState accordingly
 * Marks nodes with buildState = 'needed' for those that require
 * install lifecycle scripts as part of `vlt build`
 * @returns {BuildData} The BuildData object containing Node objects that need building
 */
export const checkNeededBuild = (
  options: CheckNeededBuildOptions,
): BuildData => {
  const { diff, scurry } = options

  // Filter nodes to only include those that actually need to be built
  const nodesToBuild = [...diff.nodes.add].filter(node =>
    nodeNeedsBuild(node, scurry),
  )

  // Set buildState = 'needed' on all nodes that require building
  for (const node of nodesToBuild) {
    node.buildState = 'needed'
  }

  const buildData: BuildData = {
    needsBuildNodes: nodesToBuild,
  }

  return buildData
}
