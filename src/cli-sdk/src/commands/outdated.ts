import { actual, Edge, GraphModifier } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { pickManifest } from '@vltpkg/pick-manifest'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { gt, parse, rsort, satisfies, stable } from '@vltpkg/semver'
import { commandUsage } from '../config/usage.ts'
import { assertVltInstalled } from '../is-vlt-installed.ts'
import { createGetAuthHeader } from '../query-auth.ts'
import { createHostContextsMap } from '../query-host-contexts.ts'
import { createStubNode } from '../stub-node.ts'
import type { Graph, Node } from '@vltpkg/graph'
import type { PackageAlert } from '@vltpkg/security-archive'
import type {
  DependencyTypeShort,
  Manifest,
  NodeLike,
  Packument,
} from '@vltpkg/types'
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
      '[--target=<query>] [--workspace=<path>]',
      '[--view=human | json | count]',
    ],
    description: `List dependencies that have newer versions available, and
      what is keeping them from being upgraded.

      For every registry dependency, compare the installed version
      against the highest version that satisfies the declared range
      (wanted) and against the registry's \`latest\` dist-tag (latest).
      Only dependencies that are missing or behind on either count are
      reported.

      Each report goes beyond the version numbers:

      - the size of the jump (major, minor, patch)
      - whether the installed version is deprecated
      - security scores and alerts for the installed, wanted and latest
        versions, so an upgrade that fixes a vulnerability or one that
        introduces a flagged version stands out
      - other dependents whose ranges hold the package back
      - engine and peer dependency requirements of the latest version
        that this project does not meet
      - the command that performs the upgrade

      By default the direct dependencies of the project root and its
      workspaces are checked; --workspace and --workspace-group narrow
      that to the given workspaces. The --target option accepts a DSS
      query selector instead, which can reach any dependency in the
      graph. Package names given as positional arguments filter either
      selection.

      The installed versions come from the graph built by
      \`vlt install\`, so the project must be installed by vlt first.
      Dependencies that do not resolve against a registry (git, file,
      remote tarball or workspace specs) are not checked. Catalog specs
      are checked against the range the catalog resolves them to.`,
    examples: {
      '': {
        description:
          'Report outdated direct dependencies of the project and all its workspaces',
      },
      'react react-dom': {
        description: `Only check the dependencies named 'react' and 'react-dom'`,
      },
      '--workspace=packages/app': {
        description:
          'Only check the dependencies of a single workspace',
      },
      '--target="*"': {
        description:
          'Check every dependency in the graph, transitive ones included',
      },
      '--target=":root > *:dev"': {
        description:
          'Only check the dev dependencies of the project root',
      },
      '--target="*:vuln"': {
        description:
          'Only check dependencies with known vulnerabilities',
      },
      '--view=json': {
        description: 'Print the report as JSON',
      },
    },
    options: {
      target: {
        value: '<query>',
        description:
          'DSS query selector choosing the dependencies to check, in place of the direct dependencies of the selected importers.',
      },
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

/** How far the newest available version is from the installed one. */
export type OutdatedKind =
  'missing' | 'major' | 'minor' | 'patch' | 'prerelease'

/** What the security archive knows about one version of a package. */
export type VersionSecurity = {
  /** The overall security score, from 0 to 100 */
  score: number
  alerts: PackageAlert[]
}

/**
 * A transitive dependent whose declared range does not admit the latest
 * version. Importers are left out: their ranges are the user's to
 * change, and the `action` field says how.
 */
export type HeldBy = {
  dependent: string
  spec: string
}

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
  /**
   * The package depending on it: the name of an importer, or
   * `name@version` of a transitive dependent.
   */
  dependent: string
  /** The dependent's location relative to the project root */
  location: string
  /** How far latest (or wanted, when latest is not ahead) is from current */
  kind: OutdatedKind
  /**
   * True when a newer version satisfies the declared range, so that
   * `vlt update` picks it up without a manifest change.
   */
  inRange: boolean
  /** The deprecation message of the installed version, when deprecated */
  deprecated?: string
  /** Other dependents whose ranges do not admit the latest version */
  heldBy?: HeldBy[]
  /** Requirements of the latest version that this project does not meet */
  requires?: {
    /** The `engines.node` range of latest, when the current node fails it */
    node?: string
    /**
     * Peer dependency ranges of latest that the dependent's installed
     * peers do not satisfy, by peer name.
     */
    peers?: Record<string, string>
  }
  /** Security data for each version the archive has a report for */
  security?: {
    current?: VersionSecurity
    wanted?: VersionSecurity
    latest?: VersionSecurity
  }
  /**
   * How to upgrade: a `vlt` command for dependencies of an importer,
   * or the catalog edit to make. Absent for transitive dependents,
   * where the upgrade belongs to the dependent's own release.
   */
  action?: string
}

export type OutdatedResult = OutdatedEntry[]

const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? '' : 's'}`

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

const alertsNotIn = (alerts: PackageAlert[], other: PackageAlert[]) =>
  alerts.filter(a => !other.some(o => o.key === a.key))

/**
 * The alerts worth a mention in a one-line summary. Low and medium
 * severity alerts (network access, env vars, minified files) come by
 * the dozen on any sizeable package and would drown out the rest.
 */
const serious = (alerts: PackageAlert[]) =>
  alerts.filter(
    a => a.severity === 'high' || a.severity === 'critical',
  )

/**
 * A short explanation of what the upgrade means, for the human table.
 */
const explain = (entry: OutdatedEntry): string => {
  const parts: string[] = []
  if (entry.kind !== 'missing') parts.push(entry.kind)
  if (entry.deprecated !== undefined) parts.push('deprecated')
  const { current } = entry.security ?? {}
  if (current) {
    const targets: [string, VersionSecurity | undefined][] = [
      ['wanted', entry.inRange ? entry.security?.wanted : undefined],
      ['latest', entry.security?.latest],
    ]
    for (const [label, target] of targets) {
      if (!target) continue
      const fixed = alertsNotIn(
        serious(current.alerts),
        target.alerts,
      ).length
      const added = alertsNotIn(
        serious(target.alerts),
        current.alerts,
      ).length
      if (fixed) {
        parts.push(`${label} fixes ${plural(fixed, 'serious alert')}`)
      }
      if (added) {
        parts.push(`${label} adds ${plural(added, 'serious alert')}`)
      }
      if (current.score - target.score >= 10) {
        parts.push(
          `${label} score ${target.score} (from ${current.score})`,
        )
      }
    }
  }
  if (entry.heldBy?.length) {
    parts.push(
      `held by ${entry.heldBy.map(h => h.dependent).join(', ')}`,
    )
  }
  if (entry.requires?.node) {
    parts.push(`latest needs node ${entry.requires.node}`)
  }
  if (entry.requires?.peers) {
    const peers = Object.entries(entry.requires.peers)
      .map(([name, range]) => `${name}@${range}`)
      .join(', ')
    parts.push(`latest needs ${peers}`)
  }
  return parts.join(', ')
}

/**
 * The commands that perform the upgrades, one `vlt install` per set of
 * flags so that the specs can be combined.
 */
const suggestActions = (result: OutdatedResult): string[] => {
  const lines: string[] = []
  const updates = result.filter(e => e.inRange).length
  if (updates) {
    lines.push(
      `Run \`vlt update\` to pick up ${plural(updates, 'in-range update')}.`,
    )
  }
  const installs = new Map<string, string[]>()
  for (const { action } of result) {
    if (!action?.startsWith('vlt install ')) continue
    const [spec = '', ...flags] = action
      .slice('vlt install '.length)
      .split(' ')
    const key = flags.join(' ')
    const specs = installs.get(key) ?? []
    specs.push(spec)
    installs.set(key, specs)
  }
  for (const [flags, specs] of installs) {
    const args = [...specs, ...(flags ? [flags] : [])].join(' ')
    lines.push(`Run \`vlt install ${args}\` to move to latest.`)
  }
  for (const { action } of result) {
    if (action && !action.startsWith('vlt ')) {
      lines.push(
        `${action.charAt(0).toUpperCase()}${action.slice(1)}.`,
      )
    }
  }
  return lines
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
    columns.push({ title: 'Why', cells: result.map(explain) })
    const actions = suggestActions(result)
    return [
      formatTable(columns),
      ...(actions.length ? ['', ...actions] : []),
    ].join('\n')
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

const gapKind = (current: string, target: string): OutdatedKind => {
  const c = parse(current)
  const t = parse(target)
  /* c8 ignore next - versions that reached the graph always parse */
  if (!c || !t) return 'patch'
  if (t.major > c.major) return 'major'
  if (t.minor > c.minor) return 'minor'
  if (t.patch > c.patch) return 'patch'
  return 'prerelease'
}

/** An importer by name, anything else by name and version. */
const dependentName = (node: Node) =>
  node.importer ? node.name : `${node.name}@${node.version}`

/**
 * The other dependents of the installed node whose ranges do not admit
 * the latest version, i.e. what keeps a transitive dependency back
 * even after this dependent's range is widened.
 */
const heldBy = (edge: Edge, latest: string): HeldBy[] => {
  const holders: HeldBy[] = []
  for (const other of edge.to?.edgesIn ?? []) {
    if (other === edge || other.from.importer) continue
    const { range } = other.spec.final
    if (range && !satisfies(latest, range)) {
      holders.push({
        dependent: dependentName(other.from),
        spec: other.spec.bareSpec,
      })
    }
  }
  return holders
}

/**
 * Requirements the latest version makes that the dependent does not
 * meet: a node engine range this process fails, and peer dependency
 * ranges that the dependent's installed peers fall outside of.
 */
const unmetRequirements = (
  edge: Edge,
  latest: Manifest,
  nodeVersion: string,
): OutdatedEntry['requires'] => {
  const requires: OutdatedEntry['requires'] = {}
  const engine = latest.engines?.node
  if (engine && !satisfies(nodeVersion, engine))
    requires.node = engine
  const peers: Record<string, string> = {}
  for (const [peer, range] of Object.entries(
    latest.peerDependencies ?? {},
  )) {
    const installed = edge.from.edgesOut.get(peer)?.to?.version
    if (installed && !satisfies(installed, range)) peers[peer] = range
  }
  if (Object.keys(peers).length) requires.peers = peers
  return requires.node || requires.peers ? requires : undefined
}

type ActionOptions = {
  savePrefix: string
}

/**
 * The spec to hand `vlt install` so that an alias or a named registry
 * prefix survives the range change, e.g. `foo@npm:bar@^2.0.0`.
 */
const installSpec = (edge: Edge, range: string) => {
  const { bareSpec, final } = edge.spec
  const prefix = bareSpec.slice(
    0,
    bareSpec.length - final.bareSpec.length,
  )
  return `${edge.name}@${prefix}${range}`
}

const saveFlags: Record<DependencyTypeShort, string> = {
  prod: '',
  dev: ' --save-dev',
  optional: ' --save-optional',
  peer: ' --save-peer',
  peerOptional: ' --save-peer',
}

/**
 * How an importer upgrades this dependency. A version within the
 * declared range is one `vlt update` away. Moving past the range means
 * changing the spec, with `vlt install` or in the catalog.
 */
const actionFor = (
  edge: Edge,
  entry: OutdatedEntry,
  { savePrefix }: ActionOptions,
): string | undefined => {
  if (!edge.from.importer) return undefined
  if (!entry.current) return 'vlt install'
  const { latest } = entry
  const { range } = edge.spec.final
  if (latest && gt(latest, entry.current) && range) {
    if (satisfies(latest, range)) return 'vlt update'
    const newRange = `${savePrefix}${latest}`
    if (edge.spec.type === 'catalog') {
      return `set the catalog entry for ${edge.name} in vlt.json to ${newRange}`
    }
    const workspace =
      edge.from.mainImporter ?
        ''
      : ` --workspace=${edge.from.location.replace(/^\.\//, '')}`
    return `vlt install ${installSpec(edge, newRange)}${saveFlags[edge.type]}${workspace}`
  }
  return 'vlt update'
}

type BuildOptions = ActionOptions & {
  nodeVersion: string
  pick: Parameters<typeof pickManifest>[2]
}

/**
 * Describe the dependency `edge` declares, or nothing when its
 * installed version is as new as the registry offers.
 */
const buildEntry = (
  edge: Edge,
  packument: Packument,
  options: BuildOptions,
): OutdatedEntry | undefined => {
  const current = edge.to?.version
  const wanted = pickManifest(
    packument,
    edge.spec,
    options.pick,
  )?.version
  const latest = latestVersion(packument)
  const wantedAhead = !!wanted && (!current || gt(wanted, current))
  const latestAhead = !!latest && (!current || gt(latest, current))
  if (current && !wantedAhead && !latestAhead) return undefined

  const entry: OutdatedEntry = {
    name: edge.name,
    spec: edge.spec.bareSpec,
    type: edge.type,
    current,
    wanted,
    latest,
    dependent: dependentName(edge.from),
    location: edge.from.location,
    kind:
      !current ? 'missing'
      : latestAhead ? gapKind(current, latest)
      : gapKind(current, String(wanted)),
    inRange: wantedAhead,
  }
  const deprecated =
    current ? packument.versions[current]?.deprecated : undefined
  if (deprecated) entry.deprecated = deprecated
  if (latestAhead) {
    const holders = heldBy(edge, latest)
    if (holders.length) entry.heldBy = holders
    const manifest = packument.versions[latest]
    const requires =
      manifest &&
      unmetRequirements(edge, manifest, options.nodeVersion)
    if (requires) entry.requires = requires
  }
  const action = actionFor(edge, entry, options)
  if (action) entry.action = action
  return entry
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

/**
 * The edges to check: those a `--target` query selects, or else the
 * direct dependencies of the selected importers.
 */
const selectEdges = async (
  conf: LoadedConfig,
  graph: Graph,
  archive: SecurityArchive | undefined,
): Promise<Edge[]> => {
  const target = conf.get('target')
  if (!target) {
    return selectImporters(conf, graph).flatMap(importer => [
      ...importer.edgesOut.values(),
    ])
  }
  const query = new Query({
    nodes: new Set<NodeLike>(graph.nodes.values()),
    edges: graph.edges,
    importers: graph.importers,
    securityArchive: archive,
    hostContexts: await createHostContextsMap(conf),
    getAuthHeader: createGetAuthHeader(conf),
  })
  const { edges } = await query.search(target, {
    signal: new AbortController().signal,
  })
  return edges.filter(edge => edge instanceof Edge)
}

/**
 * The security archive is a bonus, never a requirement: when it cannot
 * be reached the report simply carries no security data.
 */
const startArchive = async (
  nodes: NodeLike[],
): Promise<SecurityArchive | undefined> => {
  try {
    return await SecurityArchive.start({ nodes })
  } catch {
    return undefined
  }
}

const securityOf = (
  archive: SecurityArchive,
  id: NodeLike['id'],
): VersionSecurity | undefined => {
  const report = archive.get(id)
  if (!report) return undefined
  return {
    score: Math.round(report.score.overall * 100),
    alerts: report.alerts,
  }
}

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

  // a query may use security selectors, which need the archive to
  // know every node in the graph before the search runs
  let archive =
    conf.get('target') ?
      await startArchive([...graph.nodes.values()])
    : undefined
  const names = new Set(conf.positionals)
  const edges = (await selectEdges(conf, graph, archive)).filter(
    edge =>
      (names.size === 0 || names.has(edge.name)) &&
      edge.spec.final.type === 'registry',
  )

  const pic = new PackageInfoClient(conf.options)
  // one packument request per registry package, however many
  // dependents it has
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

  const options: BuildOptions = {
    nodeVersion: conf.options['node-version'],
    savePrefix:
      conf.options['save-exact'] ? '' : conf.options['save-prefix'],
    pick: conf.options,
  }
  const found: { edge: Edge; entry: OutdatedEntry }[] = []
  for (const edge of edges) {
    const entry = buildEntry(
      edge,
      await fetchPackument(edge),
      options,
    )
    if (entry) found.push({ edge, entry })
  }

  // look up the installed, wanted and latest versions in the security
  // archive, the two candidates as stand-in nodes
  const stub = (edge: Edge, version: string) =>
    createStubNode(
      edge.spec,
      edge.spec.final.name,
      version,
      conf.options,
    )
  const securityNodes = new Map<NodeLike['id'], NodeLike>()
  const candidates: {
    entry: OutdatedEntry
    ids: Partial<
      Record<
        keyof NonNullable<OutdatedEntry['security']>,
        NodeLike['id']
      >
    >
  }[] = []
  for (const { edge, entry } of found) {
    const ids: (typeof candidates)[number]['ids'] = {}
    if (edge.to) {
      ids.current = edge.to.id
      securityNodes.set(edge.to.id, edge.to)
    }
    for (const which of ['wanted', 'latest'] as const) {
      const version = entry[which]
      if (!version) continue
      const node = stub(edge, version)
      ids[which] = node.id
      securityNodes.set(node.id, node)
    }
    candidates.push({ entry, ids })
  }
  const nodes = [...securityNodes.values()]
  if (archive) {
    await archive.refresh({ nodes }).catch(() => {
      archive = undefined
    })
  } else if (nodes.length) {
    archive = await startArchive(nodes)
  }
  if (archive) {
    for (const { entry, ids } of candidates) {
      const security: OutdatedEntry['security'] = {}
      for (const which of ['current', 'wanted', 'latest'] as const) {
        const id = ids[which]
        const report = id && securityOf(archive, id)
        if (report) security[which] = report
      }
      if (Object.keys(security).length) entry.security = security
    }
  }

  return found.map(({ entry }) => entry)
}
