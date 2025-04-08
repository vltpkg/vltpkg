import type {
  EdgeLike,
  HumanReadableOutputGraph,
  JSONOutputGraph,
  MermaidOutputGraph,
  Node,
} from '@vltpkg/graph'
import {
  actual,
  humanReadableOutput,
  jsonOutput,
  mermaidOutput,
} from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { startGUI } from '../start-gui.ts'
import type { Views } from '../view.ts'
import type { LoadedConfig } from '../config/index.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'query',
    usage: [
      '',
      '<query> --view=[human | json | mermaid | gui]',
      '<query> --expect-results=[number | string]',
    ],
    description:
      'List installed dependencies matching the provided query.',
    examples: {
      [`'#foo'`]: {
        description: 'Query packages with the name "foo"',
      },
      [`'*.workspace > *.peer'`]: {
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
    },
    options: {
      'expect-results': {
        value: '[number | string]',
        description:
          'Sets an expected number of resulting items. Errors if the number of resulting items does not match the set value. Accepts a specific numeric value, "true" (same as "> 0"), "false" (same as 0) or a string value starting with either ">", "<", ">=" or "<=" followed by a numeric value to be compared.',
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
      '/explore?query=' + encodeURIComponent(queryString),
    )
  },
} as const satisfies Views<QueryResult>

export const command: CommandFn<QueryResult> = async conf => {
  const monorepo = conf.options.monorepo
  const mainManifest = conf.options.packageJson.read(
    conf.options.projectRoot,
  )
  const graph = actual.load({
    ...conf.options,
    mainManifest,
    monorepo,
    loadManifests: true,
  })

  const defaultQueryString = '*'
  const queryString = conf.positionals[0]
  const securityArchive =
    queryString && Query.hasSecuritySelectors(queryString) ?
      await SecurityArchive.start({
        graph,
        specOptions: conf.options,
      })
    : undefined
  const query = new Query({
    graph,
    specOptions: conf.options,
    securityArchive,
  })

  const { edges, nodes } = await query.search(
    queryString || defaultQueryString,
  )

  const importers = new Set<Node>()
  if (monorepo) {
    for (const workspace of monorepo.filter(conf.values)) {
      const w: Node | undefined = graph.nodes.get(workspace.id)
      if (w) importers.add(w)
    }
  }
  if (importers.size === 0) {
    for (const importer of graph.importers) {
      importers.add(importer)
    }
  }

  if (!validateExpectedResult(conf, edges)) {
    throw error('Unexpected number of items', {
      found: edges.length,
      wanted: conf.values['expect-results'],
    })
  }

  return {
    importers,
    edges,
    nodes,
    highlightSelection: !!queryString,
    queryString: queryString || defaultQueryString,
  }
}
