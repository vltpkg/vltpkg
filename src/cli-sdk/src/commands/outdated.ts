import { actual, GraphModifier } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { pickManifest } from '@vltpkg/pick-manifest'
import { gt, rsort, stable } from '@vltpkg/semver'
import { commandUsage } from '../config/usage.ts'
import { assertVltInstalled } from '../is-vlt-installed.ts'
import type { Edge, Graph, Node } from '@vltpkg/graph'
import type { DependencyTypeShort, Packument } from '@vltpkg/types'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'outdated',
    usage: [
      '',
      '[package-names...]',
      '[--workspace=<path>] [--view=human | json | count]',
    ],
    description: `List direct dependencies that have newer versions available.

      For every registry dependency of the project root and its
      workspaces, compare the installed version against the highest
      version that satisfies the range in \`package.json\` (wanted) and
      against the registry's \`latest\` dist-tag (latest). Only
      dependencies that are missing or behind on either count are
      reported.

      Package names given as positional arguments restrict the report
      to those dependencies. The --workspace and --workspace-group
      options restrict it to the given workspaces.

      The installed versions come from the graph built by
      \`vlt install\`, so the project must be installed by vlt first.

      Dependencies that do not resolve against a registry (git, file,
      remote tarball or workspace specs) are not checked. Catalog
      specs are checked against the range the catalog resolves them
      to.`,
    examples: {
      '': {
        description:
          'Report outdated dependencies of the project and all its workspaces',
      },
      'react react-dom': {
        description: `Only check the dependencies named 'react' and 'react-dom'`,
      },
      '--workspace=packages/app': {
        description:
          'Only check the dependencies of a single workspace',
      },
      '--view=json': {
        description: 'Print the report as JSON',
      },
    },
    options: {
      workspace: {
        value: '<path>',
        description:
          'Limit the report to the dependencies of the given workspace(s).',
      },
      'workspace-group': {
        value: '<name>',
        description:
          'Limit the report to the dependencies of the workspaces in the given group(s).',
      },
      view: {
        value: '[human | json | count]',
        description:
          'Output format. Defaults to human-readable or json if no tty. Count outputs the number of outdated dependencies.',
      },
    },
  })

/**
 * One dependency that is missing, behind its wanted version, or behind
 * the latest published version.
 */
export type OutdatedEntry = {
  /** The dependency name as it appears in the dependent's manifest */
  name: string
  /** The declared spec, for example `^1.2.3` */
  spec: string
  /** The dependency type in the dependent's manifest */
  type: DependencyTypeShort
  /** The installed version, absent when the dependency is missing */
  current?: string
  /**
   * The highest published version that satisfies the declared spec,
   * i.e. the version that `vlt install` would pick. Absent when no
   * published version satisfies the spec.
   */
  wanted?: string
  /** The version the registry points its `latest` dist-tag at */
  latest?: string
  /** The name of the importer (project root or workspace) depending on it */
  dependent: string
  /** The importer's location relative to the project root */
  location: string
}

export type OutdatedResult = OutdatedEntry[]

const missingVersion = (version?: string) => version ?? 'missing'

type Column = { title: string; cells: string[] }

/**
 * Lay out columns of cells as a text table, each column padded to its
 * widest cell and separated from the next by two spaces.
 */
const formatTable = (columns: Column[]): string => {
  const lines: string[] = []
  for (const { title, cells } of columns) {
    const width = Math.max(title.length, ...cells.map(c => c.length))
    const column = [title, ...cells].map(cell => cell.padEnd(width))
    column.forEach((cell, i) => {
      const line = lines[i]
      lines[i] = line === undefined ? cell : `${line}  ${cell}`
    })
  }
  // the last column carries no trailing padding
  return lines.map(line => line.trimEnd()).join('\n')
}

export const views = {
  json: result => result,
  count: result => result.length,
  human: result => {
    if (result.length === 0) {
      return 'All dependencies are up to date.'
    }
    const columns: Column[] = [
      { title: 'Package', cells: result.map(e => e.name) },
      {
        title: 'Current',
        cells: result.map(e => missingVersion(e.current)),
      },
      {
        title: 'Wanted',
        cells: result.map(e => missingVersion(e.wanted)),
      },
      {
        title: 'Latest',
        cells: result.map(e => missingVersion(e.latest)),
      },
      { title: 'Type', cells: result.map(e => e.type) },
    ]
    // the dependent column only earns its space when the entries do
    // not all belong to the same importer
    if (new Set(result.map(e => e.dependent)).size > 1) {
      columns.push({
        title: 'Dependent',
        cells: result.map(e => e.dependent),
      })
    }
    return formatTable(columns)
  },
} as const satisfies Views<OutdatedResult>

/**
 * The version a registry calls `latest`. Registries that have no
 * `latest` tag fall back to the highest stable published version.
 */
const latestVersion = (packument: Packument): string | undefined => {
  const tagged = packument['dist-tags'].latest
  if (tagged) return tagged
  const [highest] = rsort(stable(Object.keys(packument.versions)))
  return highest
}

/**
 * Pick the importers whose dependencies are reported. All importers by
 * default, or only the selected workspaces when `--workspace` or
 * `--workspace-group` is set in a monorepo.
 */
const selectImporters = (
  conf: LoadedConfig,
  graph: Graph,
): Node[] => {
  const { monorepo } = conf.options
  const selected =
    'workspace' in conf.values || 'workspace-group' in conf.values
  if (monorepo && selected) {
    const importers: Node[] = []
    for (const workspace of monorepo.filter(conf.values)) {
      const node = graph.nodes.get(workspace.id)
      /* c8 ignore next - every loaded workspace has a node */
      if (node) importers.push(node)
    }
    return importers
  }
  return [...graph.importers]
}

const isOutdated = ({ current, wanted, latest }: OutdatedEntry) =>
  !current ||
  (wanted !== undefined && wanted !== current) ||
  (latest !== undefined && gt(latest, current))

export const command: CommandFn<OutdatedResult> = async conf => {
  const { projectRoot, packageJson, monorepo } = conf.options
  assertVltInstalled(projectRoot, 'outdated')
  const mainManifest = packageJson.read(projectRoot)
  const graph = actual.load({
    ...conf.options,
    mainManifest,
    modifiers: GraphModifier.maybeLoad(conf.options),
    monorepo,
    loadManifests: true,
  })

  const names = new Set(conf.positionals)
  const pic = new PackageInfoClient(conf.options)
  // one packument request per registry package, however many
  // importers depend on it
  const packuments = new Map<string, Promise<Packument>>()
  const fetchPackument = (edge: Edge): Promise<Packument> => {
    // the final spec of a registry dependency always carries its
    // registry, so the key is unique per package per registry
    const { registry, name } = edge.spec.final
    const key = `${String(registry)}:${name}`
    let p = packuments.get(key)
    if (!p) {
      p = pic.packument(edge.spec)
      packuments.set(key, p)
    }
    return p
  }

  const checks: Promise<OutdatedEntry>[] = []
  for (const importer of selectImporters(conf, graph)) {
    for (const edge of importer.edgesOut.values()) {
      if (names.size > 0 && !names.has(edge.name)) continue
      if (edge.spec.final.type !== 'registry') continue
      checks.push(
        fetchPackument(edge).then(packument => ({
          name: edge.name,
          spec: edge.spec.bareSpec,
          type: edge.type,
          current: edge.to?.version,
          wanted: pickManifest(packument, edge.spec, conf.options)
            ?.version,
          latest: latestVersion(packument),
          dependent: importer.name,
          location: importer.location,
        })),
      )
    }
  }

  return (await Promise.all(checks)).filter(isOutdated)
}
