import { Monorepo } from '@vltpkg/workspaces'
import { load as loadActual } from './actual/load.ts'
import { build as reifyBuild } from './reify/build.ts'
import type { BuildResult } from './reify/build.ts'
import { Diff } from './diff.ts'
import { Graph } from './graph.ts'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import type { LoadOptions } from './actual/load.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/types'
import { saveHidden } from './lockfile/save.ts'

/**
 * Options for the build process
 */
export interface BuildOptions extends LoadOptions {
  /**
   * Optional monorepo configuration. If not provided, will attempt to load from project.
   */
  monorepo?: Monorepo
  /**
   * DSS query string to filter which nodes to build.
   */
  target: string
}

/**
 * Filter nodes using a DSS query string
 */
const filterNodesByQuery = async (
  targetQuery: string,
  graph: Graph,
): Promise<Set<DepID>> => {
  /* c8 ignore start */
  const securityArchive =
    Query.hasSecuritySelectors(targetQuery) ?
      await SecurityArchive.start({
        nodes: [...graph.nodes.values()],
      })
    : undefined
  /* c8 ignore stop */

  const edges = graph.edges
  const nodes = new Set<NodeLike>(graph.nodes.values())
  const importers = graph.importers

  const query = new Query({
    edges,
    nodes,
    importers,
    securityArchive,
  })

  const { nodes: resultNodes } = await query.search(targetQuery, {
    signal: new AbortController().signal,
  })

  return new Set(resultNodes.map(node => node.id))
}

/**
 * Build the project based on actual graph state and build state from lockfile
 *
 * This function:
 * 1. Loads the actual graph from node_modules
 * 2. Loads build data from lockfile and transfers it to the actual graph
 * 3. Constructs a Diff object representing what needs to be built
 * 4. Filters nodes based on buildState === 'needed'
 * 5. Calls the reify build process with the constructed diff
 * 6. Persists build results to lockfile
 */
export const build = async (
  options: BuildOptions,
): Promise<BuildResult> => {
  const {
    projectRoot,
    packageJson,
    monorepo = Monorepo.maybeLoad(projectRoot),
    scurry,
    mainManifest = packageJson.read(projectRoot),
    target,
    ...loadOptions
  } = options

  // Load the actual graph from node_modules
  const actualGraph = loadActual({
    ...loadOptions,
    projectRoot,
    packageJson,
    monorepo,
    scurry,
    loadManifests: true,
  })

  // Filter nodes using target query provided
  const targetFilteredNodes: Set<DepID> = await filterNodesByQuery(
    target,
    actualGraph,
  )

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

  // Now tweak the diff object to only include the nodes that need to be built
  // Filter by buildState === 'needed' and target query
  diff.nodes.add = new Set(
    [...diff.nodes.add].filter(node => node.buildState === 'needed'),
  )

  // Call the reify build process with the constructed diff
  // this will only build the nodes that need to be built
  // as part of `diff.nodes.add`
  const buildResult = await reifyBuild(
    diff,
    packageJson,
    scurry,
    targetFilteredNodes,
  )

  // Save hidden lockfile with updated buildState
  saveHidden({
    ...options,
    graph: actualGraph,
  })

  return buildResult
}
