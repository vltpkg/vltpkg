import { fileURLToPath } from 'node:url'
import {
  actual,
  humanReadableOutput,
  jsonOutput,
  mermaidOutput,
  Node,
} from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import chalk from 'chalk'
import { LoadedConfig } from '../config/index.js'
import { startGUI } from '../start-gui.js'
import { commandUsage } from '../config/usage.js'
import { CliCommand } from '../types.js'

export const usage: CliCommand['usage'] = () =>
  commandUsage({
    command: 'ls',
    usage: ['', '<query> --view=[human | json | mermaid | gui]'],
    description: `List installed dependencies matching the provided query.
                  Defaults to listing direct dependencies of a project and
                  any configured workspace.`,
    examples: {
      '': {
        description:
          'List direct dependencies of the current project / workspace',
      },
      '*': {
        description:
          'List all dependencies for the current project / workspace',
      },
      'foo bar baz': {
        description: `List all dependencies named 'foo', 'bar', or 'baz'`,
      },
      [`'[name="@scoped/package"] > *'`]: {
        description:
          'Lists direct dependencies of a specific package',
      },
      [`'*.workspace > *.peer'`]: {
        description: 'List all peer dependencies of all workspaces',
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

export const command = async (
  conf: LoadedConfig,
  _opts: unknown,
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

  const queryString = conf.positionals
    .map(k => (/^[@\w-]/.test(k) ? `#${k.replace(/\//, '\\/')}` : k))
    .join(', ')
  const query = new Query({ graph })
  const projectQueryString = ':project, :project > *'
  const selectImporters: string[] = []

  const importers = new Set<Node>()
  if (monorepo) {
    for (const workspace of monorepo.filter(conf.values)) {
      const w: Node | undefined = graph.nodes.get(workspace.id)
      if (w) {
        importers.add(w)
        selectImporters.push(`[name="${w.name}"]`)
        selectImporters.push(`[name="${w.name}"] > *`)
      }
    }
  }
  if (importers.size === 0) {
    for (const importer of graph.importers) {
      importers.add(importer)
    }
  }

  const selectImportersQueryString = selectImporters.join(', ')
  const defaultQueryString =
    (
      selectImporters.length &&
      selectImporters.length < graph.importers.size
    ) ?
      selectImportersQueryString
    : projectQueryString
  const { edges, nodes } = await query.search(
    queryString || defaultQueryString,
  )

  if (conf.values.view === 'gui') {
    return startGUI({
      assetsDir,
      conf,
      startingRoute:
        '/explore?query=' +
        encodeURIComponent(queryString || defaultQueryString),
    })
  }

  const colors = conf.values.color ? chalk : undefined

  const result =
    (
      conf.values.view === 'json' ||
      /* c8 ignore next */
      (!conf.values.view && !process.stdout.isTTY)
    ) ?
      jsonOutput({ edges, nodes })
    : conf.values.view === 'mermaid' ?
      mermaidOutput({ importers, edges, nodes })
    : humanReadableOutput({
        colors,
        importers,
        edges,
        nodes,
        highlightSelection: !!queryString,
      })

  console.log(result)
}
