import type { Insights } from '@vltpkg/query'

/**
 * Detect if a DSS query string uses security selectors.
 */
export const isSecuritySelector = (query: string): boolean =>
  /:malware|:vuln|:vulnerable|:severity|:cve|:cwe|:squat|:scripts/.test(
    query,
  )

/**
 * Build a DSS query string from an audit level.
 */
export const buildAuditQuery = (level: string): string => {
  const queries: Record<string, string> = {
    low: ':malware, :vulnerable, :severity(>low), :scripts, :squat',
    moderate: ':malware(>low), :severity(>=medium)',
    high: ':malware(>medium), :severity(>medium)',
    critical: ':malware(critical), :severity(critical)',
  }
  return queries[level] ?? queries.low
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
  typeof (o).id === 'string'

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
 * Aggregate query results by severity for audit output.
 */
export const aggregateBySeverity = (
  nodes: Iterable<unknown>,
  importers: Set<unknown>,
): AuditResult => {
  const result: AuditResult = {
    summary: { critical: [], high: [], moderate: [], low: [] },
    total: 0,
    directCount: 0,
    indirectCount: 0,
  }

  for (const node of nodes) {
    if (!isNodeWithInsights(node)) continue

    const insights = node.insights
    const alerts: string[] = []
    let newSeverity: SeverityLevel = 'low'

    // Check malware alerts (LeveledInsights)
    if (insights.malware && isLeveledInsights(insights.malware)) {
      const s = getLeveledSeverity(insights.malware)
      if (s) {
        alerts.push(`malware: ${s}`)
        newSeverity = maxSeverity(newSeverity, s)
      }
    }

    // Check severity alerts (LeveledInsights)
    if (insights.severity && isLeveledInsights(insights.severity)) {
      const s = getLeveledSeverity(insights.severity)
      if (s) {
        alerts.push(`severity: ${s}`)
        newSeverity = maxSeverity(newSeverity, s)
      }
    }

    // Check squat alerts (SquatInsights)
    if (insights.squat && isSquatInsights(insights.squat)) {
      const s = getSquatSeverity(insights.squat)
      if (s) {
        alerts.push(`squat: ${s}`)
        newSeverity = maxSeverity(newSeverity, s)
      }
    }

    if (alerts.length === 0) continue

    // Check if node is a direct dependency (in importers set)
    let direct = false
    for (const imp of importers) {
      if (isNodeWithId(imp) && imp.id === node.id) {
        direct = true
        break
      }
    }

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
    summary: { critical: [], high: [], moderate: [], low: [] },
    total: 0,
    directCount: result.directCount,
    indirectCount: result.indirectCount,
  }
  const severityOrder: SeverityLevel[] = [
    'critical',
    'high',
    'moderate',
    'low',
  ]
  for (const sev of severityOrder) {
    if (severityRank[sev] > minRank) continue
    const pkgs = result.summary[sev]
    filtered.summary[sev] = pkgs
    filtered.total += pkgs.length
  }
  return filtered
}

const severityOrder = ['critical', 'high', 'moderate', 'low'] as const

/**
 * Format audit result as human-readable summary text.
 */
export const formatAuditSummary = (result: AuditResult): string => {
  if (result.total === 0) {
    return 'found 0 security issues\n'
  }

  const lines: string[] = []
  lines.push(
    `found ${result.total} security issue${result.total === 1 ? '' : 's'}`,
  )
  lines.push('')

  for (const severity of severityOrder) {
    const pkgs = result.summary[severity]
    if (pkgs.length === 0) continue

    lines.push(`  ${severity} (${pkgs.length})`)
    for (const pkg of pkgs) {
      lines.push(`    ${pkg.name}@${pkg.version}`)
      for (const alert of pkg.alerts) {
        lines.push(`      ${alert}`)
      }
    }
    lines.push('')
  }

  const directWord =
    result.directCount === 1 ? 'dependency' : 'dependencies'
  lines.push(
    `${result.directCount} direct ${directWord}, ${result.indirectCount} transitive`,
  )

  return lines.join('\n')
}
