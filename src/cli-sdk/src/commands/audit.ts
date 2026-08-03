import { actual, GraphModifier } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { styleText as utilStyleText } from 'node:util'
import { commandUsage } from '../config/usage.ts'
import type { Graph } from '@vltpkg/graph'
import type { NodeLike } from '@vltpkg/types'
import type { Insights, QueryResponseNode } from '@vltpkg/query'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views, ViewOptions } from '../view.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'audit',
    usage: ['', '<query> --view=<human | json>'],
    description: `Run a security audit of the installed dependency graph.

      Uses the vlt Dependency Selector Syntax (the same engine that powers
      \`vlt query\`) together with the Socket security database to surface
      packages that may need attention: known malware, published
      vulnerabilities (CVEs), typosquats, license problems, unmaintained or
      deprecated packages, and more.

      By default it scans every package that has security metadata and reports
      any finding with a severity of moderate or higher. Provide a DSS query as
      a positional argument to audit a specific subset of the graph (for
      example ':workspace > *' to only audit your workspaces' direct
      dependencies).`,

    examples: {
      '': {
        description: 'Audit all installed dependencies',
      },
      [`':workspace > *'`]: {
        description:
          'Only audit direct dependencies of your workspaces',
      },
      '--view=json': {
        description: 'Emit the audit report as JSON for tooling / CI',
      },
      '--all': {
        description:
          'Include low-severity findings such as behavioral capabilities',
      },
    },
    options: {
      all: {
        description:
          'Include low-severity findings (behavioral capabilities, minor hygiene issues).',
      },
      view: {
        value: '[human | json]',
        description:
          'Output format. Defaults to human-readable, or json if there is no tty.',
      },
    },
  })

/**
 * Severity buckets, ordered from most to least severe.
 */
export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low'

const severityRank: Record<AuditSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

/**
 * A single security concern found on a package.
 */
export type AuditFinding = {
  severity: AuditSeverity
  category: string
  description: string
}

/**
 * The collected findings for a single package.
 */
export type AuditPackageReport = {
  id: string
  name: string
  version?: string | null
  location?: string
  worst: AuditSeverity
  findings: AuditFinding[]
}

export type AuditResult = {
  reports: AuditPackageReport[]
  summary: Record<AuditSeverity, number> & { total: number }
  packagesAffected: number
  packagesScanned: number
  queryString: string
  showAll: boolean
}

/**
 * Turn a node's structured {@link Insights} into a flat list of findings.
 */
export const insightsToFindings = (
  insights: Insights,
): AuditFinding[] => {
  const findings: AuditFinding[] = []
  const add = (
    severity: AuditSeverity,
    category: string,
    description: string,
  ) => findings.push({ severity, category, description })

  // known & AI-detected malware
  const malware = insights.malware
  if (malware?.critical) add('critical', 'malware', 'known malware')
  if (malware?.high) add('high', 'malware', 'AI-detected malware')
  if (malware?.medium)
    add('medium', 'malware', 'AI-flagged security issue')
  if (malware?.low) add('low', 'malware', 'AI-flagged anomaly')

  // published vulnerabilities, keyed to the most severe band present
  const severity = insights.severity
  const cves =
    insights.cve?.length ? ` (${insights.cve.join(', ')})` : ''
  if (severity?.critical)
    add('critical', 'vulnerability', `critical severity CVE${cves}`)
  else if (severity?.high)
    add('high', 'vulnerability', `high severity CVE${cves}`)
  else if (severity?.medium)
    add('medium', 'vulnerability', `potential vulnerability${cves}`)
  else if (severity?.low)
    add('low', 'vulnerability', `low severity CVE${cves}`)
  else if (insights.cve?.length)
    add('high', 'vulnerability', `known CVE${cves}`)

  // typosquat suspicion
  if (insights.squat?.critical)
    add('high', 'typosquat', 'likely typosquat')
  else if (insights.squat?.medium)
    add('medium', 'typosquat', 'possible typosquat')

  // supply-chain integrity / trust
  if (insights.confused)
    add('high', 'integrity', 'manifest confusion')
  if (insights.obfuscated) add('medium', 'code', 'obfuscated code')
  if (insights.suspicious)
    add('medium', 'trust', 'suspicious activity')
  if (insights.undesirable)
    add('medium', 'trust', 'flagged as undesirable')
  if (insights.entropic) add('low', 'code', 'high-entropy strings')
  if (insights.minified) add('low', 'code', 'minified, no source')

  // license compliance
  const license = insights.license
  if (license?.copyleft) add('medium', 'license', 'copyleft license')
  if (license?.restricted)
    add('medium', 'license', 'non-permissive license')
  if (license?.unlicensed) add('medium', 'license', 'unlicensed')
  if (license?.none) add('medium', 'license', 'no license found')
  if (license?.misc) add('low', 'license', 'license issues')
  if (license?.ambiguous) add('low', 'license', 'ambiguous license')
  if (license?.unknown) add('low', 'license', 'unidentified license')

  // maintenance / hygiene
  if (insights.deprecated) add('medium', 'maintenance', 'deprecated')
  if (insights.abandoned)
    add('medium', 'maintenance', 'abandoned (missing author)')
  if (insights.unmaintained)
    add('medium', 'maintenance', 'unmaintained (5+ years)')
  if (insights.unpopular) add('low', 'maintenance', 'unpopular')
  if (insights.unstable)
    add('low', 'maintenance', 'unstable ownership')
  if (insights.unknown)
    add('low', 'maintenance', 'new / unknown author')
  if (insights.trivial) add('low', 'maintenance', 'trivial package')

  // behavioral capabilities (informational, low severity)
  if (insights.eval) add('low', 'capability', 'uses eval')
  if (insights.shell) add('low', 'capability', 'shell access')
  if (insights.network) add('low', 'capability', 'network access')
  if (insights.fs) add('low', 'capability', 'filesystem access')
  if (insights.env) add('low', 'capability', 'reads env vars')
  if (insights.dynamic) add('low', 'capability', 'dynamic require')
  if (insights.debug) add('low', 'capability', 'debug access')
  if (insights.native) add('low', 'capability', 'native code')
  if (insights.tracker) add('low', 'capability', 'telemetry')
  if (insights.scripts) add('low', 'capability', 'install scripts')
  if (insights.shrinkwrap)
    add('low', 'capability', 'bundles a shrinkwrap')

  return findings
}

const worstSeverity = (findings: AuditFinding[]): AuditSeverity => {
  let worst: AuditSeverity = 'low'
  for (const f of findings) {
    if (severityRank[f.severity] < severityRank[worst]) {
      worst = f.severity
    }
  }
  return worst
}

/**
 * Build the audit report from the security-annotated query result nodes.
 */
const buildResult = (
  nodes: QueryResponseNode[],
  queryString: string,
  showAll: boolean,
): AuditResult => {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  }
  let packagesScanned = 0
  const reports: AuditPackageReport[] = []

  for (const node of nodes) {
    if (node.insights.scanned) packagesScanned++
    const findings = insightsToFindings(node.insights).filter(
      f => showAll || f.severity !== 'low',
    )
    if (!findings.length) continue

    for (const f of findings) {
      summary[f.severity]++
      summary.total++
    }

    reports.push({
      id: String(node.id),
      /* c8 ignore next -- installed nodes always resolve a name */
      name: node.name ?? '(unknown)',
      version: node.version,
      location: node.location,
      worst: worstSeverity(findings),
      findings,
    })
  }

  // most severe packages first, ties broken alphabetically
  reports.sort(
    (a, b) =>
      severityRank[a.worst] - severityRank[b.worst] ||
      a.name.localeCompare(b.name),
  )

  return {
    reports,
    summary,
    packagesAffected: reports.length,
    packagesScanned,
    queryString,
    showAll,
  }
}

const style = (
  colors: boolean | undefined,
  format: Parameters<typeof utilStyleText>[0],
  s: string,
): string =>
  colors ? utilStyleText(format, s, { validateStream: false }) : s

const severityColor: Record<
  AuditSeverity,
  Parameters<typeof utilStyleText>[0]
> = {
  critical: ['red', 'bold'],
  high: 'red',
  medium: 'yellow',
  low: 'dim',
}

/**
 * Render a fixed-width column, padding the raw text before colorizing so
 * that ANSI escape codes never throw the alignment off.
 */
const cell = (text: string, width: number): string =>
  text + ' '.repeat(Math.max(0, width - text.length))

const humanView = (
  result: AuditResult,
  options: ViewOptions = {},
): string => {
  const { colors } = options
  const title = style(colors, 'bold', 'Security Audit')

  if (!result.reports.length) {
    const scanned = result.packagesScanned
    return `${title}\n\n${style(
      colors,
      'green',
      '\u2713 No security issues found',
    )} across ${scanned} scanned package${scanned === 1 ? '' : 's'}.`
  }

  type Row = {
    severity: AuditSeverity
    pkg: string
    category: string
    description: string
  }
  const rows: Row[] = []
  for (const report of result.reports) {
    const pkg =
      report.version ?
        `${report.name}@${report.version}`
      : report.name
    for (const f of report.findings) {
      rows.push({
        severity: f.severity,
        pkg,
        category: f.category,
        description: f.description,
      })
    }
  }

  const headers = {
    severity: 'SEVERITY',
    pkg: 'PACKAGE',
    category: 'TYPE',
    description: 'ISSUE',
  }
  const widths = {
    severity: Math.max(
      headers.severity.length,
      ...rows.map(r => r.severity.length),
    ),
    pkg: Math.max(headers.pkg.length, ...rows.map(r => r.pkg.length)),
    category: Math.max(
      headers.category.length,
      ...rows.map(r => r.category.length),
    ),
    description: Math.max(
      headers.description.length,
      ...rows.map(r => r.description.length),
    ),
  }

  const lines: string[] = [title, '']
  lines.push(
    style(
      colors,
      'dim',
      [
        cell(headers.severity, widths.severity),
        cell(headers.pkg, widths.pkg),
        cell(headers.category, widths.category),
        headers.description,
      ].join('  '),
    ),
  )

  for (const row of rows) {
    lines.push(
      [
        style(
          colors,
          severityColor[row.severity],
          cell(row.severity, widths.severity),
        ),
        cell(row.pkg, widths.pkg),
        style(colors, 'cyan', cell(row.category, widths.category)),
        row.description,
      ].join('  '),
    )
  }

  const { summary } = result
  const parts: string[] = []
  const pushPart = (
    count: number,
    severity: AuditSeverity,
    label: string,
  ) => {
    if (count) {
      parts.push(
        style(colors, severityColor[severity], `${count} ${label}`),
      )
    }
  }
  pushPart(summary.critical, 'critical', 'critical')
  pushPart(summary.high, 'high', 'high')
  pushPart(summary.medium, 'medium', 'moderate')
  pushPart(summary.low, 'low', 'low')

  lines.push('')
  lines.push(
    `${style(colors, 'bold', 'Summary:')} ${parts.join(', ')} across ${
      result.packagesAffected
    } package${result.packagesAffected === 1 ? '' : 's'} (${
      result.packagesScanned
    } scanned).`,
  )
  if (!result.showAll && !summary.low) {
    lines.push(
      style(
        colors,
        'dim',
        'Run with --all to include low-severity capability findings.',
      ),
    )
  }

  return lines.join('\n')
}

export const views = {
  human: humanView,
  json: (result: AuditResult) => ({
    summary: result.summary,
    packagesAffected: result.packagesAffected,
    packagesScanned: result.packagesScanned,
    reports: result.reports,
  }),
} as const satisfies Views<AuditResult>

export const command: CommandFn<AuditResult> = async conf => {
  const showAll = !!conf.values.all
  const queryString = conf.positionals[0] || ':scanned'

  const modifiers = GraphModifier.maybeLoad(conf.options)
  const monorepo = conf.options.monorepo
  const mainManifest = conf.options.packageJson.maybeRead(
    conf.options.projectRoot,
  )

  // nothing to audit if there is no project graph to load
  if (!mainManifest) {
    return buildResult([], queryString, showAll)
  }

  const graph: Graph = actual.load({
    ...conf.options,
    mainManifest,
    modifiers,
    monorepo,
    loadManifests: true,
  })
  const securityArchive = await SecurityArchive.start({
    nodes: [...graph.nodes.values()],
  })

  const nodes = new Set<NodeLike>(graph.nodes.values())
  const q = new Query({
    edges: graph.edges,
    nodes,
    importers: graph.importers,
    securityArchive,
  })
  const { nodes: resultNodes } = await q.search(queryString, {
    signal: new AbortController().signal,
  })

  return buildResult(resultNodes, queryString, showAll)
}
