/**
 * Cache utilities for efficient upstream package management
 *
 * Strategy:
 * - Return cached data immediately when available (even if stale)
 * - Queue background refresh if cache is stale
 * - Only fetch upstream synchronously if no cache exists
 * - Use Cloudflare Queues for reliable background processing
 */

import type {
  HonoContext,
  CacheOptions,
  CacheResult,
  CacheValidation,
  QueueMessage,
  PackageManifest,
  DatabaseOperations,
  ParsedPackage,
} from '../../types.ts'

// Helper function to get typed database from context
function getDb(c: HonoContext): DatabaseOperations {
  return c.get('db')
}

/**
 * Stale-while-revalidate cache strategy for package data
 * Returns stale cache immediately and refreshes in background via queue
 */
export async function getCachedPackageWithRefresh<T>(
  c: HonoContext,
  packageName: string,
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions = {},
): Promise<CacheResult<T>> {
  const {
    packumentTtlMinutes = 5, // Short TTL for packuments (they change frequently)
    staleWhileRevalidateMinutes = 60, // Allow stale data for up to 1 hour while refreshing
    forceRefresh = false,
    upstream = 'npm',
  } = options

  // If forcing refresh, skip cache entirely
  if (forceRefresh) {
    const upstreamData = await fetchUpstreamFn()
    c.waitUntil?.(
      cachePackageData(c, packageName, upstreamData, options),
    )
    return {
      package: upstreamData,
      fromCache: false,
    }
  }

  // Get cached data first
  const cachedResult = await getCachedPackageData(
    c,
    packageName,
    packumentTtlMinutes,
    staleWhileRevalidateMinutes,
  )

  if (cachedResult.data) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { valid, stale, data } = cachedResult

    if (valid) {
      // Cache is fresh - return immediately
      return {
        package: data as T,
        fromCache: true,
        stale: false,
      }
    } else if (stale) {
      // Cache is stale but within stale-while-revalidate window
      // Return stale data immediately and queue background refresh

      // Queue background refresh using Cloudflare Queues
      if (c.env.CACHE_REFRESH_QUEUE) {
        await queuePackageRefresh(
          c,
          packageName,
          upstream,
          fetchUpstreamFn,
          options,
        )
      } else {
        // Fallback to waitUntil if queue not available
        c.waitUntil?.(
          refreshPackageInBackground(
            c,
            packageName,
            fetchUpstreamFn,
            options,
          ),
        )
      }

      return {
        package: data as T,
        fromCache: true,
        stale: true,
      }
    }
  }

  // No cache data available - fetch upstream synchronously
  const upstreamData = await fetchUpstreamFn()

  // Cache the fresh data in background
  c.waitUntil?.(
    cachePackageData(c, packageName, upstreamData, options),
  )

  return {
    package: upstreamData,
    fromCache: false,
    stale: false,
  }
}

/**
 * Queue a package refresh job using Cloudflare Queues
 * Note: We can't serialize functions, so we'll need to recreate the fetch function in the queue consumer
 */
async function queuePackageRefresh<T>(
  c: HonoContext,
  packageName: string,
  upstream: string,
  _fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions,
): Promise<void> {
  try {
    const message: QueueMessage = {
      type: 'package_refresh',
      packageName,
      upstream,
      timestamp: Date.now(),
      options: {
        packumentTtlMinutes: options.packumentTtlMinutes || 5,
        upstream: options.upstream || 'npm',
      },
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await c.env.CACHE_REFRESH_QUEUE.send(message)
  } catch (_error) {
    // Background queue failed, but don't block the response
    // Log to monitoring system instead of console
  }
}

/**
 * Background refresh function (fallback when queue is not available)
 */
async function refreshPackageInBackground<T>(
  c: HonoContext,
  packageName: string,
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions,
): Promise<void> {
  try {
    const upstreamData = await fetchUpstreamFn()
    await cachePackageData(c, packageName, upstreamData, options)
  } catch (_error) {
    // Background queue failed, but don't block the response
    // Log to monitoring system instead of console
  }
}

/**
 * Reconstruct a full packument from cached database data
 */
async function reconstructPackumentFromCache(
  c: HonoContext,
  packageName: string,
  cachedPackage: ParsedPackage,
): Promise<any> {
  try {
    // Get all versions for this package
    const versions = await getDb(c).getVersionsByPackage(packageName)

    // Build the versions object

    const versionsObject: Record<string, any> = {}

    const timeObject: Record<string, string> = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      modified:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (cachedPackage as any).lastUpdated ||
        new Date().toISOString(),
    }

    versions.forEach(versionData => {
      if (versionData.version) {
        versionsObject[versionData.version] = versionData.manifest
        if (versionData.published_at) {
          timeObject[versionData.version] = versionData.published_at
        }
      }
    })

    // Parse tags from the cached package
    const distTags =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      typeof (cachedPackage as any).tags === 'string' ?
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        (JSON.parse((cachedPackage as any).tags || '{}') as Record<
          string,
          string
        >)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      : ((cachedPackage as any).tags as Record<string, string>)

    // Construct the packument structure
    return {
      name: packageName,
      'dist-tags': distTags,
      versions: versionsObject,
      time: timeObject,
    }
  } catch (error) {
    // TODO: Replace with proper logging system
    // eslint-disable-next-line no-console
    console.error(
      'Failed to reconstruct packument from cache:',
      error,
    )
    return null
  }
}

/**
 * Enhanced cache data retrieval with stale-while-revalidate support
 */
async function getCachedPackageData(
  c: HonoContext,
  packageName: string,
  ttlMinutes: number,
  staleWhileRevalidateMinutes: number,
): Promise<CacheValidation> {
  try {
    const cachedPackage = await getDb(c).getCachedPackage(packageName)

    if (
      !cachedPackage?.cachedAt ||
      cachedPackage.origin !== 'upstream'
    ) {
      return { valid: false, stale: false, data: null }
    }

    const cacheTime = new Date(cachedPackage.cachedAt).getTime()
    const now = new Date().getTime()
    const ttlMs = ttlMinutes * 60 * 1000
    const staleMs = staleWhileRevalidateMinutes * 60 * 1000

    const age = now - cacheTime
    const isValid = age < ttlMs
    const isStale = age < staleMs // Still usable even if stale

    // Reconstruct the full packument from cached data
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const reconstructedPackument =
      await reconstructPackumentFromCache(
        c,
        packageName,
        cachedPackage,
      )

    return {
      valid: isValid,
      stale: isStale && !isValid, // Stale means expired but within stale window
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: reconstructedPackument,
    }
  } catch (_error) {
    // Log error to monitoring system instead of console
    return { valid: false, stale: false, data: null }
  }
}

/**
 * Stale-while-revalidate cache strategy for version data
 * Returns stale cache immediately and refreshes in background via queue
 */
export async function getCachedVersionWithRefresh<T>(
  c: HonoContext,
  spec: string,
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions = {},
): Promise<CacheResult<T>> {
  const {
    manifestTtlMinutes = 525600, // 1 year TTL for manifests
    staleWhileRevalidateMinutes = 1051200, // Allow stale for 2 years (manifests rarely change)
    forceRefresh = false,
    upstream = 'npm',
  } = options

  // If forcing refresh, skip cache entirely
  if (forceRefresh) {
    const upstreamData = await fetchUpstreamFn()
    c.waitUntil?.(cacheVersionData(c, spec, upstreamData, options))
    return {
      version: upstreamData,
      fromCache: false,
    }
  }

  // Get cached data first
  const cachedResult = await getCachedVersionData(
    c,
    spec,
    manifestTtlMinutes,
    staleWhileRevalidateMinutes,
  )

  if (cachedResult.data) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { valid, stale, data } = cachedResult

    if (valid) {
      // Cache is fresh - return immediately
      return {
        version: data as T,
        fromCache: true,
        stale: false,
      }
    } else if (stale) {
      // Cache is stale but within stale-while-revalidate window
      // Return stale data immediately and queue background refresh

      // Queue background refresh using Cloudflare Queues
      if (c.env.CACHE_REFRESH_QUEUE) {
        await queueVersionRefresh(
          c,
          spec,
          upstream,
          fetchUpstreamFn,
          options,
        )
      } else {
        // Fallback to waitUntil if queue not available
        c.waitUntil?.(
          refreshVersionInBackground(
            c,
            spec,
            fetchUpstreamFn,
            options,
          ),
        )
      }

      return {
        version: data as T,
        fromCache: true,
        stale: true,
      }
    }
  }

  // No cache data available - fetch upstream synchronously
  const upstreamData = await fetchUpstreamFn()

  // Cache the fresh data in background
  c.waitUntil?.(cacheVersionData(c, spec, upstreamData, options))

  return {
    version: upstreamData,
    fromCache: false,
    stale: false,
  }
}

/**
 * Queue a version refresh job using Cloudflare Queues
 */
async function queueVersionRefresh<T>(
  c: HonoContext,
  spec: string,
  upstream: string,
  _fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions,
): Promise<void> {
  try {
    const message: QueueMessage = {
      type: 'version_refresh',
      spec,
      upstream,
      timestamp: Date.now(),
      options: {
        manifestTtlMinutes: options.manifestTtlMinutes || 525600,
        upstream: options.upstream || 'npm',
      },
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await c.env.CACHE_REFRESH_QUEUE.send(message)
  } catch (_error) {
    // Background queue failed, but don't block the response
    // Log to monitoring system instead of console
  }
}

/**
 * Background refresh function for versions (fallback when queue is not available)
 */
async function refreshVersionInBackground<T>(
  c: HonoContext,
  spec: string,
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions,
): Promise<void> {
  try {
    const upstreamData = await fetchUpstreamFn()
    await cacheVersionData(c, spec, upstreamData, options)
  } catch (_error) {
    // Background queue failed, but don't block the response
    // Log to monitoring system instead of console
  }
}

/**
 * Enhanced cache data retrieval for versions with stale-while-revalidate support
 */
async function getCachedVersionData(
  c: HonoContext,
  spec: string,
  ttlMinutes: number,
  staleWhileRevalidateMinutes: number,
): Promise<CacheValidation> {
  try {
    const cachedVersion = await getDb(c).getCachedVersion(spec)

    if (
      !cachedVersion?.cachedAt ||
      cachedVersion.origin !== 'upstream'
    ) {
      return { valid: false, stale: false, data: null }
    }

    const cacheTime = new Date(cachedVersion.cachedAt).getTime()
    const now = new Date().getTime()
    const ttlMs = ttlMinutes * 60 * 1000
    const staleMs = staleWhileRevalidateMinutes * 60 * 1000

    const age = now - cacheTime
    const isValid = age < ttlMs
    const isStale = age < staleMs // Still usable even if stale

    return {
      valid: isValid,
      stale: isStale && !isValid, // Stale means expired but within stale window
      data: cachedVersion,
    }
  } catch (_error) {
    // Log error to monitoring system instead of console
    return { valid: false, stale: false, data: null }
  }
}

/**
 * Cache package data in the database
 */
async function cachePackageData(
  c: HonoContext,
  packageName: string,
  packageData: unknown,
  options: CacheOptions,
): Promise<void> {
  try {
    if (
      packageData &&
      typeof packageData === 'object' &&
      'dist-tags' in packageData
    ) {
      const tags =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-member-access
        ((packageData as any)['dist-tags'] as Record<
          string,
          string
        >) || {}
      await getDb(c).upsertCachedPackage(
        packageName,
        tags,
        options.upstream ?? 'npm',
      )
    }
  } catch (_error) {
    // Log error to monitoring system instead of console
  }
}

/**
 * Cache version data in the database
 */
async function cacheVersionData(
  c: HonoContext,
  spec: string,
  versionData: unknown,
  options: CacheOptions,
): Promise<void> {
  try {
    if (versionData && typeof versionData === 'object') {
      const manifest = versionData as unknown as PackageManifest
      const publishedAt = new Date().toISOString()
      await getDb(c).upsertCachedVersion(
        spec,
        manifest,
        options.upstream ?? 'npm',
        publishedAt,
      )
    }
  } catch (_error) {
    // Log error to monitoring system instead of console
  }
}

/**
 * Generate storage path for tarball cache
 */
export function getTarballStoragePath(
  packageName: string,
  version: string,
  origin: 'local' | 'upstream' = 'local',
  upstream: string | null = null,
): string {
  const sanitizedName = packageName.replace(/[@/]/g, '_')
  const sanitizedVersion = version.replace(/[^a-zA-Z0-9.-]/g, '_')

  if (origin === 'upstream' && upstream) {
    return `tarballs/${upstream}/${sanitizedName}/${sanitizedVersion}.tgz`
  }

  return `tarballs/local/${sanitizedName}/${sanitizedVersion}.tgz`
}

/**
 * Check if tarball is cached
 */
export async function isTarballCached(
  _c: HonoContext,
  packageName: string,
  version: string,
  origin: 'local' | 'upstream' = 'local',
  upstream: string | null = null,
): Promise<boolean> {
  try {
    const _storagePath = getTarballStoragePath(
      packageName,
      version,
      origin,
      upstream,
    )
    // This would need to be implemented based on your storage solution
    // For now, return false as a placeholder
    return false
  } catch (_error) {
    // Log error to monitoring system instead of console
    return false
  }
}

/**
 * Cache tarball data
 */
export async function cacheTarball(
  _c: HonoContext,
  packageName: string,
  version: string,
  _tarballStream: ReadableStream,
  origin: 'local' | 'upstream' = 'local',
  upstream: string | null = null,
): Promise<void> {
  try {
    const _storagePath = getTarballStoragePath(
      packageName,
      version,
      origin,
      upstream,
    )
    // This would need to be implemented based on your storage solution
  } catch (_error) {
    // Log error to monitoring system instead of console
  }
}
