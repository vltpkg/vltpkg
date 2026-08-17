import { error } from '@vltpkg/error-cause'
import type { DepID } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/types'

/**
 * Parameter options for initializing a security archive.
 */
export type SecurityArchiveRefreshOptions = {
  /**
   * A @link{GraphLike} instance to find what packages the
   * security archive should have.
   */
  nodes: NodeLike[]
}

/**
 * An interface for interacting with a security archive.
 */
export interface SecurityArchiveLike {
  get: (depId: DepID) => PackageReportData | undefined
  set: (depId: DepID, data: PackageReportData) => void
  delete: (depId: DepID) => void
  has: (depId: DepID) => boolean
  clear: () => void
  ok?: boolean
}

export const isSecurityArchiveLike = (
  o: unknown,
): o is SecurityArchiveLike =>
  typeof o === 'object' &&
  o != null &&
  'get' in o &&
  'set' in o &&
  'delete' in o &&
  'has' in o &&
  'clear' in o

export const asSecurityArchiveLike = (
  o: unknown,
): SecurityArchiveLike => {
  if (!isSecurityArchiveLike(o)) {
    throw error('Invalid security archive like', { found: o })
  }
  return o
}

/**
 * Known alert types from Socket.dev and vlt
 */
export type AlertType =
  // vulnerabilities -- the feed grades CVEs by name as well as by the
  // alert's `severity` field
  | 'cve'
  | 'mildCVE'
  | 'mediumCVE'
  | 'highCVE'
  | 'criticalCVE'
  | 'potentialVulnerability'
  | 'severity'
  | 'vulnerability'
  | 'gptSecurity'
  | 'gptAnomaly'
  // malware and impersonation
  | 'malware'
  | 'gptMalware'
  | 'didYouMean'
  | 'gptDidYouMean'
  | 'squatting'
  | 'troll'
  // maintenance and provenance
  | 'deprecated'
  | 'manifestConfusion'
  | 'missingAuthor'
  | 'newAuthor'
  | 'shrinkwrap'
  | 'suspiciousStarActivity'
  | 'trivialPackage'
  | 'unmaintained'
  | 'unpopularPackage'
  | 'unstableOwnership'
  // licensing
  | 'ambiguousClassifier'
  | 'copyleftLicense'
  | 'explicitlyUnlicensedItem'
  | 'licenseException'
  | 'miscLicenseIssues'
  | 'noLicenseFound'
  | 'nonpermissiveLicense'
  | 'unidentifiedLicense'
  // install-time and runtime behaviour
  | 'debugAccess'
  | 'dynamicRequire'
  | 'envVars'
  | 'filesystemAccess'
  | 'hasNativeCode'
  | 'highEntropyStrings'
  | 'installScripts'
  | 'minifiedFile'
  | 'networkAccess'
  | 'obfuscatedFile'
  | 'shellAccess'
  | 'telemetry'
  | 'urlStrings'
  | 'usesEval'
  // the upstream feed adds alert types faster than this union can
  // track them; keeping the fallback means an unrecognized type still
  // flows through to output instead of failing to typecheck
  | (string & {})

/**
 * Known alert categories
 */
/**
 * The feed's six categories. Note what is absent: `malware`,
 * `severity` and `squat` are alert *types*, not categories -- malware
 * and typosquatting are filed under `supplyChainRisk`, and CVEs under
 * `vulnerability`. Classifying on category alone therefore cannot
 * distinguish malware from any other supply-chain finding.
 */
export type AlertCategory =
  | 'supplyChainRisk'
  | 'quality'
  | 'maintenance'
  | 'vulnerability'
  | 'license'
  | 'other'

/**
 * Alert types that contain vulnerability/CVE information
 */
export type VulnerabilityAlertType =
  | 'cve'
  | 'mildCVE'
  | 'mediumCVE'
  | 'highCVE'
  | 'criticalCVE'
  | 'potentialVulnerability'
  | 'vulnerability'
  | 'gptSecurity'
  | 'gptAnomaly'

/**
 * Package alert extra information.
 * Includes CVE-specific fields that are only populated for vulnerability alerts.
 */
export type PackageAlertProps = {
  lastPublish: string
  cveId?: `CVE-${string}`
  cwes?: { id: `CWE-${string}` }[]
  // CVE-specific fields from Socket.dev (only for vulnerability alerts)
  title?: string
  description?: string
  cvss?: {
    score: number
    vectorString: string
  }
  vulnerableVersionRange?: string
  // Other alert-specific fields
  linesOfCode?: number
  [key: string]: unknown
}

/**
 * An alert's severity as it arrives on the wire, exactly the four values
 * the endpoint documents. Note `middle` and the absence of `medium`:
 * `middle` is the feed's spelling, so a consumer with its own
 * `medium`-named scale has to map it rather than compare directly.
 */
export type AlertSeverity = 'low' | 'middle' | 'high' | 'critical'

/**
 * The feed's own policy verdict for an alert. `ignore` covers the large
 * majority of alerts on ordinary packages, so consumers should respect
 * it rather than reporting everything.
 *
 * The endpoint types this as a plain string and only gives these four by
 * example, so the union stays open -- an unrecognized verdict should
 * flow through rather than fail to typecheck.
 */
export type AlertAction =
  'error' | 'warn' | 'monitor' | 'ignore' | (string & {})

/**
 * How an alert can be fixed, when it can be. Present only when a fix
 * exists, which makes its presence an authoritative answer to "is this
 * fixable" -- no registry resolution required.
 *
 * `description` is upstream prose that names Socket's own CLI, so it is
 * not suitable for rendering verbatim in another tool's output.
 */
export type AlertFix = {
  /** e.g. `upgrade`, `remove`, `cve` */
  type: string
  description: string
  patch?: AlertPatch[]
}

/** A `SocketPatch`, referenced from an alert or its fix. */
export type AlertPatch = {
  uuid: string
  tier: 'free' | 'paid'
  deprecated?: boolean
}

/** Which policy rule produced an alert's `action`. */
export type AlertActionSource = {
  type?: string
  candidates?: {
    type?: string
    action?: AlertAction
    actionPolicyIndex?: number
    repoLabelId?: string
  }[]
}

export type PackageAlert = {
  key: string
  type: AlertType
  /** Optional upstream, so consumers must handle its absence. */
  severity?: AlertSeverity
  /** Optional upstream, so consumers must handle its absence. */
  category?: AlertCategory
  props?: PackageAlertProps
  action?: AlertAction
  actionSource?: AlertActionSource
  actionPolicyIndex?: number
  fix?: AlertFix
  patch?: AlertPatch
  /** Reachability analysis, when the endpoint returns it. */
  reachability?: { head?: unknown; base?: unknown }
  /** Generic alert sub-type. */
  subType?: string
  /** Where in the package the alert was detected. */
  file?: string
  start?: number
  end?: number
}

/**
 * Type guard to check if an alert is a vulnerability/CVE alert
 */
const vulnerabilityAlertTypes = new Set<string>([
  'cve',
  'mildCVE',
  'mediumCVE',
  'highCVE',
  'criticalCVE',
  'potentialVulnerability',
  'vulnerability',
  'gptSecurity',
  'gptAnomaly',
])

export const isVulnerabilityAlert = (
  alert: PackageAlert,
): alert is PackageAlert & { type: VulnerabilityAlertType } =>
  vulnerabilityAlertTypes.has(alert.type)

/**
 * The scores for a given package
 */
export type PackageScore = {
  /**
   * The average of all score factors. (0-1)
   */
  overall: number
  /**
   * Score factors relating to package licensing (0-1)
   */
  license: number
  /**
   * Score factors relating to package maintenance (0-1)
   */
  maintenance: number
  /**
   * Score factors relating to code quality (0-1)
   */
  quality: number
  /**
   * Score factors relating to supply chain security (0-1)
   */
  supplyChain: number
  /**
   * Score factors relating to package vulnerabilities (0-1)
   */
  vulnerability: number
}

/**
 * The report data for a given package.
 */
export type PackageReportData = {
  id: string
  author: string[]
  size: number
  type: 'npm'
  namespace?: `@${string}`
  name: string
  version: string
  license: string
  alerts: PackageAlert[]
  score: PackageScore
}

export const isPackageReportData = (
  o: unknown,
): o is PackageReportData =>
  typeof o === 'object' &&
  o != null &&
  'id' in o &&
  'type' in o &&
  'name' in o &&
  'version' in o &&
  'alerts' in o &&
  'score' in o &&
  o.type === 'npm'

export const asPackageReportData = (
  o: unknown,
): PackageReportData => {
  if (!isPackageReportData(o)) {
    throw error('Invalid package report data', { found: o })
  }
  return o
}
