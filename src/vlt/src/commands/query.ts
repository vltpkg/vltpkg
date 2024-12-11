import { fileURLToPath } from 'node:url'
import {
  actual,
  type EdgeLike,
  humanReadableOutput,
  jsonOutput,
  mermaidOutput,
  type Node,
  type NodeLike,
} from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { commandUsage } from '../config/usage.js'
import { type CliCommandUsage, type CliCommandFn } from '../types.js'
import { startGUI } from '../start-gui.js'

export const usage: CliCommandUsage = () =>
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

export const views = {
  json: { fn: jsonOutput },
  mermaid: { fn: mermaidOutput },
  human: { fn: humanReadableOutput },
}

export const defaultView = process.stdout.isTTY ? 'human' : 'json'

export type CommandResult = {
  importers: Set<Node>
  edges: EdgeLike[]
  nodes: NodeLike[]
  highlightSelection: boolean
}

export const command: CliCommandFn = async (
  conf,
  assetsDir: string = fileURLToPath(
    import.meta.resolve('@vltpkg/gui'),
  ),
) => {
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

  if (conf.values.view === 'gui') {
    await startGUI({
      assetsDir,
      conf,
      startingRoute:
        '/explore?query=' +
        encodeURIComponent(queryString || defaultQueryString),
    })
    return
  }

  return {
    result: {
      importers,
      edges,
      nodes,
      highlightSelection: !!queryString,
    },
  }
}
