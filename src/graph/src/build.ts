import { Monorepo } from '@vltpkg/workspaces'
import { load as loadActual } from './actual/load.ts'
import { build as reifyBuild } from './reify/build.ts'
import type { BuildResult } from './reify/build.ts'
import { Diff } from './diff.ts'
import { Graph } from './graph.ts'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { usesNpmRegistry } from '@vltpkg/security-archive/browser'
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
 * Filter nodes using a DSS query string. `skipped` holds matched nodes
 * left out because their security data timed out.
 */
const filterNodesByQuery = async (
  targetQuery: string,
  graph: Graph,
): Promise<{ allowed: Set<DepID>; skipped: Set<DepID> }> => {
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

  // fail closed: never run scripts of pkgs whose security data timed out
  const allowed = new Set<DepID>()
  const skipped = new Set<DepID>()
  for (const node of resultNodes) {
    if (
      securityArchive?.timedOut &&
      !securityArchive.has(node.id) &&
      usesNpmRegistry(node)
    ) {
      skipped.add(node.id)
    } else {
      allowed.add(node.id)
    }
  }
  return { allowed, skipped }
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
 * 6. Persists build results to the hidden lockfile, when the vlt store exists
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
  const { allowed: targetFilteredNodes, skipped } =
    await filterNodesByQuery(target, actualGraph)

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

  // Save hidden lockfile with updated buildState, but only when the
  // store exists, i.e. this node_modules was built by vlt. Loading a
  // node_modules installed by another client finds nothing to build,
  // and must not leave a file behind that makes it look like a vlt
  // install. A dependency-less vlt install has no store either, but it
  // also has no nodes, so there is no build state to persist.
  if (
    scurry
      .lstatSync(scurry.resolve(projectRoot, 'node_modules/.vlt'))
      ?.isDirectory()
  ) {
    saveHidden({
      ...options,
      graph: actualGraph,
    })
  }

  // needed builds left out for lack of security data
  const skippedNodes = [...diff.nodes.add].filter(node =>
    skipped.has(node.id),
  )
  return skippedNodes.length ?
      { ...buildResult, skipped: skippedNodes }
    : buildResult
}
