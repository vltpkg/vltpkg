import { asDepID } from '@vltpkg/dep-id/browser'
import { error } from '@vltpkg/error-cause'
import { asPackageReportData } from './types.ts'
import type { JSONField } from '@vltpkg/types'
import type {
  PackageReportData,
  SecurityArchiveLike,
} from './types.ts'
import type { DepID } from '@vltpkg/dep-id'

export type * from './types.ts'

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
