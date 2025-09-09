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
 * Package alert extra information.
 */
export type PackageAlertProps = {
  lastPublish: string
  cveId?: `CVE-${string}`
  cwes?: { id: `CWE-${string}` }[]
}

/**
 * A known alert for a given package.
 */
export type PackageAlert = {
  key: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  props?: PackageAlertProps
}

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
