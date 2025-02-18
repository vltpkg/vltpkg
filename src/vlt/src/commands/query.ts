import {
  actual,
  humanReadableOutput,
  type HumanReadableOutputGraph,
  jsonOutput,
  type JSONOutputGraph,
  mermaidOutput,
  type MermaidOutputGraph,
  type Node,
} from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { commandUsage } from '../config/usage.ts'
import { type CommandFn, type CommandUsage } from '../index.ts'
import { startGUI } from '../start-gui.ts'
import { type Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'query',
    usage: ['', '<query> --view=[human | json | mermaid | gui]'],
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
    },
    options: {
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

export const views = {
  json: jsonOutput,
  mermaid: mermaidOutput,
  human: humanReadableOutput,
  gui: async ({ queryString }, _, conf) => {
    await startGUI({
      conf,
      startingRoute:
        '/explore?query=' + encodeURIComponent(queryString),
    })
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
  const query = new Query({ graph })
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

  return {
    importers,
    edges,
    nodes,
    highlightSelection: !!queryString,
    queryString: queryString || defaultQueryString,
  }
}
