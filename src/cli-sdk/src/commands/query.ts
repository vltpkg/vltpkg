import {
  actual,
  asNode,
  humanReadableOutput,
  jsonOutput,
  mermaidOutput,
  GraphModifier,
} from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import LZString from 'lz-string'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { startGUI } from '../start-gui.ts'
import { commandUsage } from '../config/usage.ts'
import { createHostContextsMap } from '../query-host-contexts.ts'
import type {
  HumanReadableOutputGraph,
  JSONOutputGraph,
  MermaidOutputGraph,
  Node,
  Graph,
} from '@vltpkg/graph'
import type { DepID } from '@vltpkg/dep-id'
import type { EdgeLike, NodeLike } from '@vltpkg/types'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import type { LoadedConfig } from '../config/index.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'query',
    usage: [
      '',
      '<query> --view=<human | json | mermaid | gui>',
      '<query> --expect-results=<comparison string>',
      '--target=<query> --view=<human | json | mermaid | gui>',
    ],
    description: `List installed dependencies matching the provided query.

      The vlt Dependency Selector Syntax is a CSS-like query language that
      allows you to filter installed dependencies using a variety of metadata
      in the form of CSS-like attributes, pseudo selectors & combinators.

      The --scope and --target options accepts DSS query selectors to filter
      packages. Using --scope, you can specify which packages to treat as the
      top-level items in the output graph. The --target option can be used as
      an alternative to positional arguments, it allows you to filter what
      dependencies to include in the output. Using both options allows you to
      render subgraphs of the dependency graph.

      Defaults to listing all dependencies of the project root and workspaces.`,

    examples: {
      [`'#foo'`]: {
        description: 'Query dependencies declared as "foo"',
      },
      [`'*:workspace > *:peer'`]: {
        description: 'Query all peer dependencies of workspaces',
      },
      [`':project > *:attr(scripts, [build])'`]: {
        description:
          'Query all direct project dependencies with a "build" script',
      },
      [`'[name^="@vltpkg"]'`]: {
        description:
          'Query packages with names starting with "@vltpkg"',
      },
      [`'*:license(copyleft) --expect-results=0'`]: {
        description: 'Errors if a copyleft licensed package is found',
      },
      '--scope=":root > #dependency-name"': {
        description:
          'Defines a direct dependency as the output top-level scope',
      },
      [`'--target="*"'`]: {
        description: 'Query all dependencies using the target option',
      },
      [`'--target=":workspace > *:peer"'`]: {
        description:
          'Query all peer dependencies of workspaces using target option',
      },
    },
    options: {
      'expect-results': {
        value: '[number | string]',
        description:
          'Sets an expected number of resulting items. Errors if the number of resulting items does not match the set value. Accepts a specific numeric value or a string value starting with either ">", "<", ">=" or "<=" followed by a numeric value to be compared.',
      },
      scope: {
        value: '<query>',
        description:
          'Query selector to select top-level packages using the DSS query language syntax.',
      },
      target: {
        value: '<query>',
        description:
          'Query selector to filter packages using DSS syntax.',
      },
      view: {
        value: '[human | json | mermaid | gui]',
        description:
          'Output format. Defaults to human-readable or json if no tty.',
      },
    },
  })

type QueryResult = JSONOutputGraph &
  MermaidOutputGraph &
  HumanReadableOutputGraph & { queryString: string }

const validateExpectedResult = (
  conf: LoadedConfig,
  edges: EdgeLike[],
): boolean => {
  const expectResults = conf.values['expect-results']
  if (expectResults?.startsWith('>=')) {
    return edges.length >= parseInt(expectResults.slice(2).trim(), 10)
  } else if (expectResults?.startsWith('<=')) {
    return edges.length <= parseInt(expectResults.slice(2).trim(), 10)
  } else if (expectResults?.startsWith('>')) {
    return edges.length > parseInt(expectResults.slice(1).trim(), 10)
  } else if (expectResults?.startsWith('<')) {
    return edges.length < parseInt(expectResults.slice(1).trim(), 10)
  } else if (expectResults) {
    return edges.length === parseInt(expectResults.trim(), 10)
  }
  return true
}

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
} as const satisfies Views<QueryResult>

export const command: CommandFn<QueryResult> = async conf => {
  const modifiers = GraphModifier.maybeLoad(conf.options)
  const monorepo = conf.options.monorepo
  const mainManifest = conf.options.packageJson.maybeRead(
    conf.options.projectRoot,
  )
  let graph: Graph | undefined
  let securityArchive: SecurityArchive | undefined

  // optionally load the cwd graph if we found a package.json file
  if (mainManifest) {
    graph = actual.load({
      ...conf.options,
      mainManifest,
      modifiers,
      monorepo,
      loadManifests: true,
    })
    securityArchive = await SecurityArchive.start({
      nodes: [...graph.nodes.values()],
    })
  }

  // retrieve default values and set up host contexts
  const defaultProjectQueryString = '*'
  const defaultLocalScopeQueryString = ':host(local) *'
  const positionalQueryString = conf.positionals[0]
  const targetQueryString = conf.get('target')
  const scopeQueryString = conf.get('scope')
  const queryString = targetQueryString || positionalQueryString
  const hostContexts = await createHostContextsMap(conf)
  const importers = new Set<Node>()
  const scopeIDs: DepID[] = []

  // Handle --scope option to add scope nodes as importers
  let scopeNodes
  if (scopeQueryString) {
    // Run scope query to get all matching nodes
    /* c8 ignore start */
    const edges = graph?.edges ?? new Set()
    const nodes =
      graph?.nodes ?
        new Set<NodeLike>(graph.nodes.values())
      : new Set<NodeLike>()
    const importers = graph?.importers ?? new Set()
    /* c8 ignore stop */
    const scopeQuery = new Query({
      edges,
      nodes,
      importers,
      securityArchive,
      hostContexts,
    })
    const { nodes: resultNodes } = await scopeQuery.search(
      scopeQueryString,
      {
        signal: new AbortController().signal,
      },
    )
    scopeNodes = resultNodes
  }

  if (scopeQueryString && scopeNodes) {
    // Add all scope nodes to importers Set (treat them as top-level items)
    for (const queryNode of scopeNodes) {
      importers.add(asNode(queryNode))
    }
  } else if ('workspace' in conf.values) {
    // if in a workspace environment, select only the specified
    // workspaces as top-level items
    if (monorepo && graph) {
      for (const workspace of monorepo.filter(conf.values)) {
        const w: Node | undefined = graph.nodes.get(workspace.id)
        if (w) {
          importers.add(w)
          scopeIDs.push(workspace.id)
        }
      }
    }
  }

  // retrieve the selected nodes and edges
  const edges_ = graph?.edges ?? new Set()
  const nodes_ =
    graph?.nodes ?
      new Set<NodeLike>(graph.nodes.values())
    : new Set<NodeLike>()
  const importers_ =
    importers.size === 0 && graph ?
      new Set([graph.mainImporter])
    : importers
  const q = new Query({
    edges: edges_,
    nodes: nodes_,
    importers: importers_,
    securityArchive,
    hostContexts,
  })
  const query =
    queryString ||
    (graph ? defaultProjectQueryString : defaultLocalScopeQueryString)
  const {
    edges,
    nodes,
    importers: queryResultImporters,
  } = await q.search(query, {
    signal: new AbortController().signal,
    scopeIDs: scopeIDs.length > 0 ? scopeIDs : undefined,
  })

  if (!validateExpectedResult(conf, edges)) {
    throw error('Unexpected number of items', {
      found: edges.length,
      wanted: conf.values['expect-results'],
    })
  }

  return {
    importers:
      importers.size === 0 ?
        new Set(queryResultImporters)
      : importers,
    edges,
    nodes,
    highlightSelection: !!(
      targetQueryString || positionalQueryString
    ),
    queryString:
      queryString ||
      (graph ?
        defaultProjectQueryString
      : defaultLocalScopeQueryString),
  }
}
