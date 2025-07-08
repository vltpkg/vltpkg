import type {
  HumanReadableOutputGraph,
  JSONOutputGraph,
  MermaidOutputGraph,
  Node,
} from '@vltpkg/graph'
import {
  actual,
  asNode,
  humanReadableOutput,
  jsonOutput,
  mermaidOutput,
  GraphModifier,
} from '@vltpkg/graph'
import LZString from 'lz-string'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { startGUI } from '../start-gui.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'ls',
    usage: [
      '',
      '[package-names...] [--view=human | json | mermaid | gui]',
      '[--scope=<query>] [--target=<query>] [--view=human | json | mermaid | gui]',
    ],
    description: `List installed dependencies matching given package names or query selectors.

      Package names provided as positional arguments will be used to filter
      the results to show only dependencies with those names.

      The --scope and --target options accepts DSS query selectors to filter
      packages. Using --scope, you can specify which packages to treat as the
      top-level items in the output graph. The --target option allows you to
      filter what dependencies to include in the output. Using both options
      allows you to render subgraphs of the dependency graph.

      Defaults to listing direct dependencies of a project and any configured
      workspace.`,
    examples: {
      '': {
        description:
          'List direct dependencies of the current project / workspace',
      },
      'foo bar baz': {
        description: `List all dependencies named 'foo', 'bar', or 'baz'`,
      },
      '--scope=":root > #dependency-name"': {
        description:
          'Defines a direct dependency as the output top-level scope',
      },
      '--target="*"': {
        description: 'List all dependencies using a query selector',
      },
      '--target=":workspace > *:peer"': {
        description: 'List all peer dependencies of all workspaces',
      },
    },
    options: {
      scope: {
        value: '<query>',
        description:
          'Query selector to select top-level packages using the DSS query language syntax.',
      },
      target: {
        value: '<query>',
        description:
          'Query selector to filter packages using the DSS query language syntax.',
      },
      view: {
        value: '[human | json | mermaid | gui]',
        description:
          'Output format. Defaults to human-readable or json if no tty.',
      },
    },
  })

export type ListResult = JSONOutputGraph &
  MermaidOutputGraph &
  HumanReadableOutputGraph & { queryString: string }

export const views = {
  json: jsonOutput,
  mermaid: mermaidOutput,
  human: humanReadableOutput,
  gui: async ({ queryString }, _, conf) => {
    await startGUI(
      conf,
      `/explore/${LZString.compressToEncodedURIComponent(queryString)}/overview`,
    )
  },
} as const satisfies Views<ListResult>

export const command: CommandFn<ListResult> = async conf => {
  const modifiers = GraphModifier.maybeLoad(conf.options)
  const monorepo = conf.options.monorepo
  const mainManifest = conf.options.packageJson.read(
    conf.options.projectRoot,
  )
  const graph = actual.load({
    ...conf.options,
    mainManifest,
    modifiers,
    monorepo,
    loadManifests: true,
  })

  // Validate positional arguments - only allow package names, not direct queries
  for (const arg of conf.positionals) {
    if (!/^[@\w-]/.test(arg)) {
      throw error(
        `Direct queries are not supported as positional arguments. Use package names only.`,
        {
          code: 'EUSAGE',
          cause: `Argument '${arg}' appears to be a query syntax. Only package names are allowed as positional arguments.`,
        },
      )
    }
  }

  const positionalQueryString = conf.positionals
    .map(k => `#${k.replace(/\//, '\\/')}`)
    .join(', ')
  const targetQueryString = conf.get('target')
  const queryString = targetQueryString || positionalQueryString

  const securityArchive = await SecurityArchive.start({
    graph,
    specOptions: conf.options,
  })
  const query = new Query({
    graph,
    specOptions: conf.options,
    securityArchive,
  })
  const projectQueryString = ':project, :project > *'
  const selectImporters: string[] = []

  const importers = new Set<Node>()
  const scopeIDs: DepID[] = []

  // handle --scope option to add scope nodes as importers
  const scopeQueryString = conf.get('scope')
  let scopeNodes
  if (scopeQueryString) {
    // run scope query to get all matching nodes
    const scopeQuery = new Query({
      graph,
      specOptions: conf.options,
      securityArchive,
    })
    const { nodes } = await scopeQuery.search(scopeQueryString, {
      signal: new AbortController().signal,
    })
    scopeNodes = nodes
  }

  if (scopeQueryString && scopeNodes) {
    // Add all scope nodes to importers Set (treat them as top-level items)
    for (const queryNode of scopeNodes) {
      importers.add(asNode(queryNode))
    }
  } else {
    // if in a workspace environment, select only the specified
    // workspaces as top-level items
    if (monorepo) {
      for (const workspace of monorepo.filter(conf.values)) {
        const w: Node | undefined = graph.nodes.get(workspace.id)
        if (w) {
          importers.add(w)
          selectImporters.push(`[name="${w.name}"]`)
          selectImporters.push(`[name="${w.name}"] > *`)
          scopeIDs.push(workspace.id)
        }
      }
    }
    // if no top-level item was set then by default
    // we just set all importers as top-level items
    if (importers.size === 0) {
      for (const importer of graph.importers) {
        importers.add(importer)
      }
    }
  }

  // build a default query string to use in the target search
  const selectImportersQueryString = selectImporters.join(', ')
  const defaultQueryString =
    (
      selectImporters.length &&
      selectImporters.length < graph.importers.size
    ) ?
      selectImportersQueryString
    : projectQueryString

  // retrieve the selected nodes and edges
  const { edges, nodes } = await query.search(
    queryString || defaultQueryString,
    {
      signal: new AbortController().signal,
      scopeIDs: scopeIDs.length > 0 ? scopeIDs : undefined,
    },
  )

  return {
    importers,
    edges,
    nodes,
    queryString: queryString || defaultQueryString,
    highlightSelection: !!(
      targetQueryString || positionalQueryString
    ),
  }
}
