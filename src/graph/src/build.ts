import {
  readFileSync,
  existsSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { Monorepo } from '@vltpkg/workspaces'
import { splitDepID } from '@vltpkg/dep-id'
import { load as loadActual } from './actual/load.ts'
import { build as reifyBuild } from './reify/build.ts'
import { Diff } from './diff.ts'
import { Graph } from './graph.ts'
import type { BuildData } from './reify/save-build.ts'
import type { LoadOptions } from './actual/load.ts'
import type { LockfileData } from './lockfile/types.ts'
import type { DepID } from '@vltpkg/dep-id'
import { saveData } from './lockfile/save.ts'

/**
 * Options for the build process
 */
export interface BuildOptions extends LoadOptions {
  /**
   * Optional monorepo configuration. If not provided, will attempt to load from project.
   */
  monorepo?: Monorepo
  /**
   * Optional array of DepIDs to filter nodes for building. If provided,
   * only nodes with IDs in this array will be built.
   */
  queryFilteredNodes?: DepID[]
}

/**
 * Options for the skip process
 */
export interface SkipOptions extends LoadOptions {
  /**
   * Optional monorepo configuration. If not provided, will attempt to load from project.
   */
  monorepo?: Monorepo
  /**
   * Optional array of DepIDs to filter nodes for skipping. If provided,
   * only nodes with IDs in this array will be skipped.
   */
  queryFilteredNodes?: DepID[]
}

/**
 * Load BuildData from .vlt-build.json file if it exists
 */
const loadBuildData = (
  projectRoot: string,
): BuildData | undefined => {
  const buildFilePath = resolve(
    projectRoot,
    'node_modules/.vlt-build.json',
  )

  if (!existsSync(buildFilePath)) {
    return
  }

  try {
    const content = readFileSync(buildFilePath, 'utf8')
    return JSON.parse(content) as BuildData
  } catch {
    // If file is corrupted or unreadable, treat as if it doesn't exist
    return
  }
}

/**
 * Load lockfile data from vlt-lock.json if it exists
 */
const loadLockfileBuildData = (
  projectRoot: string,
): LockfileData | undefined => {
  const lockfilePath = resolve(projectRoot, 'vlt-lock.json')

  if (!existsSync(lockfilePath)) {
    return
  }

  try {
    const content = readFileSync(lockfilePath, 'utf8')
    return JSON.parse(content) as LockfileData
  } catch {
    // If file is corrupted or unreadable, treat as if it doesn't exist
    return
  }
}

/**
 * Update or remove the BuildData file after successful build completion
 * If queryFilteredNodes was provided, only remove the built nodes from the queue
 * If no queryFilteredNodes was provided, remove the entire file
 */
const cleanupBuildData = (
  projectRoot: string,
  builtEntries: [string, string[]][],
  actualGraph: Graph,
  queryFilteredNodes?: DepID[],
): void => {
  const buildFilePath = resolve(
    projectRoot,
    'node_modules/.vlt-build.json',
  )

  if (!existsSync(buildFilePath)) return

  // If no query filtering was used, remove entire file as before
  if (!queryFilteredNodes) {
    unlinkSync(buildFilePath)
    return
  }

  // Load current build data
  const currentData = loadBuildData(projectRoot)
  /* c8 ignore next */
  if (!currentData) return

  // Create a set of built DepIDs from builtEntries and actualGraph
  const builtDepIDs = new Set<DepID>()

  // Add all nodes that were actually built based on the build results
  for (const [registry, names] of builtEntries) {
    for (const name of names) {
      // Find nodes in the actual graph that match this registry and name
      for (const [depId, node] of actualGraph.nodes) {
        if (
          node.name === name &&
          node.registry === registry &&
          typeof node.name === 'string' &&
          typeof node.registry === 'string'
        ) {
          builtDepIDs.add(depId)
        }
      }
    }
  }

  // Filter out built nodes from the queue
  const updatedQueue = currentData.queue.filter(
    id => !builtDepIDs.has(id),
  )

  try {
    // If no items left in queue, remove the file
    if (updatedQueue.length === 0) {
      unlinkSync(buildFilePath)
    } else {
      // Update the file with remaining queue items
      const updatedData: BuildData = { queue: updatedQueue }
      writeFileSync(buildFilePath, JSON.stringify(updatedData))
    }

    /* c8 ignore start */
  } catch {
    // If cleanup fails, it's not critical - just continue
    // The file will be overwritten on next build if needed
  }
  /* c8 ignore stop */
}

/**
 * Build the project based on actual graph state and cached build data
 *
 * This function:
 * 1. Loads the actual graph from node_modules
 * 2. Loads build data from lockfile and transfers it to the actual graph
 * 3. Optionally loads cached build data from .vlt-build.json
 * 4. Constructs a Diff object representing what needs to be built
 * 5. Calls the reify build process with the constructed diff
 * 6. Persists build results to lockfile
 * 7. Cleans up the build data file after successful completion
 */
export const build = async (options: BuildOptions): Promise<void> => {
  const {
    projectRoot,
    packageJson,
    monorepo = Monorepo.maybeLoad(projectRoot),
    scurry,
    mainManifest = packageJson.read(projectRoot),
    queryFilteredNodes,
    ...loadOptions
  } = options

  // Load lockfile data to get build information
  const lockfileDataObj = loadLockfileBuildData(projectRoot)

  // Load the actual graph from node_modules
  const actualGraph = loadActual({
    ...loadOptions,
    projectRoot,
    packageJson,
    monorepo,
    scurry,
    loadManifests: true,
  })

  // Transfer build data from lockfile to actual graph
  if (lockfileDataObj?.build) {
    actualGraph.build = lockfileDataObj.build
  }

  // Create a total diff including the actual graph as 'to'
  const diff = new Diff(
    new Graph({
      ...options,
      projectRoot,
      monorepo,
      mainManifest,
    }),
    actualGraph,
  )

  // Load cached build data if available
  const { queue } = loadBuildData(projectRoot) ?? {}

  // Now tweak the diff object to only include the nodes that need to be built
  // as part of `diff.nodes.add` since this is the only thing that reifyBuild cares about
  diff.nodes.add = new Set(
    [...diff.nodes.add].filter(node => {
      // First filter by queue (existing logic)
      const inQueue = queue?.includes(node.id)

      // Then filter by queryFilteredNodes if provided
      const inQueryFilter =
        queryFilteredNodes ?
          queryFilteredNodes.includes(node.id)
        : true

      return inQueue && inQueryFilter
    }),
  )

  // Call the reify build process with the constructed diff
  // this will only build the nodes that need to be built
  // as part of `diff.nodes.add`
  const buildResults = await reifyBuild(
    diff,
    packageJson,
    scurry,
    true,
  )

  // Merge build results into the lockfile data
  const builtEntries = Object.entries(buildResults)
  if (lockfileDataObj && builtEntries.length) {
    for (const [registry, names] of builtEntries) {
      const prevAllowed =
        lockfileDataObj.build.allowed[registry] ?? []
      if (names.length) {
        lockfileDataObj.build.allowed[registry] = [
          ...new Set([...prevAllowed, ...names]),
        ]
      }
    }
  }

  // Save updated lockfile
  if (lockfileDataObj) {
    saveData(
      lockfileDataObj,
      resolve(projectRoot, 'vlt-lock.json'),
      false,
    )
  }

  // Clean up the build data file after successful completion
  // since it's no longer needed after the build is complete
  cleanupBuildData(
    projectRoot,
    builtEntries,
    actualGraph,
    queryFilteredNodes,
  )
}

/**
 * Skip building queued packages and update lockfile to mark them as blocked
 *
 * This function:
 * 1. Loads the actual graph from node_modules
 * 2. Loads build data from lockfile and .vlt-build.json
 * 3. Determines which packages to skip based on queue and optional query filtering
 * 4. Updates the lockfile to mark skipped packages as blocked
 * 5. Updates or removes .vlt-build.json based on remaining items
 */
export const skip = async (options: SkipOptions): Promise<void> => {
  const {
    projectRoot,
    packageJson,
    monorepo = Monorepo.maybeLoad(projectRoot),
    scurry,
    mainManifest: _mainManifest = packageJson.read(projectRoot),
    queryFilteredNodes,
    ...loadOptions
  } = options

  // Load lockfile data to get build information
  const lockfileDataObj = loadLockfileBuildData(projectRoot)

  // Load the actual graph from node_modules
  const actualGraph = loadActual({
    ...loadOptions,
    projectRoot,
    packageJson,
    monorepo,
    scurry,
    loadManifests: false,
  })

  // Transfer build data from lockfile to actual graph
  if (lockfileDataObj?.build) {
    actualGraph.build = lockfileDataObj.build
  }

  // Load cached build data if available
  const buildData = loadBuildData(projectRoot)
  const { queue } = buildData ?? {}

  if (!queue || queue.length === 0) {
    // No queued items to skip
    return
  }

  // Determine which nodes to skip based on queue and optional query filtering
  const nodesToSkip = queue.filter(depId => {
    // If queryFilteredNodes is provided, only skip nodes that match the query
    return queryFilteredNodes ?
        queryFilteredNodes.includes(depId)
      : true
  })

  if (nodesToSkip.length === 0) {
    // No nodes to skip based on filtering
    return
  }

  // Update lockfile to mark skipped packages as blocked
  const skippedByRegistry: Record<string, string[]> = {}

  for (const depId of nodesToSkip) {
    const node = actualGraph.nodes.get(depId)
    if (node?.name) {
    /* c8 ignore next */
      const registry = node.registry || splitDepID(node.id)[0]
      const name = node.name
      skippedByRegistry[registry] ??= []
      skippedByRegistry[registry].push(name)
    }
  }

  if (lockfileDataObj) {
    // Merge skipped entries into blocked section of lockfile
    for (const [registry, names] of Object.entries(
      skippedByRegistry,
    )) {
      const prevBlocked =
        lockfileDataObj.build.blocked[registry] ?? []
      if (names.length) {
        lockfileDataObj.build.blocked[registry] = [
          ...new Set([...prevBlocked, ...names]),
        ]
      }
    }

    // Save updated lockfile
    saveData(
      lockfileDataObj,
      resolve(projectRoot, 'vlt-lock.json'),
      false,
    )
  }

  // Update build data file - remove skipped nodes from queue
  const buildFilePath = resolve(
    projectRoot,
    'node_modules/.vlt-build.json',
  )
  if (existsSync(buildFilePath) && buildData) {
    const remainingQueue = buildData.queue.filter(
      id => !nodesToSkip.includes(id),
    )

    if (remainingQueue.length === 0) {
      // Remove file if no items remain
      try {
        unlinkSync(buildFilePath)
        /* c8 ignore start */
      } catch {
        // If cleanup fails, it's not critical
      }
      /* c8 ignore stop */
    } else {
      // Update file with remaining items
      const updatedData: BuildData = { queue: remainingQueue }
      try {
        writeFileSync(
          buildFilePath,
          JSON.stringify(updatedData, null, 2),
        )
        /* c8 ignore start */
      } catch {
        // If update fails, it's not critical
      }
      /* c8 ignore stop */
    }
  }
}
