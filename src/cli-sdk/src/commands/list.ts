import type {
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
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { startGUI } from '../start-gui.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'ls',
    usage: [
      '',
      '[query | specs] [--view=human | json | mermaid | gui]',
    ],
    description: `List installed dependencies matching given package names or resulting
      packages from matching a given Dependency Selector Syntax query if one
      is provided.

      The vlt Dependency Selector Syntax is a CSS-like query language that
      allows you to filter installed dependencies using a variety of metadata
      in the form of CSS-like attributes, pseudo selectors & combinators.

      Defaults to listing direct dependencies of a project and any configured
      workspace.`,
    examples: {
      '': {
        description:
          'List direct dependencies of the current project / workspace',
      },
      '"*"': {
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
      [`'*:workspace > *:peer'`]: {
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
      '/explore?query=' + encodeURIComponent(queryString),
    )
  },
} as const satisfies Views<ListResult>

export const command: CommandFn<ListResult> = async conf => {
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
  const securityArchive =
    Query.hasSecuritySelectors(queryString) ?
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

  return {
    importers,
    edges,
    nodes,
    queryString: queryString || defaultQueryString,
    highlightSelection: !!queryString,
  }
}
