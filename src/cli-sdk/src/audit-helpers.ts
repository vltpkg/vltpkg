import { styleText as utilStyleText } from 'node:util'
import type { Insights } from '@vltpkg/query'

const styleText = (
  format: Parameters<typeof utilStyleText>[0],
  s: string,
) => utilStyleText(format, s, { validateStream: false })

/**
 * Detect if a DSS query string uses security selectors.
 */
export const isSecuritySelector = (query: string): boolean =>
  /:malware|:vuln|:vulnerable|:severity|:cve|:cwe|:squat|:scripts/.test(
    query,
  )

/**
 * Detect if a DSS query string uses a security selector that signals
 * genuine audit intent (malware, vulnerability, severity, squat, cve,
 * cwe). Unlike `isSecuritySelector`, this deliberately excludes a
 * standalone `:scripts` selector -- listing packages with lifecycle
 * scripts is a legitimate query on its own and shouldn't by itself be
 * treated as a security audit (e.g. for deciding whether to append a
 * security-summary footer to query output).
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
  const defaultQuery =
    ':malware, :vulnerable, :severity(<=low), :scripts, :squat'
  const queries: Record<string, string> = {
    low: defaultQuery,
    moderate:
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
  alerts: string[]
  /** CVE ids associated with this package's known vulnerabilities. */
  cves: string[]
  direct: boolean
}

export type AuditResult = {
  summary: {
    critical: AuditPackage[]
    high: AuditPackage[]
    moderate: AuditPackage[]
    low: AuditPackage[]
  }
  total: number
  directCount: number
  indirectCount: number
}

export type SeverityLevel = 'critical' | 'high' | 'moderate' | 'low'

/**
 * Severity levels in display order, most severe first.
 */
export const severityOrder: SeverityLevel[] = [
  'critical',
  'high',
  'moderate',
  'low',
]

/**
 * Build an empty `AuditResult['summary']` (no findings in any bucket).
 */
export const emptySummary = (): AuditResult['summary'] => ({
  critical: [],
  high: [],
  moderate: [],
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
  moderate: 2,
  low: 3,
}

const maxSeverity = (
  a: SeverityLevel,
  b: SeverityLevel,
): SeverityLevel => (severityRank[a] <= severityRank[b] ? a : b)

/**
 * Typeguard for objects with an id property.
 */
export const isNodeWithId = (
  o: unknown,
): o is { id: string; name?: string; version?: string } =>
  typeof o === 'object' &&
  o !== null &&
  'id' in o &&
  typeof o.id === 'string'

/**
 * Typeguard for a node exposing an `edgesOut` map, each edge having a
 * `.to` node with an id -- used to precompute an importer's direct
 * dependencies. `edgesOut` is bounded by that importer's own declared
 * dependencies, unlike a dependency's `edgesIn` which grows with
 * however many packages in the whole graph depend on it.
 */
export const isNodeWithEdgesOut = (
  o: unknown,
): o is {
  edgesOut: { values: () => Iterable<{ to?: { id: string } }> }
} => {
  if (typeof o !== 'object' || o === null || !('edgesOut' in o)) {
    return false
  }
  const edgesOut = o.edgesOut
  return (
    typeof edgesOut === 'object' &&
    edgesOut !== null &&
    typeof (edgesOut as { values?: unknown }).values === 'function'
  )
}

/**
 * Typeguard for objects with an id and insights property.
 */
export const isNodeWithInsights = (
  o: unknown,
): o is {
  id: string
  insights: Insights
  name?: string
  version?: string
} =>
  isNodeWithId(o) &&
  'insights' in o &&
  typeof (o as { insights: unknown }).insights === 'object' &&
  (o as { insights: unknown }).insights !== null

/**
 * Typeguard for LeveledInsights (malware, severity).
 */
export const isLeveledInsights = (
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
export const isSquatInsights = (
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
  if (insights.medium) return 'moderate'
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
  if (insights.medium) return 'moderate'
  return null
}

/**
 * Aggregate query results by severity for audit output. `warn`, if
 * provided, is called for nodes whose insights data is present but
 * does not match the expected shape (as opposed to simply absent).
 */
export const aggregateBySeverity = (
  nodes: Iterable<unknown>,
  importers: Set<unknown>,
  warn: (message: string) => void = () => {},
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
    if (!isNodeWithId(imp)) continue
    importerIds.add(imp.id)
    if (isNodeWithEdgesOut(imp)) {
      for (const edge of imp.edgesOut.values()) {
        if (edge.to) directDepIds.add(edge.to.id)
      }
    }
  }

  for (const node of nodes) {
    if (!isNodeWithInsights(node)) continue

    const insights = node.insights
    const alerts: string[] = []
    let newSeverity: SeverityLevel = 'low'

    // Check malware alerts (LeveledInsights)
    if (insights.malware) {
      if (isLeveledInsights(insights.malware)) {
        const s = getLeveledSeverity(insights.malware)
        if (s) {
          alerts.push(`malware: ${s}`)
          newSeverity = maxSeverity(newSeverity, s)
        }
      } else {
        warn(`ignoring malformed malware insights for ${node.id}`)
      }
    }

    // Check severity alerts (LeveledInsights)
    if (insights.severity) {
      if (isLeveledInsights(insights.severity)) {
        const s = getLeveledSeverity(insights.severity)
        if (s) {
          alerts.push(`severity: ${s}`)
          newSeverity = maxSeverity(newSeverity, s)
        }
      } else {
        warn(`ignoring malformed severity insights for ${node.id}`)
      }
    }

    // Check squat alerts (SquatInsights)
    if (insights.squat) {
      if (isSquatInsights(insights.squat)) {
        const s = getSquatSeverity(insights.squat)
        if (s) {
          alerts.push(`squat: ${s}`)
          newSeverity = maxSeverity(newSeverity, s)
        }
      } else {
        warn(`ignoring malformed squat insights for ${node.id}`)
      }
    }

    if (alerts.length === 0) continue

    // Direct dependency: the node itself is an importer (e.g. a
    // workspace root with its own findings), or it's one of the
    // importers' declared direct dependencies.
    const direct =
      importerIds.has(node.id) || directDepIds.has(node.id)

    const pkg: AuditPackage = {
      name: node.name ?? 'unknown',
      version: node.version ?? 'unknown',
      alerts,
      cves: Array.isArray(insights.cve) ? insights.cve : [],
      direct,
    }

    result.summary[newSeverity].push(pkg)
    result.total++
    if (direct) result.directCount++
    else result.indirectCount++
  }

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
  moderate: 'yellow',
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
        if (alert.startsWith('malware:')) counts.malware++
        else if (alert.startsWith('severity:')) counts.vulnerable++
        else if (alert.startsWith('squat:')) counts.squat++
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
 * Build one aligned line per flagged package, most severe first:
 * `severity  name@version  alert, alert, CVE-...`. Column widths are
 * computed from unstyled text so ANSI/OSC 8 escape codes (applied
 * only after padding) don't throw off alignment.
 */
const formatAuditRows = (
  result: AuditResult,
  colors?: boolean,
): string[] => {
  const rows = nonEmptySeverityBuckets(result).flatMap(
    ({ severity, pkgs }) =>
      pkgs.map(pkg => ({
        severity,
        pkgName: `${pkg.name}@${pkg.version}`,
        alerts: [
          ...pkg.alerts,
          ...pkg.cves.map(cve => hyperlink(cve, nvdUrl(cve), colors)),
        ].join(', '),
      })),
  )
  const severityWidth = Math.max(...rows.map(r => r.severity.length))
  const pkgWidth = Math.max(...rows.map(r => r.pkgName.length))

  return rows.map(({ severity, pkgName, alerts }) => {
    const severityCell = colorizeBySeverity(
      severity,
      severity.padEnd(severityWidth),
      colors,
    )
    return `  ${severityCell}  ${pkgName.padEnd(pkgWidth)}  ${alerts}`
  })
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
  lines.push(formatDependencyBreakdown(result))
  lines.push('')
  lines.push(...formatAuditRows(result, colors))

  return lines.join('\n')
}
