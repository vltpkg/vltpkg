import {
  actual,
  humanReadableOutput,
  jsonOutput,
  mermaidOutput,
  Node,
} from '@vltpkg/graph'
import { LoadedConfig } from '../config/index.js'
import { Query } from '@vltpkg/query'
import chalk from 'chalk'

export const usage = `Usage:
  vlt ls
  vlt ls <query> --view=[human | json | mermaid]

List installed dependencies matching the provided query.
Defaults to listing direct dependencies of a project and
any configured workspace.

Examples:

  vlt ls
          List direct dependencies of the current project / workspace
  vlt ls *
          List all dependencies for the current project / workspace
  vlt ls foo bar baz
          List all dependencies named 'foo', 'bar', or 'baz'
  vlt ls '[name="@scoped/package"] > *'
          Lists direct dependencies of a specific package
  vlt ls '*.workspace > *.peer'
          List all peer dependencies of all workspaces

Options:

  --view=[human | json | mermaid]
          Output format. Defaults to human-readable or json if no tty.
`

export const command = async (conf: LoadedConfig) => {
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
    .map(k => (/^[@\w-]/.test(k) ? `#${k}` : k))
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
    importers.add(graph.mainImporter)
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
