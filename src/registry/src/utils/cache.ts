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
  ParsedPackage,
  ParsedVersion,
  PackageManifest
} from '../../types.ts'

/**
 * Stale-while-revalidate cache strategy for package data
 * Returns stale cache immediately and refreshes in background via queue
 */
export async function getCachedPackageWithRefresh<T>(
  c: HonoContext,
  packageName: string,
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<CacheResult<T>> {
  const {
    packumentTtlMinutes = 5,      // Short TTL for packuments (they change frequently)
    staleWhileRevalidateMinutes = 60, // Allow stale data for up to 1 hour while refreshing
    forceRefresh = false,
    upstream = 'npm'
  } = options

  // If forcing refresh, skip cache entirely
  if (forceRefresh) {
    console.log(`[CACHE] Force refresh requested for: ${packageName}`)
    const upstreamData = await fetchUpstreamFn()
    if (upstreamData) {
      c.waitUntil?.(cachePackageData(c, packageName, upstreamData, options))
    }
    return {
      package: upstreamData,
      fromCache: false,
    }
  }

  try {
    // Get cached data first
    const cachedResult = await getCachedPackageData(c, packageName, packumentTtlMinutes, staleWhileRevalidateMinutes)

    if (cachedResult.data) {
      const { valid, stale, data } = cachedResult

      if (valid) {
        // Cache is fresh - return immediately
        console.log(`[CACHE] Using fresh cached package: ${packageName}`)
        return {
          package: data as T,
          fromCache: true,
          stale: false
        }
      } else if (stale) {
        // Cache is stale but within stale-while-revalidate window
        // Return stale data immediately and queue background refresh
        console.log(`[CACHE] Using stale data for ${packageName}, queuing background refresh`)

        // Queue background refresh using Cloudflare Queues
        if (c.env.CACHE_REFRESH_QUEUE) {
          await queuePackageRefresh(c, packageName, upstream, fetchUpstreamFn, options)
        } else {
          // Fallback to waitUntil if queue not available
          console.log(`[CACHE] Queue not available, using waitUntil fallback for ${packageName}`)
          c.waitUntil?.(refreshPackageInBackground(c, packageName, fetchUpstreamFn, options))
        }

        return {
          package: data as T,
          fromCache: true,
          stale: true
        }
      }
    }

    // No cache data available - fetch upstream synchronously
    console.log(`[CACHE] No cache available for ${packageName}, fetching upstream`)
    const upstreamData = await fetchUpstreamFn()

    // Cache the fresh data in background
    c.waitUntil?.(cachePackageData(c, packageName, upstreamData, options))

    return {
      package: upstreamData,
      fromCache: false,
      stale: false
    }

  } catch (error) {
    console.error(`[CACHE ERROR] Failed to get cached package ${packageName}: ${(error as Error).message}`)
    throw error
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
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions
): Promise<void> {
  try {
    const message: QueueMessage = {
      type: 'package_refresh',
      packageName,
      upstream,
      timestamp: Date.now(),
      options: {
        packumentTtlMinutes: options.packumentTtlMinutes || 5,
        upstream: options.upstream || 'npm'
      }
    }

    await c.env.CACHE_REFRESH_QUEUE.send(message)
    console.log(`[QUEUE] Queued refresh for package: ${packageName}`)
  } catch (error) {
    console.error(`[QUEUE ERROR] Failed to queue refresh for ${packageName}: ${(error as Error).message}`)
    // Fallback to immediate background refresh
    c.waitUntil?.(refreshPackageInBackground(c, packageName, fetchUpstreamFn, options))
  }
}

/**
 * Background refresh function (fallback when queue is not available)
 */
async function refreshPackageInBackground<T>(
  c: HonoContext,
  packageName: string,
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions
): Promise<void> {
  try {
    console.log(`[BACKGROUND] Refreshing package data for: ${packageName}`)
    const upstreamData = await fetchUpstreamFn()
    await cachePackageData(c, packageName, upstreamData, options)
    console.log(`[BACKGROUND] Successfully refreshed package: ${packageName}`)
  } catch (error) {
    console.error(`[BACKGROUND ERROR] Failed to refresh package ${packageName}: ${(error as Error).message}`)
  }
}

/**
 * Enhanced cache data retrieval with stale-while-revalidate support
 */
async function getCachedPackageData(
  c: HonoContext,
  packageName: string,
  ttlMinutes: number,
  staleWhileRevalidateMinutes: number
): Promise<CacheValidation> {
  try {
    const cachedPackage = await c.db.getCachedPackage(packageName)

    if (!cachedPackage || !cachedPackage.cachedAt || cachedPackage.origin !== 'upstream') {
      return { valid: false, stale: false, data: null }
    }

    const cacheTime = new Date(cachedPackage.cachedAt).getTime()
    const now = new Date().getTime()
    const ttlMs = ttlMinutes * 60 * 1000
    const staleMs = staleWhileRevalidateMinutes * 60 * 1000

    const age = now - cacheTime
    const isValid = age < ttlMs
    const isStale = age < staleMs // Still usable even if stale

    return {
      valid: isValid,
      stale: isStale && !isValid, // Stale means expired but within stale window
      data: cachedPackage,
    }
  } catch (error) {
    console.error(`[DB ERROR] Failed to get cached package data for ${packageName}: ${(error as Error).message}`)
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
  options: CacheOptions = {}
): Promise<CacheResult<T>> {
  const {
    manifestTtlMinutes = 525600,  // 1 year TTL for manifests
    staleWhileRevalidateMinutes = 1051200, // Allow stale for 2 years (manifests rarely change)
    forceRefresh = false,
    upstream = 'npm'
  } = options

  // If forcing refresh, skip cache entirely
  if (forceRefresh) {
    console.log(`[CACHE] Force refresh requested for version: ${spec}`)
    const upstreamData = await fetchUpstreamFn()
    if (upstreamData) {
      c.waitUntil?.(cacheVersionData(c, spec, upstreamData, options))
    }
    return {
      version: upstreamData,
      fromCache: false,
    }
  }

  try {
    // Get cached data first
    const cachedResult = await getCachedVersionData(c, spec, manifestTtlMinutes, staleWhileRevalidateMinutes)

    if (cachedResult.data) {
      const { valid, stale, data } = cachedResult

      if (valid) {
        // Cache is fresh - return immediately
        console.log(`[CACHE] Using fresh cached version: ${spec}`)
        return {
          version: data as T,
          fromCache: true,
          stale: false
        }
      } else if (stale) {
        // Cache is stale but within stale-while-revalidate window
        // Return stale data immediately and queue background refresh
        console.log(`[CACHE] Using stale data for ${spec}, queuing background refresh`)

        // Queue background refresh using Cloudflare Queues
        if (c.env.CACHE_REFRESH_QUEUE) {
          await queueVersionRefresh(c, spec, upstream, fetchUpstreamFn, options)
        } else {
          // Fallback to waitUntil if queue not available
          console.log(`[CACHE] Queue not available, using waitUntil fallback for ${spec}`)
          c.waitUntil?.(refreshVersionInBackground(c, spec, fetchUpstreamFn, options))
        }

        return {
          version: data as T,
          fromCache: true,
          stale: true
        }
      }
    }

    // No cache data available - fetch upstream synchronously
    console.log(`[CACHE] No cache available for ${spec}, fetching upstream`)
    const upstreamData = await fetchUpstreamFn()

    // Cache the fresh data in background
    c.waitUntil?.(cacheVersionData(c, spec, upstreamData, options))

    return {
      version: upstreamData,
      fromCache: false,
      stale: false
    }

  } catch (error) {
    console.error(`[CACHE ERROR] Failed to get cached version ${spec}: ${(error as Error).message}`)
    throw error
  }
}

/**
 * Queue a version refresh job using Cloudflare Queues
 */
async function queueVersionRefresh<T>(
  c: HonoContext,
  spec: string,
  upstream: string,
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions
): Promise<void> {
  try {
    const message: QueueMessage = {
      type: 'version_refresh',
      spec,
      upstream,
      timestamp: Date.now(),
      options: {
        manifestTtlMinutes: options.manifestTtlMinutes || 525600,
        upstream: options.upstream || 'npm'
      }
    }

    await c.env.CACHE_REFRESH_QUEUE.send(message)
    console.log(`[QUEUE] Queued refresh for version: ${spec}`)
  } catch (error) {
    console.error(`[QUEUE ERROR] Failed to queue refresh for ${spec}: ${(error as Error).message}`)
    // Fallback to immediate background refresh
    c.waitUntil?.(refreshVersionInBackground(c, spec, fetchUpstreamFn, options))
  }
}

/**
 * Background refresh function for versions (fallback when queue is not available)
 */
async function refreshVersionInBackground<T>(
  c: HonoContext,
  spec: string,
  fetchUpstreamFn: () => Promise<T>,
  options: CacheOptions
): Promise<void> {
  try {
    console.log(`[BACKGROUND] Refreshing version data for: ${spec}`)
    const upstreamData = await fetchUpstreamFn()
    await cacheVersionData(c, spec, upstreamData, options)
    console.log(`[BACKGROUND] Successfully refreshed version: ${spec}`)
  } catch (error) {
    console.error(`[BACKGROUND ERROR] Failed to refresh version ${spec}: ${(error as Error).message}`)
  }
}

/**
 * Enhanced cache data retrieval for versions with stale-while-revalidate support
 */
async function getCachedVersionData(
  c: HonoContext,
  spec: string,
  ttlMinutes: number,
  staleWhileRevalidateMinutes: number
): Promise<CacheValidation> {
  try {
    const cachedVersion = await c.db.getCachedVersion(spec)

    if (!cachedVersion || !cachedVersion.cachedAt || cachedVersion.origin !== 'upstream') {
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
  } catch (error) {
    console.error(`[DB ERROR] Failed to get cached version data for ${spec}: ${(error as Error).message}`)
    return { valid: false, stale: false, data: null }
  }
}

/**
 * Cache package data in the database
 */
async function cachePackageData<T>(
  c: HonoContext,
  packageName: string,
  packageData: T,
  options: CacheOptions
): Promise<void> {
  try {
    if (packageData && typeof packageData === 'object' && 'tags' in packageData) {
      const tags = (packageData as any).tags || {}
      await c.db.upsertCachedPackage(packageName, tags, options.upstream || 'npm')
      console.log(`[CACHE] Successfully cached package data: ${packageName}`)
    }
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to cache package data for ${packageName}: ${(error as Error).message}`)
  }
}

/**
 * Cache version data in the database
 */
async function cacheVersionData<T>(
  c: HonoContext,
  spec: string,
  versionData: T,
  options: CacheOptions
): Promise<void> {
  try {
    if (versionData && typeof versionData === 'object') {
      const manifest = versionData as unknown as PackageManifest
      const publishedAt = new Date().toISOString()
      await c.db.upsertCachedVersion(spec, manifest, options.upstream || 'npm', publishedAt)
      console.log(`[CACHE] Successfully cached version data: ${spec}`)
    }
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to cache version data for ${spec}: ${(error as Error).message}`)
  }
}

/**
 * Generate storage path for tarball cache
 */
export function getTarballStoragePath(
  packageName: string,
  version: string,
  origin: 'local' | 'upstream' = 'local',
  upstream: string | null = null
): string {
  const sanitizedName = packageName.replace(/[@\/]/g, '_')
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
  c: HonoContext,
  packageName: string,
  version: string,
  origin: 'local' | 'upstream' = 'local',
  upstream: string | null = null
): Promise<boolean> {
  try {
    const storagePath = getTarballStoragePath(packageName, version, origin, upstream)
    // This would need to be implemented based on your storage solution
    // For now, return false as a placeholder
    return false
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to check tarball cache: ${(error as Error).message}`)
    return false
  }
}

/**
 * Cache tarball data
 */
export async function cacheTarball(
  c: HonoContext,
  packageName: string,
  version: string,
  tarballStream: ReadableStream,
  origin: 'local' | 'upstream' = 'local',
  upstream: string | null = null
): Promise<void> {
  try {
    const storagePath = getTarballStoragePath(packageName, version, origin, upstream)
    // This would need to be implemented based on your storage solution
    console.log(`[CACHE] Would cache tarball at: ${storagePath}`)
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to cache tarball: ${(error as Error).message}`)
  }
}
