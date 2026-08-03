import { styleText as utilStyleText } from 'node:util'
import { actual, GraphModifier } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { normalizeFunding } from '@vltpkg/types'
import { commandUsage } from '../config/usage.ts'
import type { Graph } from '@vltpkg/graph'
import type { NodeLike, NormalizedFunding } from '@vltpkg/types'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { ViewOptions, Views } from '../view.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'fund',
    usage: ['', '[package-names...]', '[<query>]'],
    description: `Display a list of installed dependencies that declare
      funding information, along with the URLs where they can be funded.

      Under the hood this uses the vlt Dependency Selector Syntax (the same
      engine that powers \`vlt query\`) to collect installed dependencies,
      then reports the ones whose \`package.json\` includes a \`funding\`
      field.

      Provide package names as positional arguments to limit the report to
      those packages. Alternatively, pass a DSS query selector to scope the
      report to an arbitrary subset of the dependency graph.

      Defaults to checking every dependency of the project and its
      workspaces.`,
    examples: {
      '': {
        description: 'List all dependencies looking for funding',
      },
      'foo bar': {
        description: `Only check the 'foo' and 'bar' packages`,
      },
      ':root > *': {
        description:
          'Only check direct dependencies of the project root',
      },
      '--view=json': {
        description: 'Output the results as JSON',
      },
    },
    options: {
      view: {
        value: '[human | json]',
        description:
          'Output format. Defaults to human-readable or json if no tty.',
      },
    },
  })

/**
 * A single installed dependency that declares funding information.
 */
export type FundingReport = {
  /** The package name. */
  name: string
  /** The installed version, when known. */
  version?: string
  /** The normalized funding entries declared by the package. */
  funding: NormalizedFunding
}

export type FundResult = {
  reports: FundingReport[]
}

const renderHuman = (
  result: FundResult,
  { colors }: ViewOptions,
): string => {
  const paint = (
    style: Parameters<typeof utilStyleText>[0],
    s: string,
  ) =>
    colors ? utilStyleText(style, s, { validateStream: false }) : s

  const { reports } = result
  if (reports.length === 0) {
    return paint(
      'green',
      'No funding information found for any installed dependency.',
    )
  }

  // Group the packages by their funding URL so users can see, at a
  // glance, which link funds which set of dependencies.
  const byUrl = new Map<string, Set<string>>()
  for (const report of reports) {
    const label =
      report.version ?
        `${report.name}@${report.version}`
      : /* c8 ignore next */ report.name
    for (const entry of report.funding) {
      const packages = byUrl.get(entry.url)
      if (packages) {
        packages.add(label)
      } else {
        byUrl.set(entry.url, new Set([label]))
      }
    }
  }

  const lines: string[] = []
  lines.push(
    paint(
      'bold',
      `${reports.length} ${
        reports.length === 1 ? 'package is' : 'packages are'
      } looking for funding`,
    ),
  )
  lines.push('')

  const groups = [...byUrl.entries()].sort(([a], [b]) =>
    a.localeCompare(b, 'en'),
  )
  for (const [url, packages] of groups) {
    lines.push(paint('cyan', url))
    for (const pkg of [...packages].sort((a, b) =>
      a.localeCompare(b, 'en'),
    )) {
      lines.push(`  ${pkg}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

export const views = {
  human: renderHuman,
  json: (result: FundResult) => result.reports,
} as const satisfies Views<FundResult>

export const command: CommandFn<FundResult> = async conf => {
  const modifiers = GraphModifier.maybeLoad(conf.options)
  const monorepo = conf.options.monorepo
  const mainManifest = conf.options.packageJson.maybeRead(
    conf.options.projectRoot,
  )
  let graph: Graph | undefined

  if (mainManifest) {
    graph = actual.load({
      ...conf.options,
      mainManifest,
      modifiers,
      monorepo,
      loadManifests: true,
    })
  }

  // Without a graph there's nothing installed to inspect.
  if (!graph) {
    return { reports: [] }
  }

  // Build the query string: an optional set of package names, otherwise
  // every dependency in the graph.
  const positionals = conf.positionals
  const queryString =
    positionals.length ?
      positionals.map(k => `#${k.replace(/\//g, '\\/')}`).join(', ')
    : '*'

  const q = new Query({
    nodes: new Set<NodeLike>(graph.nodes.values()),
    edges: graph.edges,
    importers: graph.importers,
    securityArchive: undefined,
  })
  const { nodes } = await q.search(queryString, {
    signal: new AbortController().signal,
  })

  const reports: FundingReport[] = []
  for (const node of nodes) {
    // The project root and workspaces aren't the target of a fund report.
    if (node.importer) continue
    const funding = normalizeFunding(node.manifest?.funding)?.filter(
      entry => !!entry.url,
    )
    if (!funding?.length) continue
    reports.push({
      /* c8 ignore next 2 - installed deps always carry a name/version */
      name: node.name ?? node.id,
      version: node.version ?? undefined,
      funding,
    })
  }

  reports.sort((a, b) => a.name.localeCompare(b.name, 'en'))

  return { reports }
}
