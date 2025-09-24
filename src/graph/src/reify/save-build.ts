import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { DepID } from '@vltpkg/dep-id'
import type { Diff } from '../diff.ts'
import type { Node } from '../node.ts'
import { binPaths } from './bin-paths.ts'

/**
 * Build data that gets saved to .vlt-build.json
 */
export type BuildData = {
  queue: DepID[]
}

/**
 * Options for saving build data
 */
export type SaveBuildOptions = {
  /**
   * The diff object to serialize and save
   */
  diff: Diff
  /**
   * The project root path where node_modules/.vlt-build.json should be created
   */
  projectRoot: string
  /**
   * Optional queue of DepIDs from a previously saved store that should be combined
   * with the new nodes being added. Defaults to empty array.
   */
  queue?: DepID[]
}

/**
 * Checks if a node needs to be built based on the conditions from build.ts:
 * 1. Has install lifecycle scripts (install, preinstall, postinstall)
 * 2. Is an importer or git dependency with prepare scripts (prepare, preprepare, postprepare)
 * 3. Has binary files that need to be linked
 */
const nodeNeedsBuild = (node: Node): boolean => {
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

  // Check for prepare scripts on importers or git dependencies
  const prepable =
    node.id.startsWith('git') || node.importer || !node.inVltStore()
  const runPrepare =
    !!(
      (scripts.prepare || scripts.preprepare || scripts.postprepare)
      /* c8 ignore next 2 */
    ) && prepable
  if (runPrepare) return true

  // Check if the package has binary files
  const hasBins = Object.values(binPaths(manifest)).length > 0
  if (hasBins) return true

  return false
}

/**
 * Save build data to node_modules/.vlt-build.json
 * This file contains the DepIDs of the nodes that need
 * to run install lifecycle scripts as part of `vlt build`
 * @returns {BuildData} The BuildData object that was saved
 */
export const saveBuild = (options: SaveBuildOptions): BuildData => {
  const { diff, projectRoot, queue = [] } = options

  // Filter nodes to only include those that actually need to be built
  const nodesToBuild = [...diff.nodes.add].filter(nodeNeedsBuild)

  const buildData: BuildData = {
    queue: [
      ...new Set([...queue, ...nodesToBuild.map(node => node.id)]),
    ],
  }

  const fileName = resolve(
    projectRoot,
    'node_modules/.vlt-build.json',
  )

  // Ensure the node_modules directory exists
  mkdirSync(dirname(fileName), { recursive: true })

  // Save the build data as formatted JSON
  const json = JSON.stringify(buildData, null, 2)
  writeFileSync(fileName, json, 'utf8')

  return buildData
}
