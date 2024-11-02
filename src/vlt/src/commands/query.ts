import { fileURLToPath } from 'node:url'
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
import { startGUI } from '../start-gui.js'

export const usage = `Usage:
  vlt query
  vlt query <query> --view=[human | json | mermaid | gui]

List installed dependencies matching the provided query.

Examples:

  vlt query '#foo'
          Query packages with the name "foo"
  vlt query '*.workspace > *.peer'
          Query all peer dependencies of workspaces
  vlt query ':project > *:attr(scripts, [build])'
          Query all direct project dependencies with a "build" script
  vlt query '[name^="@vltpkg"]'
          Query packages with names starting with "@vltpkg"

Options:

  --view=[human | json | mermaid | gui]
          Output format. Defaults to human-readable or json if no tty.
`

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
