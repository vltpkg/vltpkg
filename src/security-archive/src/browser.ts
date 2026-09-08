import {
  asDepID,
  baseDepID,
  splitDepID,
} from '@vltpkg/dep-id/browser'
import { error } from '@vltpkg/error-cause'
import { defaultRegistryName } from '@vltpkg/spec/browser'
import { asPackageReportData } from './types.ts'
import type { JSONField, NodeLike } from '@vltpkg/types'
import type {
  PackageReportData,
  SecurityArchiveLike,
} from './types.ts'
import type { DepID } from '@vltpkg/dep-id'

export * from './types.ts'

export const npmRegistryURL = 'https://registry.npmjs.org/'

const normalizeRegistryURL = (url: string): string =>
  url.endsWith('/') ? url : `${url}/`

const nodeRegistryURL = (node: NodeLike): string | undefined => {
  const [type, reg] = splitDepID(node.id)
  if (type !== 'registry') return
  const url =
    /^https?:\/\//.test(reg) ? reg : node.options.registries?.[reg]
  return url ? normalizeRegistryURL(url) : undefined
}

/**
 * Socket.dev only has reports for the public npm ecosystem. Eligible
 * when the node's origin is `https://registry.npmjs.org/` or the URL
 * configured as `registries.npm`.
 */
export const usesNpmRegistry = (node: NodeLike): boolean => {
  const origin = nodeRegistryURL(node)
  if (!origin) return false
  if (origin === npmRegistryURL) return true
  const npmAlias = node.options.registries?.[defaultRegistryName]
  return !!npmAlias && normalizeRegistryURL(npmAlias) === origin
}

const isObj = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === 'object'

const isSecurityArchiveJSON = (
  json: unknown,
): json is Record<string, JSONField> =>
  isObj(json) &&
  Object.entries(json).every(
    ([key, value]) => typeof key === 'string' && isObj(value),
  )

const asSecurityArchiveJSON = (
  json: unknown,
): Record<string, JSONField> => {
  if (!isSecurityArchiveJSON(json)) {
    throw error('Invalid security archive JSON', { found: json })
  }
  return json
}

/**
 * A database of security information for given packages in a graph.
 */
export class SecurityArchive
  extends Map<DepID, PackageReportData>
  implements SecurityArchiveLike
{
  /**
   * Whether the security archive is valid.
   */
  ok = false

  /**
   * Get the report data for a node, keyed by its base {@link DepID}.
   */
  override get(depId: DepID): PackageReportData | undefined {
    return super.get(baseDepID(depId))
  }

  /**
   * Check for report data, keyed by the base {@link DepID}.
   */
  override has(depId: DepID): boolean {
    return super.has(baseDepID(depId))
  }

  /**
   * Store report data for a node, keyed by its base {@link DepID} so
   * peer-suffixed copies of the same package share one entry.
   */
  override set(depId: DepID, data: PackageReportData): this {
    return super.set(baseDepID(depId), data)
  }

  /**
   * Delete the report data stored under the base {@link DepID}.
   */
  override delete(depId: DepID): boolean {
    return super.delete(baseDepID(depId))
  }

  /**
   * Loads a security archive from a valid JSON dump.
   */
  static load(dump: unknown) {
    if (dump === undefined) return undefined

    const archive = new SecurityArchive()
    const json = asSecurityArchiveJSON(dump)
    for (const [key, value] of Object.entries(json)) {
      archive.set(asDepID(key), asPackageReportData(value))
    }
    return archive
  }
}
