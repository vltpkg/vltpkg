import { homedir } from 'node:os'
import { parse, posix } from 'node:path'
import {
  getProjectData,
  readProjectFolders,
  reloadConfig,
} from '@vltpkg/server'
import { actual, createVirtualRoot } from '@vltpkg/graph'
import { SecurityArchive } from '@vltpkg/security-archive'
import { error } from '@vltpkg/error-cause'
import type { PathBase, PathScurry } from 'path-scurry'
import type { EdgeLike, NodeLike } from '@vltpkg/types'
import type { LoadedConfig } from './config/index.ts'

export type HostContextsMapResult = {
  initialEdges: EdgeLike[]
  initialNodes: NodeLike[]
  edges: EdgeLike[]
  nodes: NodeLike[]
  securityArchive: SecurityArchive
}

// In restricted environments (like locked-down Codespaces),
// homedir() might fail. Fall back to parent directory.
let foundHome
try {
  foundHome = posix.format(parse(homedir()))
  /* c8 ignore next 3 */
} catch {}
const home =
  foundHome ?? posix.dirname(posix.format(parse(process.cwd())))

/**
 * Generates possible project keys for a given folder.
 */
const getPossibleProjectKeys = (
  folder: PathBase,
  scurry: PathScurry,
): Set<string> => {
  const relativePath = posix.relative(
    scurry.cwd.fullpathPosix(),
    folder.fullpathPosix(),
  )
  const absolutePath = folder.fullpathPosix()
  const homeRelativePath = posix.relative(
    scurry.resolvePosix(home),
    folder.fullpathPosix(),
  )
  const dotRelativeKey =
    relativePath === '' ? 'file:.' : `file:./${relativePath}`
  const relativeKey = `file:${relativePath}`
  const absoluteKey = `file:${absolutePath}`
  const homeRelativeKey = `file:~/${homeRelativePath}`
  const keys = [
    relativeKey,
    dotRelativeKey,
    absoluteKey,
    homeRelativeKey,
    `${relativeKey}/`,
    `${dotRelativeKey}/`,
    `${absoluteKey}/`,
    `${homeRelativeKey}/`,
  ]
  return new Set(keys)
}

/**
 * Creates a Map of host context functions that can be used by the :host-context
 * pseudo selector to dynamically load graphs from different sources.
 */
export const createHostContextsMap = async (
  conf: LoadedConfig,
): Promise<Map<string, () => Promise<HostContextsMapResult>>> => {
  const hostContexts = new Map<
    string,
    () => Promise<HostContextsMapResult>
  >()
  // Read all project folders from the configured paths
  const { scurry } = conf.options
  const projectFolders = await readProjectFolders({
    scurry,
    userDefinedProjectPaths: conf.options['dashboard-root'] ?? [],
  })

  for (const folder of projectFolders) {
    const retrieveProjectGraph = async () => {
      const initialEdges: EdgeLike[] = []
      const initialNodes: NodeLike[] = []
      const config = await reloadConfig(folder.fullpath())

      // load each individual graph
      const graph = actual.load({
        ...config.options,
        projectRoot: folder.fullpath(),
        skipLoadingNodesOnModifiersChange: false,
      })
      initialEdges.push(...graph.edges)
      initialNodes.push(...graph.nodes.values())

      // Initialize security archive with all loaded nodes
      const securityArchive = await SecurityArchive.start({
        nodes: initialNodes,
      })

      return {
        initialEdges,
        initialNodes,
        edges: [],
        nodes: [graph.mainImporter],
        securityArchive,
      }
    }

    // add multiple keys for each project folder
    for (const path of getPossibleProjectKeys(folder, scurry)) {
      if (!hostContexts.has(path)) {
        hostContexts.set(path, retrieveProjectGraph)
      }
    }
  }

  // Define local context - loads graphs from all projects in user's project paths
  hostContexts.set('local', async () => {
    // Load graphs from each project folder
    const initialEdges: EdgeLike[] = []
    const initialNodes: NodeLike[] = []
    const mainImporters: NodeLike[] = []
    for (const folder of projectFolders) {
      try {
        const config = await reloadConfig(folder.fullpath())
        const projectInfo = getProjectData(
          {
            packageJson: config.options.packageJson,
            scurry: config.options.scurry,
          },
          folder,
        )

        // only include projects that are vlt-installed
        if (!projectInfo.vltInstalled) {
          continue
        }

        // load each individual graph
        const graph = actual.load({
          ...config.options,
          projectRoot: folder.fullpath(),
          skipLoadingNodesOnModifiersChange: false,
        })
        initialEdges.push(...graph.edges)
        initialNodes.push(...graph.nodes.values())
        mainImporters.push(graph.mainImporter)
      } catch (_error) {
        // Skip projects that fail to load
        // This might happen for projects without proper package.json
        // or other loading issues
        continue
      }
    }

    // Initialize security archive with all loaded nodes
    const securityArchive = await SecurityArchive.start({
      nodes: initialNodes,
    })

    const virtualRoot = createVirtualRoot(
      'local',
      conf.options,
      mainImporters,
    )

    if (!virtualRoot) {
      throw error('Failed to create virtual root for local context')
    }

    return {
      initialEdges,
      initialNodes,
      edges: [],
      nodes: [virtualRoot],
      securityArchive,
    }
  })

  return hostContexts
}
