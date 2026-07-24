import type { PathScurry } from 'path-scurry'
import type { PackageJson } from '@vltpkg/package-json'
import type { Diff } from '../diff.ts'
import type { Node } from '../node.ts'
import { join } from 'node:path'

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
  /**
   * PackageJson instance for reading manifests from disk
   */
  packageJson: PackageJson
}

/**
 * Checks if a node needs to be built based on the conditions from build.ts:
 * 1. Has install lifecycle scripts (install, preinstall, postinstall)
 * 2. Has binding.gyp file with no install/preinstall scripts (implicit install)
 * 3. Is an importer or git dependency with prepare scripts (prepare, preprepare, postprepare)
 */
const nodeNeedsBuild = (
  node: Node,
  scurry: PathScurry,
  packageJson: PackageJson,
): boolean => {
  if (node.built) return false

  // When the hasScripts flag is available from the lockfile, we can
  // skip reading the manifest entirely for nodes without scripts.
  // Still need to check binding.gyp for the rare implicit install case.
  if (!node.hasScripts && !node.manifest) {
    const hasBindingGyp =
      scurry
        .lstatSync(join(node.resolvedLocation(scurry), 'binding.gyp'))
        ?.isFile() ?? false
    return hasBindingGyp
  }

  let manifest = node.manifest
  if (!manifest) {
    try {
      manifest = packageJson.read(node.resolvedLocation(scurry))
      node.manifest = manifest
    } catch {
      return false
    }
  }

  const { scripts = {} } = manifest

  const runInstall = !!(
    scripts.install ||
    scripts.preinstall ||
    scripts.postinstall
  )
  if (runInstall) return true

  const hasBindingGyp =
    scurry
      .lstatSync(join(node.resolvedLocation(scurry), 'binding.gyp'))
      ?.isFile() ?? false
  if (hasBindingGyp && !scripts.install && !scripts.preinstall)
    return true

  const prepable =
    node.id.startsWith('git') || node.importer || !node.inVltStore()
  const runPrepare =
    !!(
      scripts.prepare || scripts.preprepare || scripts.postprepare
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
  const { diff, scurry, packageJson } = options

  const nodesToBuild = [...diff.nodes.add].filter(node =>
    nodeNeedsBuild(node, scurry, packageJson),
  )

  for (const node of nodesToBuild) {
    node.buildState = 'needed'
  }

  const buildData: BuildData = {
    needsBuildNodes: nodesToBuild,
  }

  return buildData
}
