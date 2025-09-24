import { build, skip, actual, GraphModifier } from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { commandUsage } from '../config/usage.ts'
import { createHostContextsMap } from '../query-host-contexts.ts'
import type { Node, Graph } from '@vltpkg/graph'
import type { DepID } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/types'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { LoadedConfig } from '../config/index.ts'
import type { Views } from '../view.ts'
import { isErrorWithCause } from '@vltpkg/types'

export const views = {
  human: (_, __, conf) => {
    const sub = conf.positionals[0]
    return sub === 'skip' ?
        'Skip completed successfully.'
      : 'Build completed successfully.'
  },
  json: (_, __, conf) => {
    const sub = conf.positionals[0]
    return sub === 'skip' ?
        {
          success: true,
          message: 'Skip completed successfully.',
        }
      : {
          success: true,
          message: 'Build completed successfully.',
        }
  },
} as const satisfies Views

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'build',
    usage: '[skip] [--scope=<query>]',
    description: `Build the project based on the current dependency graph.

    This command processes the installed packages in node_modules and runs
    any necessary build steps, such as lifecycle scripts and binary linking.
    
    The build process is idempotent and will only perform work that is
    actually needed based on the current state of the dependency graph.
    
    Use --scope option to filter packages using DSS query language syntax.`,
    subcommands: {
      skip: {
        usage: '[--scope=<query>]',
        description:
          'Skip building queued packages and update lockfile',
      },
    },
    options: {
      scope: {
        value: '<query>',
        description:
          'Query selector to filter packages using DSS syntax.',
      },
    },
  })

const isGraphRunError = (
  error: unknown,
): error is Error & { code: string; node: Node } =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'GRAPHRUN_TRAVERSAL' &&
  'node' in error

/**
 * Helper function to get filtered nodes based on scope query
 */
const getFilteredNodes = async (
  conf: LoadedConfig,
  graph: Graph | undefined,
): Promise<DepID[] | undefined> => {
  const queryString = conf.get('scope')
  /* c8 ignore next */
  if (!queryString || !graph) return undefined

  const hostContexts = await createHostContextsMap(conf)
  /* c8 ignore start */
  const securityArchive =
    Query.hasSecuritySelectors(queryString) ?
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
    hostContexts,
  })

  const { nodes: resultNodes } = await query.search(queryString, {
    signal: new AbortController().signal,
  })

  return resultNodes.map(node => node.id)
}

/**
 * Build command implementation. Runs any required "postinstall"
 * lifecycle scripts and binary linking.
 */
export const command: CommandFn = async (conf: LoadedConfig) => {
  const { options, projectRoot } = conf
  const sub = conf.positionals[0]

  try {
    // Handle skip subcommand
    if (sub === 'skip') {
      // For skip, we need to load the graph to potentially filter by scope
      let queryFilteredNodes: DepID[] | undefined

      if (conf.get('scope')) {
        const modifiers = GraphModifier.maybeLoad(options)
        const mainManifest =
          options.packageJson.maybeRead(projectRoot)
        let graph: Graph | undefined

        if (mainManifest) {
          graph = actual.load({
            ...options,
            mainManifest,
            modifiers,
            monorepo: options.monorepo,
            loadManifests: false,
          })
        }

        queryFilteredNodes = await getFilteredNodes(conf, graph)
      }

      await skip({
        ...options,
        projectRoot,
        packageJson: options.packageJson,
        monorepo: options.monorepo,
        scurry: options.scurry,
        queryFilteredNodes,
      })

      return { success: true }
    }

    // Handle default build command
    let queryFilteredNodes: DepID[] | undefined

    if (conf.get('scope')) {
      const modifiers = GraphModifier.maybeLoad(options)
      const mainManifest = options.packageJson.maybeRead(projectRoot)
      let graph: Graph | undefined

      if (mainManifest) {
        graph = actual.load({
          ...options,
          mainManifest,
          modifiers,
          monorepo: options.monorepo,
          loadManifests: false,
        })
      }

      queryFilteredNodes = await getFilteredNodes(conf, graph)
    }

    // Run the build process using the graph build function
    await build({
      ...options,
      projectRoot,
      packageJson: options.packageJson,
      monorepo: options.monorepo,
      scurry: options.scurry,
      queryFilteredNodes,
    })

    return { success: true }
  } catch (cause) {
    let errorMsg = sub === 'skip' ? 'Skip failed' : 'Build failed'
    const graphRunError =
      isErrorWithCause(cause) && isGraphRunError(cause.cause) ?
        cause.cause
      : undefined
    if (graphRunError?.code === 'GRAPHRUN_TRAVERSAL') {
      errorMsg +=
        ':\n  Failed to build package: ' +
        `${graphRunError.node.name}@${graphRunError.node.version}`
    }
    throw error(errorMsg, { cause })
  }
}
