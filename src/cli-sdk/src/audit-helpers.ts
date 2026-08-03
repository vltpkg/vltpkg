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
 * `:malware()`/`:severity()` comparators operate on the query engine's
 * own numeric scale (critical=0 ... low=3, lower = more severe; see
 * src/query/src/pseudo/severity.ts and malware.ts), so "at or above"
 * a given level is expressed as `<=` that level's value, not `>`/`>=`.
 */
export const buildAuditQuery = (level: string): string => {
  const defaultQuery =
    ':malware, :vulnerable, :severity(<=low), :scripts, :squat'
  const queries: Record<string, string> = {
    low: defaultQuery,
    moderate: ':malware(<=medium), :severity(<=medium)',
    high: ':malware(<=high), :severity(<=high)',
    critical: ':malware(critical), :severity(critical)',
  }
  return queries[level] ?? defaultQuery
}

export type AuditPackage = {
  name: string
  version: string
  alerts: string[]
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
 * True if any edge in `edgesIn` comes from a node whose id is in
 * `ids`. Iterates directly rather than spreading into an array, and
 * short-circuits on the first match.
 */
const hasEdgeFrom = (
  edgesIn: Iterable<{ from: { id: string } }>,
  ids: Set<string>,
): boolean => {
  for (const edge of edgesIn) {
    if (ids.has(edge.from.id)) return true
  }
  return false
}

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
 * Typeguard for a node exposing an `edgesIn` set, each edge having a
 * `.from` node with an id -- used to detect direct dependencies.
 */
export const isNodeWithEdgesIn = (
  o: unknown,
): o is { edgesIn: Iterable<{ from: { id: string } }> } => {
  if (typeof o !== 'object' || o === null || !('edgesIn' in o)) {
    return false
  }
  const edgesIn = o.edgesIn
  return (
    typeof edgesIn === 'object' &&
    edgesIn !== null &&
    Symbol.iterator in edgesIn
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
  const importerIds = new Set(
    [...importers].filter(isNodeWithId).map(imp => imp.id),
  )

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
    // workspace root with its own findings), or some importer has an
    // edge directly into it.
    const direct =
      importerIds.has(node.id) ||
      (isNodeWithEdgesIn(node) &&
        hasEdgeFrom(node.edgesIn, importerIds))

    const pkg: AuditPackage = {
      name: node.name ?? 'unknown',
      version: node.version ?? 'unknown',
      alerts,
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
 * Filter audit results to only include severities at or above the minimum.
 */
export const filterAuditResult = (
  result: AuditResult,
  minSeverity: SeverityLevel,
): AuditResult => {
  const minRank = severityRank[minSeverity]
  const filtered: AuditResult = {
    ...emptyAuditResult(),
    directCount: result.directCount,
    indirectCount: result.indirectCount,
  }
  for (const sev of severityOrder) {
    if (severityRank[sev] > minRank) continue
    const pkgs = result.summary[sev]
    filtered.summary[sev] = pkgs
    filtered.total += pkgs.length
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
 * Format a severity bucket heading (e.g. "critical (2)"), styled with
 * the conventional severity color when `colors` is true. Shared by
 * any view that renders a severity breakdown (e.g. `vlt audit`'s
 * human view and `vlt query`'s security-summary footer).
 */
export const formatSeverityHeading = (
  severity: SeverityLevel,
  count: number,
  colors?: boolean,
): string => {
  const label = `${severity} (${count})`
  return colors ? styleText(severityFormat[severity], label) : label
}

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

/**
 * Format the "N direct dependency/dependencies, M transitive" footer
 * line shared by `formatAuditSummary` and `vlt query`'s
 * security-summary footer.
 */
export const formatDirectTransitiveFooter = (
  result: AuditResult,
): string => {
  const directWord =
    result.directCount === 1 ? 'dependency' : 'dependencies'
  return `${result.directCount} direct ${directWord}, ${result.indirectCount} transitive`
}

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
  lines.push('')

  for (const { severity, pkgs } of nonEmptySeverityBuckets(result)) {
    lines.push(
      `  ${formatSeverityHeading(severity, pkgs.length, colors)}`,
    )
    for (const pkg of pkgs) {
      lines.push(`    ${pkg.name}@${pkg.version}`)
      for (const alert of pkg.alerts) {
        lines.push(`      ${alert}`)
      }
    }
    lines.push('')
  }

  lines.push(formatDirectTransitiveFooter(result))

  return lines.join('\n')
}
