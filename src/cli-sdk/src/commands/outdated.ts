import { styleText as utilStyleText } from 'node:util'
import { actual, GraphModifier } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Query } from '@vltpkg/query'
import { compare, satisfies } from '@vltpkg/semver'
import { hydrate, splitDepID } from '@vltpkg/dep-id'
import { commandUsage } from '../config/usage.ts'
import type { Graph, Node } from '@vltpkg/graph'
import type {
  QueryResponseEdge,
  QueryResponseNode,
} from '@vltpkg/query'
import type {
  DependencyTypeShort,
  EdgeLike,
  NodeLike,
  Packument,
} from '@vltpkg/types'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { ViewOptions, Views } from '../view.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'outdated',
    usage: ['', '[package-names...]', '[<query>]'],
    description: `Display a table of installed dependencies that have newer
      versions available in the registry.

      Under the hood this uses the vlt Dependency Selector Syntax (the same
      engine that powers \`vlt query\`) with the \`:outdated\` pseudo-selector.
      A registry request is made for each candidate package to determine the
      "wanted" (highest version matching the declared range) and "latest"
      (the \`latest\` dist-tag) versions.

      Provide package names as positional arguments to limit the report to
      those packages. Alternatively, pass a DSS query selector to scope the
      report to an arbitrary subset of the dependency graph.

      Defaults to checking every dependency of the project and its
      workspaces.`,
    examples: {
      '': {
        description: 'Show all outdated dependencies',
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
 * A single outdated dependency relationship.
 */
export type OutdatedReport = {
  /** The package name. */
  name: string
  /** The currently installed version. */
  current?: string
  /**
   * The highest version that satisfies the declared dependency range,
   * i.e. the version an install would upgrade to.
   */
  wanted?: string
  /** The version tagged as `latest` in the registry. */
  latest?: string
  /** The kind of dependency (prod, dev, peer, optional). */
  type: DependencyTypeShort
  /** The name of the package/workspace that depends on it. */
  dependedBy: string
  /** The location of the installed package on disk. */
  location?: string
}

export type OutdatedResult = {
  reports: OutdatedReport[]
}

/**
 * Splits a version string into its dot-separated segments, treating the
 * prerelease/build portion as the trailing segment(s).
 */
const versionSegments = (version: string): string[] =>
  version.split('.')

/**
 * Highlights the portion of `to` that differs from `from`, choosing a
 * color based on which segment first changed:
 * major -> red, minor -> cyan, patch (or lower) -> green.
 */
const highlightDiff = (
  from: string | undefined,
  to: string,
  paint: (
    style: Parameters<typeof utilStyleText>[0],
    s: string,
  ) => string,
): string => {
  if (!from) return to
  const f = versionSegments(from)
  const t = versionSegments(to)
  let i = 0
  while (i < t.length && f[i] === t[i]) i++
  // no difference detected
  if (i >= t.length) return to
  const unchanged = t.slice(0, i).join('.')
  const changed = t.slice(i).join('.')
  const style: Parameters<typeof utilStyleText>[0] =
    i === 0 ? 'red'
    : i === 1 ? 'cyan'
    : 'green'
  return `${unchanged}${unchanged ? '.' : ''}${paint(style, changed)}`
}

/**
 * Returns the highest version in `versions` that satisfies `range`. When
 * no range is available or nothing matches, returns `undefined`.
 */
export const highestSatisfying = (
  versions: string[],
  range: string | undefined,
): string | undefined => {
  if (!range) return undefined
  return versions
    .filter(v => satisfies(v, range))
    .sort(compare)
    .pop()
}

/**
 * Returns true when `to` has a greater major version than `from`.
 */
const majorBump = (from: string, to: string): boolean => {
  const f = Number(versionSegments(from)[0])
  const t = Number(versionSegments(to)[0])
  return Number.isFinite(f) && Number.isFinite(t) && t > f
}

const dependencyTypeLabel: Record<DependencyTypeShort, string> = {
  prod: 'dependencies',
  dev: 'devDependencies',
  optional: 'optionalDependencies',
  peer: 'peerDependencies',
  peerOptional: 'peerDependencies',
}

const renderHuman = (
  result: OutdatedResult,
  { colors }: ViewOptions,
): string => {
  const paint = (
    style: Parameters<typeof utilStyleText>[0],
    s: string,
  ) =>
    colors ? utilStyleText(style, s, { validateStream: false }) : s

  const { reports } = result
  if (reports.length === 0) {
    return paint('green', 'All dependencies are up to date.')
  }

  const rows = [...reports].sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'en') ||
      a.dependedBy.localeCompare(b.dependedBy, 'en'),
  )

  type Column = {
    header: string
    // raw (uncolored) text used for width calculation
    raw: (r: OutdatedReport) => string
    // colored text rendered into the cell
    render: (r: OutdatedReport) => string
  }

  const columns: Column[] = [
    {
      header: 'Package',
      raw: r => r.name,
      render: r =>
        paint(
          r.current && r.latest && majorBump(r.current, r.latest) ?
            'red'
          : 'yellow',
          r.name,
        ),
    },
    {
      header: 'Current',
      raw: r => r.current ?? 'MISSING',
      render: r => paint('dim', r.current ?? 'MISSING'),
    },
    {
      header: 'Wanted',
      raw: r => r.wanted ?? r.current ?? '-',
      render: r =>
        r.wanted ?
          highlightDiff(r.current, r.wanted, paint)
        : paint('dim', r.current ?? '-'),
    },
    {
      header: 'Latest',
      raw: r => r.latest ?? '-',
      render: r =>
        r.latest ?
          highlightDiff(r.current, r.latest, paint)
        : paint('dim', '-'),
    },
    {
      header: 'Type',
      raw: r => dependencyTypeLabel[r.type],
      render: r => paint('dim', dependencyTypeLabel[r.type]),
    },
    {
      header: 'Depended By',
      raw: r => r.dependedBy,
      render: r => r.dependedBy,
    },
  ]

  const widths = columns.map(col =>
    Math.max(col.header.length, ...rows.map(r => col.raw(r).length)),
  )

  const pad = (text: string, rawLen: number, width: number): string =>
    text + ' '.repeat(Math.max(0, width - rawLen))

  const lines: string[] = []

  lines.push(
    columns
      .map((col, i) =>
        pad(
          paint('bold', paint('underline', col.header)),
          col.header.length,
          widths[i] ?? 0,
        ),
      )
      .join('  ')
      .trimEnd(),
  )

  for (const r of rows) {
    lines.push(
      columns
        .map((col, i) =>
          pad(col.render(r), col.raw(r).length, widths[i] ?? 0),
        )
        .join('  ')
        .trimEnd(),
    )
  }

  lines.push('')
  lines.push(
    paint(
      'dim',
      `${rows.length} outdated ${
        rows.length === 1 ? 'package' : 'packages'
      } found.`,
    ),
  )

  return lines.join('\n')
}

export const views = {
  human: renderHuman,
  json: (result: OutdatedResult) => result.reports,
} as const satisfies Views<OutdatedResult>

export const command: CommandFn<OutdatedResult> = async conf => {
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

  // Without a graph there's nothing installed to compare against.
  if (!graph) {
    return { reports: [] }
  }

  // Determine which nodes to treat as top-level importers, mirroring the
  // behavior of the `query` and `list` commands.
  const importers = new Set<Node>()
  if ('workspace' in conf.values && monorepo) {
    for (const workspace of monorepo.filter(conf.values)) {
      const w = graph.nodes.get(workspace.id)
      if (w) importers.add(w)
    }
  }

  // Build the query string: an optional user-provided scope combined with
  // the `:outdated` pseudo-selector.
  const positionals = conf.positionals
  const base =
    positionals.length ?
      positionals.map(k => `#${k.replace(/\//g, '\\/')}`).join(', ')
    : '*'
  const queryString = base
    .split(',')
    .map(part => `${part.trim()}:outdated`)
    .join(', ')

  const q = new Query({
    nodes: new Set<NodeLike>(graph.nodes.values()),
    edges: new Set<EdgeLike>(graph.edges),
    importers:
      importers.size ?
        new Set<NodeLike>(importers)
      : new Set<NodeLike>(graph.importers),
    securityArchive: undefined,
  })
  const { edges, nodes } = await q.search(queryString, {
    signal: new AbortController().signal,
  })

  const resultNodes = new Set<QueryResponseNode>(nodes)
  const pic = new PackageInfoClient(conf.options)
  const packumentCache = new Map<
    string,
    Promise<Packument | undefined>
  >()

  const fetchPackument = async (
    node: QueryResponseNode,
    name: string,
  ): Promise<Packument | undefined> => {
    const cached = packumentCache.get(node.id)
    if (cached) return cached
    const spec = hydrate(node.id, name, conf.options)
    const promise = pic
      .packument(spec)
      // A missing packument (e.g. 404) shouldn't fail the whole report.
      .catch(() => undefined)
    packumentCache.set(node.id, promise)
    return promise
  }

  const reports = await Promise.all(
    edges
      .filter(
        (
          edge,
        ): edge is QueryResponseEdge & { to: QueryResponseNode } =>
          !!edge.to &&
          resultNodes.has(edge.to) &&
          !edge.to.importer &&
          splitDepID(edge.to.id)[0] === 'registry',
      )
      .map(async (edge): Promise<OutdatedReport> => {
        const node = edge.to
        const name = node.name ?? edge.name
        const packument = await fetchPackument(node, name)
        const versions =
          packument ? Object.keys(packument.versions) : []
        const range = edge.spec.final.range
        const wanted = highestSatisfying(
          versions,
          range ? String(range) : undefined,
        )
        const latest = packument?.['dist-tags'].latest
        return {
          name,
          current: node.version ?? undefined,
          wanted,
          latest,
          type: edge.type,
          dependedBy: edge.from.name ?? edge.from.id,
          location: node.location,
        }
      }),
  )

  return { reports }
}
