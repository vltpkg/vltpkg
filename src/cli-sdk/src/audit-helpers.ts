import { styleText as utilStyleText } from 'node:util'
import { isNode } from '@vltpkg/graph'
import type { Node } from '@vltpkg/graph'
import type { Insights } from '@vltpkg/query'
import type { PackageAlert } from '@vltpkg/security-archive'
import { isVulnerabilityAlert } from '@vltpkg/security-archive'

const styleText = (
  format: Parameters<typeof utilStyleText>[0],
  s: string,
) => utilStyleText(format, s, { validateStream: false })

/**
 * Detect if a DSS query string uses a security-related selector
 * (including lifecycle scripts, which can be security-relevant).
 */
export const isSecuritySelector = (query: string): boolean =>
  /:malware|:vuln|:vulnerable|:severity|:cve|:cwe|:squat|:scripts/.test(
    query,
  )

/**
 * Detect if a DSS query string uses a security selector that signals
 * genuine audit intent (malware, vulnerability, severity, squat, cve,
 * cwe). Unlike a check for `:scripts` alone -- listing packages with
 * lifecycle scripts is a legitimate query on its own and shouldn't by
 * itself be treated as a security audit (e.g. for deciding whether to
 * append a security-summary footer to query output).
 */
export const isSecurityAuditSelector = (query: string): boolean =>
  /:malware|:vuln|:vulnerable|:severity|:cve|:cwe|:squat/.test(query)

/**
 * Build a DSS query string from an audit level.
 *
 * `:vuln()`/`:severity()`/`:squat()` comparators operate on the query
 * engine's own numeric scale (critical=0 ... low=3, lower = more
 * severe; see src/query/src/pseudo/severity.ts, vuln.ts, squat.ts),
 * so "at or above" a given level is expressed as `<=` that level's
 * value, not `>`/`>=`. `:squat` only has two kinds (critical=0,
 * medium=2) -- there is no `:squat(high)`/`:squat(low)`.
 *
 * `:malware` is a binary selector (no parameters, always matches any
 * malware alert regardless of severity), so it must appear
 * unqualified at every level -- omitting it above `low` would drop
 * malware-only findings from the query entirely, not just from a
 * severity bucket. Use `:vuln` for comparator-based vulnerability
 * severity filtering instead.
 */
export const buildAuditQuery = (level: string): string => {
  // :scripts is deliberately excluded -- aggregateBySeverity has no
  // handling for lifecycle-script findings (no insights.scripts
  // bucket, no "scripts" category), so matches were fetched from the
  // DSS query and then silently discarded, doing work for no
  // user-visible output.
  const defaultQuery =
    ':malware, :vulnerable, :severity(<=low), :squat'
  const queries: Record<string, string> = {
    low: defaultQuery,
    medium:
      ':malware, :vuln(<=medium), :severity(<=medium), :squat(<=medium)',
    high: ':malware, :vuln(<=high), :severity(<=high), :squat(critical)',
    critical:
      ':malware, :vuln(critical), :severity(critical), :squat(critical)',
  }
  return queries[level] ?? defaultQuery
}

export type AuditPackage = {
  name: string
  version: string
  /** Structured alerts with detailed advisory information from SecurityArchive */
  alerts: PackageAlert[]
  /** CVE ids associated with this package's known vulnerabilities. */
  cves: string[]
  direct: boolean
  /** File system location where the package is installed */
  location?: string
  /** Dependency path from root to this package (e.g., "pkg-a > pkg-b > pkg-c") */
  path?: string
}

export type AuditResult = {
  summary: {
    critical: AuditPackage[]
    high: AuditPackage[]
    medium: AuditPackage[]
    low: AuditPackage[]
  }
  total: number
  directCount: number
  indirectCount: number
  /** Number of packages scanned (with security data available) */
  scannedCount?: number
  /** Number of packages without security data */
  unscannedCount?: number
}

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'

/**
 * Severity levels in display order, most severe first.
 */
export const severityOrder: SeverityLevel[] = [
  'critical',
  'high',
  'medium',
  'low',
]

/**
 * Build an empty `AuditResult['summary']` (no findings in any bucket).
 */
export const emptySummary = (): AuditResult['summary'] => ({
  critical: [],
  high: [],
  medium: [],
  low: [],
})

/**
 * Build an empty `AuditResult` (no findings, zeroed counts).
 */
export const emptyAuditResult = (): AuditResult => ({
  summary: emptySummary(),
  total: 0,
  directCount: 0,
  indirectCount: 0,
})

// lower number = more severe, matching kindLevelMap in
// src/query/src/pseudo/severity.ts
const severityRank: Record<SeverityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const maxSeverity = (
  a: SeverityLevel,
  b: SeverityLevel,
): SeverityLevel => (severityRank[a] <= severityRank[b] ? a : b)

/**
 * Typeguard for a node exposing an `edgesOut` map, each edge having a
 * `.to` node with an id -- used to precompute an importer's direct
 * dependencies. `edgesOut` is bounded by that importer's own declared
 * dependencies, unlike a dependency's `edgesIn` which grows with
 * however many packages in the whole graph depend on it.
 */
const isNodeWithEdgesOut = (
  o: unknown,
): o is {
  edgesOut: { values: () => Iterable<{ to?: { id: string } }> }
} => {
  if (!isNode(o) || !('edgesOut' in o)) {
    return false
  }
  const edgesOut = (o as { edgesOut: unknown }).edgesOut
  return (
    typeof edgesOut === 'object' &&
    edgesOut !== null &&
    typeof (edgesOut as { values?: unknown }).values === 'function'
  )
}

/**
 * Typeguard for objects with an id and insights property.
 */
const isNodeWithInsights = (
  o: unknown,
): o is {
  id: string
  insights: Insights
  name?: string
  version?: string
} =>
  isNode(o) &&
  'id' in o &&
  'insights' in o &&
  typeof (o as { insights: unknown }).insights === 'object' &&
  (o as { insights: unknown }).insights !== null

/**
 * Typeguard for LeveledInsights (malware, severity).
 */
const isLeveledInsights = (
  o: unknown,
): o is {
  low: boolean
  medium: boolean
  high: boolean
  critical: boolean
} =>
  typeof o === 'object' &&
  o !== null &&
  'low' in o &&
  'medium' in o &&
  'high' in o &&
  'critical' in o &&
  typeof (o as { low: unknown }).low === 'boolean' &&
  typeof (o as { medium: unknown }).medium === 'boolean' &&
  typeof (o as { high: unknown }).high === 'boolean' &&
  typeof (o as { critical: unknown }).critical === 'boolean'

/**
 * Typeguard for SquatInsights.
 */
const isSquatInsights = (
  o: unknown,
): o is { medium: boolean; critical: boolean } =>
  typeof o === 'object' &&
  o !== null &&
  'medium' in o &&
  'critical' in o &&
  typeof (o as { medium: unknown }).medium === 'boolean' &&
  typeof (o as { critical: unknown }).critical === 'boolean'

/**
 * Determine the highest severity level from leveled insights.
 */
const getLeveledSeverity = (insights: {
  low: boolean
  medium: boolean
  high: boolean
  critical: boolean
}): SeverityLevel | null => {
  if (insights.critical) return 'critical'
  if (insights.high) return 'high'
  if (insights.medium) return 'medium'
  if (insights.low) return 'low'
  return null
}

/**
 * Determine severity from squat insights.
 */
const getSquatSeverity = (insights: {
  medium: boolean
  critical: boolean
}): SeverityLevel | null => {
  if (insights.critical) return 'critical'
  if (insights.medium) return 'medium'
  return null
}

/**
 * Build a dependency path string showing how to reach a node from root.
 * Traverses edgesIn to find a path to a root importer.
 * Returns undefined if no path can be determined.
 */
const buildDependencyPath = (node: unknown): string | undefined => {
  if (!isNode(node)) return undefined

  const path: string[] = [
    typeof node.name === 'string' ? node.name : node.id,
  ]
  let current: Node = node
  const visited = new Set<string>()

  // Traverse backwards through edgesIn to find a path to root
  while (current.edgesIn.size > 0) {
    if (visited.has(current.id)) break // Avoid cycles
    visited.add(current.id)

    // Get first incoming edge
    let nextEdge: { from?: Node } | undefined
    for (const edge of current.edgesIn.values()) {
      nextEdge = edge
      break
    }
    if (!nextEdge?.from) break

    current = nextEdge.from
    path.unshift(
      typeof current.name === 'string' ? current.name : current.id,
    )

    // Stop at an importer (root or workspace)
    if (current.importer) break
  }

  return path.length > 1 ? path.join(' > ') : undefined
}

/**
 * Helper to construct synthetic PackageAlert objects from insights.
 * Used as fallback when SecurityArchive doesn't have detailed alert data.
 */
const constructSyntheticAlerts = (insights: {
  malware?: unknown
  severity?: unknown
  squat?: unknown
  vuln?: unknown
}): PackageAlert[] => {
  const alerts: PackageAlert[] = []

  if (insights.malware && isLeveledInsights(insights.malware)) {
    const s = getLeveledSeverity(insights.malware)
    if (s) {
      alerts.push({
        key: `malware-${s}`,
        type: 'malware',
        category: 'malware',
        severity: s,
      })
    }
  }

  if (insights.severity && isLeveledInsights(insights.severity)) {
    const s = getLeveledSeverity(insights.severity)
    if (s) {
      alerts.push({
        key: `severity-${s}`,
        type: 'severity',
        category: 'severity',
        severity: s,
      })
    }
  }

  if (insights.squat && isSquatInsights(insights.squat)) {
    const s = getSquatSeverity(insights.squat)
    if (s) {
      alerts.push({
        key: `squat-${s}`,
        type: 'squatting',
        category: 'squat',
        severity: s,
      })
    }
  }

  if (insights.vuln && isLeveledInsights(insights.vuln)) {
    const s = getLeveledSeverity(insights.vuln)
    if (s) {
      alerts.push({
        key: `vuln-${s}`,
        type: 'vulnerability',
        category: 'vulnerability',
        severity: s,
      })
    }
  }

  return alerts
}

/**
 * Helper to look up PackageAlert from SecurityArchive for a node.
 * Falls back to constructing alerts from insights if archive has no data.
 * Returns an array of relevant alerts for the node's package.
 */
const getPackageAlerts = (
  node: { id?: string; insights?: unknown },
  securityArchive?: { get?: (depId: string) => unknown },
): PackageAlert[] => {
  if (securityArchive?.get && node.id) {
    const reportData = securityArchive.get(node.id)
    if (
      typeof reportData === 'object' &&
      reportData !== null &&
      'alerts' in reportData &&
      Array.isArray(reportData.alerts)
    ) {
      return (reportData as { alerts: unknown[] })
        .alerts as PackageAlert[]
    }
  }

  // Fallback: construct synthetic alerts from insights
  if (node.insights && typeof node.insights === 'object') {
    return constructSyntheticAlerts(node.insights)
  }

  return []
}

/**
 * Aggregate query results by severity for audit output. `warn`, if
 * provided, is called for nodes whose insights data is present but
 * does not match the expected shape (as opposed to simply absent).
 *
 * When securityArchive is provided, populates alerts with full
 * PackageAlert objects including advisory details (CVE, CWE, etc).
 */
export const aggregateBySeverity = (
  nodes: Iterable<unknown>,
  importers: Set<unknown>,
  _warn: (message: string) => void = () => {},
  securityArchive?: { get?: (depId: string) => unknown },
): AuditResult => {
  const result: AuditResult = emptyAuditResult()

  // Precompute importer ids and their direct dependencies from the
  // importers' own `edgesOut` (bounded by what each importer declares
  // in its package.json). This is cheaper than checking, per flagged
  // node, whether any of that node's `edgesIn` comes from an
  // importer -- `edgesIn` grows with how many packages in the whole
  // graph depend on that node, which for a popular/shared package can
  // be large.
  const importerIds = new Set<string>()
  const directDepIds = new Set<string>()
  for (const imp of importers) {
    if (!isNode(imp)) continue
    importerIds.add(imp.id)
    if (isNodeWithEdgesOut(imp)) {
      for (const edge of imp.edgesOut.values()) {
        if (edge.to) directDepIds.add(edge.to.id)
      }
    }
  }

  let scannedCount = 0
  let unscannedCount = 0

  for (const node of nodes) {
    // Track scanned vs unscanned packages
    if (isNode(node) && 'insights' in node) {
      const insights = (node as { insights: unknown }).insights
      if (
        typeof insights === 'object' &&
        insights !== null &&
        'scanned' in insights
      ) {
        if (insights.scanned === true) {
          scannedCount++
        } else {
          unscannedCount++
        }
      }
    }

    if (!isNodeWithInsights(node)) continue

    const insights = node.insights

    // Query already validated this node has security findings.
    // Look up the structured alerts from securityArchive.
    const alerts: PackageAlert[] =
      securityArchive ? getPackageAlerts(node, securityArchive) : []

    if (alerts.length === 0) continue

    // Compute max severity from alert data
    let newSeverity: SeverityLevel = 'low'
    for (const alert of alerts) {
      newSeverity = maxSeverity(newSeverity, alert.severity)
    }

    // Direct dependency: the node itself is an importer (e.g. a
    // workspace root with its own findings), or it's one of the
    // importers' declared direct dependencies.
    const direct =
      importerIds.has(node.id) || directDepIds.has(node.id)

    const location =
      (
        'location' in node &&
        typeof (node as Record<string, unknown>).location === 'string'
      ) ?
        ((node as Record<string, unknown>).location as string)
      : undefined

    const pkg: AuditPackage = {
      name: node.name ?? 'unknown',
      version: node.version ?? 'unknown',
      alerts,
      cves: Array.isArray(insights.cve) ? insights.cve : [],
      direct,
      location,
      path: buildDependencyPath(node),
    }

    // Verify newSeverity is a valid key before using it
    if (newSeverity in result.summary) {
      result.summary[newSeverity].push(pkg)
      result.total++
      if (direct) result.directCount++
      else result.indirectCount++
    }
  }

  result.scannedCount = scannedCount
  result.unscannedCount = unscannedCount

  return result
}

/**
 * Filter audit results to only include severities at or above the
 * minimum. `directCount`/`indirectCount` are recomputed from the
 * filtered packages, so the direct/transitive footer always matches
 * the issues actually shown, not the pre-filter totals.
 */
export const filterAuditResult = (
  result: AuditResult,
  minSeverity: SeverityLevel,
): AuditResult => {
  const minRank = severityRank[minSeverity]
  const filtered: AuditResult = emptyAuditResult()
  for (const sev of severityOrder) {
    if (severityRank[sev] > minRank) continue
    const pkgs = result.summary[sev]
    filtered.summary[sev] = pkgs
    filtered.total += pkgs.length
    for (const pkg of pkgs) {
      if (pkg.direct) filtered.directCount++
      else filtered.indirectCount++
    }
  }
  return filtered
}

const severityFormat: Record<
  SeverityLevel,
  Parameters<typeof utilStyleText>[0]
> = {
  critical: 'redBright',
  high: 'red',
  medium: 'yellow',
  low: 'dim',
}

/**
 * Style `text` with the conventional color for `severity`, when
 * `colors` is true.
 */
const colorizeBySeverity = (
  severity: SeverityLevel,
  text: string,
  colors?: boolean,
): string =>
  colors ? styleText(severityFormat[severity], text) : text

// Deliberately distinct from severityFormat's reds/yellows -- these
// label alert type (what kind of finding), not severity (how bad),
// so reusing the severity palette here would read as a severity cue.
const categoryFormat: Record<
  keyof CategoryCounts,
  Parameters<typeof utilStyleText>[0]
> = {
  malware: 'magenta',
  vulnerable: 'cyan',
  squat: 'blue',
}

/**
 * Style `text` with the conventional color for `category`, when
 * `colors` is true.
 */
const colorizeByCategory = (
  category: keyof CategoryCounts,
  text: string,
  colors?: boolean,
): string =>
  colors ? styleText(categoryFormat[category], text) : text

/**
 * Format a severity bucket heading (e.g. "critical (2)"), styled with
 * the conventional severity color when `colors` is true. Shared by
 * any view that renders a severity breakdown (e.g. `vlt query`'s
 * security-summary footer).
 */
export const formatSeverityHeading = (
  severity: SeverityLevel,
  count: number,
  colors?: boolean,
): string =>
  colorizeBySeverity(severity, `${severity} (${count})`, colors)

/**
 * Return the non-empty severity buckets of an audit result, in
 * `severityOrder` (most severe first). Shared by any view that needs
 * to render a severity breakdown (e.g. `vlt audit`'s human view and
 * `vlt query`'s security-summary footer).
 */
export const nonEmptySeverityBuckets = (
  result: AuditResult,
): { severity: SeverityLevel; pkgs: AuditPackage[] }[] =>
  severityOrder
    .map(severity => ({ severity, pkgs: result.summary[severity] }))
    .filter(({ pkgs }) => pkgs.length > 0)

export type CategoryCounts = {
  malware: number
  vulnerable: number
  squat: number
}

/**
 * Count alerts by category (malware, vulnerable, squat) across every
 * package in an audit result. A package with alerts in more than one
 * category contributes to each -- these are alert counts, not
 * package counts, so they don't necessarily sum to `result.total`.
 */
export const categoryCounts = (
  result: AuditResult,
): CategoryCounts => {
  const counts: CategoryCounts = {
    malware: 0,
    vulnerable: 0,
    squat: 0,
  }
  for (const pkgs of Object.values(result.summary)) {
    for (const pkg of pkgs) {
      for (const alert of pkg.alerts) {
        if (alert.type === 'malware') counts.malware++
        else if (
          alert.type === 'gptSecurity' ||
          alert.type === 'gptAnomaly' ||
          alert.type === 'cve' ||
          alert.category === 'vulnerability'
        ) {
          counts.vulnerable++
        } else if (alert.type === 'squatting') counts.squat++
      }
    }
  }
  return counts
}

/**
 * Format the "N direct dependency/dependencies, M transitive"
 * breakdown line shared by `formatAuditSummary` and `vlt query`'s
 * security-summary footer.
 */
export const formatDependencyBreakdown = (
  result: AuditResult,
): string => {
  const directWord =
    result.directCount === 1 ? 'dependency' : 'dependencies'
  return `${result.directCount} direct ${directWord}, ${result.indirectCount} transitive`
}

/**
 * NVD's vulnerability detail page for a CVE id -- a stable, publicly
 * documented URL scheme, not something specific to this package.
 */
const nvdUrl = (cve: string): string =>
  `https://nvd.nist.gov/vuln/detail/${cve}`

/**
 * MITRE's CWE definition page for a CWE id.
 */
const cweUrl = (cweId: string): string => {
  // Extract numeric ID from "CWE-1234" format
  const id = cweId.replace(/^CWE-/, '')
  return `https://cwe.mitre.org/data/definitions/${id}.html`
}

/**
 * Render `text` as a clickable OSC 8 terminal hyperlink to `url` when
 * `enabled`, matching the pattern in `@vltpkg/url-open`. Terminals
 * that don't support OSC 8 just show `text`, so this only degrades
 * gracefully when `enabled` is backed by real TTY detection --
 * otherwise fall back to printing the URL alongside the text, since
 * a hidden link is useless in piped/non-interactive output.
 */
const hyperlink = (
  text: string,
  url: string,
  enabled?: boolean,
): string =>
  enabled ? `]8;;${url}\\${text}]8;;\\` : `${text} (${url})`

/**
 * Format a table row with box-drawing characters for audit output.
 * Creates rows like: │ Label       │ Value                                   │
 */
const formatTableRow = (
  label: string,
  value: string,
  leftWidth: number,
  rightWidth: number,
): string => {
  const paddedLabel = label.padEnd(leftWidth)
  const paddedValue = value.padEnd(rightWidth)
  return `│ ${paddedLabel} │ ${paddedValue} │`
}

/**
 * Build one table per flagged package, most severe first, showing alert details
 * in a box-drawing table format similar to npm audit.
 */
const formatAuditRows = (
  result: AuditResult,
  colors?: boolean,
): string[] => {
  const lines: string[] = []

  // First pass: collect all table rows and calculate consistent column widths
  const allTableRows: [string, string][][] = []
  let maxLeftWidth = 0
  let maxRightWidth = 0

  for (const { severity, pkgs } of nonEmptySeverityBuckets(result)) {
    for (const pkg of pkgs) {
      const pkgName = `${pkg.name}@${pkg.version}`
      const dependencyType = pkg.direct ? 'direct' : 'transitive'

      // Prepare table data
      const tableRows: [string, string][] = []

      // Add severity and first alert info as header
      if (pkg.alerts.length > 0) {
        const firstAlert = pkg.alerts[0] as {
          type: string
          category: string
        }
        const alertType = firstAlert.category || firstAlert.type
        tableRows.push([
          colorizeBySeverity(
            severity,
            severity.toUpperCase(),
            colors,
          ),
          alertType,
        ])
      } else {
        tableRows.push([
          colorizeBySeverity(
            severity,
            severity.toUpperCase(),
            colors,
          ),
          '',
        ])
      }

      tableRows.push(['Package', pkgName])

      // Add CVE info from first vulnerability alert if available
      const vulnAlert = pkg.alerts.find(alert =>
        isVulnerabilityAlert(alert),
      )

      if (vulnAlert) {
        // Add title if available
        if (vulnAlert.props?.title) {
          tableRows.push(['Title', vulnAlert.props.title])
        }

        // Add vulnerable version range if available
        if (vulnAlert.props?.vulnerableVersionRange) {
          tableRows.push([
            'Vulnerable Versions',
            vulnAlert.props.vulnerableVersionRange,
          ])
        }

        // Add CVSS score if available
        if (vulnAlert.props?.cvss?.score !== undefined) {
          tableRows.push([
            'CVSS Score',
            vulnAlert.props.cvss.score.toString(),
          ])
        }

        // Add CVE ID with link
        if (vulnAlert.props?.cveId) {
          tableRows.push([
            'CVE',
            hyperlink(
              vulnAlert.props.cveId,
              nvdUrl(vulnAlert.props.cveId),
              colors,
            ),
          ])
        }

        // Add CWE info if available
        if (
          vulnAlert.props?.cwes &&
          vulnAlert.props.cwes.length > 0
        ) {
          const cweLinks = vulnAlert.props.cwes
            .map(c => hyperlink(c.id, cweUrl(c.id), colors))
            .join(', ')
          tableRows.push(['CWE', cweLinks])
        }
      }

      // Add dependency path if available
      if (pkg.path) {
        tableRows.push(['Path', pkg.path])
      }

      tableRows.push(['Dependency of', dependencyType])

      allTableRows.push(tableRows)

      // Track max widths across all tables
      for (const [label, value] of tableRows) {
        maxLeftWidth = Math.max(maxLeftWidth, label.length)
        maxRightWidth = Math.max(maxRightWidth, value.length)
      }
    }
  }

  // Second pass: render all tables with consistent widths
  let tableIndex = 0
  for (const { severity: _severity, pkgs } of nonEmptySeverityBuckets(
    result,
  )) {
    if (lines.length > 0) lines.push('')

    for (const _pkg of pkgs) {
      const tableRows: [string, string][] =
        allTableRows[tableIndex++]!

      // Build box-drawing table
      const topBorder = `┌─${'-'.repeat(maxLeftWidth)}─┬─${'-'.repeat(maxRightWidth)}─┐`
      const separator = `├─${'-'.repeat(maxLeftWidth)}─┼─${'-'.repeat(maxRightWidth)}─┤`
      const bottomBorder = `└─${'-'.repeat(maxLeftWidth)}─┴─${'-'.repeat(maxRightWidth)}─┘`

      lines.push(topBorder)
      for (let i = 0; i < tableRows.length; i++) {
        const [label, value] = tableRows[i]
        lines.push(
          formatTableRow(label, value, maxLeftWidth, maxRightWidth),
        )
        if (i < tableRows.length - 1) {
          lines.push(separator)
        }
      }
      lines.push(bottomBorder)
    }
  }

  return lines
}

/**
 * Format the "N malware, N vulnerable, N squat" category breakdown
 * line, each count styled with its category color when `colors` is
 * true. Omits categories with zero alerts.
 */
const formatCategoryCountsLine = (
  result: AuditResult,
  colors?: boolean,
): string => {
  const counts = categoryCounts(result)
  const parts = (
    Object.entries(counts) as [keyof CategoryCounts, number][]
  )
    .filter(([, count]) => count > 0)
    .map(([category, count]) =>
      colorizeByCategory(category, `${count} ${category}`, colors),
    )
  return parts.length > 0 ? parts.join(', ') : 'no alerts'
}

/**
 * Format the "N critical, N high, ..." severity breakdown line, each
 * count styled with its severity color when `colors` is true.
 */
const formatSeverityCountsLine = (
  result: AuditResult,
  colors?: boolean,
): string =>
  nonEmptySeverityBuckets(result)
    .map(({ severity, pkgs }) =>
      colorizeBySeverity(
        severity,
        `${pkgs.length} ${severity}`,
        colors,
      ),
    )
    .join(', ')

/**
 * Format audit result as human-readable summary text.
 */
export const formatAuditSummary = (
  result: AuditResult,
  { colors }: { colors?: boolean } = {},
): string => {
  if (result.total === 0) {
    return '0 packages with security issues\n'
  }

  const lines: string[] = []
  lines.push(
    `${result.total} package${result.total === 1 ? '' : 's'} with security issues`,
  )
  lines.push(formatCategoryCountsLine(result, colors))
  lines.push(formatSeverityCountsLine(result, colors))

  lines.push('')
  lines.push(...formatAuditRows(result, colors))

  // Add security summary footer at the end
  lines.push('')
  lines.push(formatDependencyBreakdown(result))

  // Add scan coverage info if we have unscanned packages
  if (
    result.unscannedCount !== undefined &&
    result.unscannedCount > 0 &&
    result.scannedCount !== undefined
  ) {
    lines.push(
      `Scanned: ${result.scannedCount} packages | Unscanned: ${result.unscannedCount} packages`,
    )
  }

  return lines.join('\n')
}
