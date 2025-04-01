import { error } from '@vltpkg/error-cause'
import type { DepID } from '@vltpkg/dep-id'
import type { GraphLike } from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec'

/**
 * Parameter options for initializing a security archive.
 */
export type SecurityArchiveRefreshOptions = {
  /**
   * A @link{GraphLike} instance to find what packages the
   * security archive should have.
   */
  graph: GraphLike
  /**
   * A @link{SpecOptions} instance to use for resolving dependencies.
   */
  specOptions: SpecOptions
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
  cveId: `CVE-${string}`
  cwes: { id: `CWE-${string}` }[]
}

/**
 * A known alert for a given package.
 */
export type PackageAlert = {
  key: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  props: PackageAlertProps
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
  o.type === 'npm'

export const asPackageReportData = (
  o: unknown,
): PackageReportData => {
  if (!isPackageReportData(o)) {
    throw error('Invalid package report data', { found: o })
  }
  return o
}
