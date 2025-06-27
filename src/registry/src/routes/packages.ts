// @ts-ignore
import validate from 'validate-npm-package-name'
// @ts-ignore
import * as semver from 'semver'
import { accepts } from 'hono/accepts'
import { DOMAIN, PROXY, PROXY_URL } from '../../config.ts'
import {
  parsePackageSpec,
  getUpstreamConfig,
  buildUpstreamUrl,
  isProxyEnabled,
  isValidUpstreamName,
  getDefaultUpstream
} from '../utils/upstream.ts'
import {
  extractPackageJSON,
  packageSpec,
  createFile,
  createVersion,
  slimManifest
} from '../utils/packages.ts'
import { getCachedPackageWithRefresh, getCachedVersionWithRefresh, isTarballCached, getTarballStoragePath, cacheTarball } from '../utils/cache.ts'
import type {
  HonoContext,
  PackageManifest,
  SlimmedManifest,
  ParsedPackage,
  ParsedVersion,
  UpstreamConfig,
  PackageSpec
} from '../../types.ts'

interface SlimPackumentContext {
  protocol?: string
  host?: string
  upstream?: string
}

interface TarballRequestParams {
  scope: string
  pkg: string
}

interface PackageRouteSegments {
  upstream?: string
  packageName: string
  segments: string[]
}

/**
 * Ultra-aggressive slimming for packument versions (used in /:upstream/:pkg responses)
 * Only includes the absolute minimum fields needed for dependency resolution and installation
 * Fields included: name, version, dependencies, peerDependencies, optionalDependencies, peerDependenciesMeta, bin, engines, dist.tarball
 */
function slimPackumentVersion(manifest: any, context: SlimPackumentContext = {}): SlimmedManifest {
  if (!manifest) return {} as SlimmedManifest

  try {
    // Parse manifest if it's a string
    let parsed: any
    if (typeof manifest === 'string') {
      try {
        parsed = JSON.parse(manifest)
      } catch (e) {
        parsed = manifest
      }
    } else {
      parsed = manifest
    }

    // For packuments, only include the most essential fields
    const slimmed: any = {
      name: parsed.name,
      version: parsed.version,
      dependencies: parsed.dependencies || {},
      peerDependencies: parsed.peerDependencies || {},
      optionalDependencies: parsed.optionalDependencies || {},
      peerDependenciesMeta: parsed.peerDependenciesMeta || {},
      bin: parsed.bin,
      engines: parsed.engines,
      dist: {
        tarball: rewriteTarballUrlIfNeeded(parsed.dist?.tarball || '', parsed.name, parsed.version, context)
      }
    }

    // Remove undefined fields to keep response clean
    Object.keys(slimmed).forEach(key => {
      if (key !== 'dist' && slimmed[key] === undefined) {
        delete slimmed[key]
      }
    })

    // Remove empty objects
    if (Object.keys(slimmed.dependencies || {}).length === 0) {
      delete slimmed.dependencies
    }
    if (Object.keys(slimmed.peerDependencies || {}).length === 0) {
      delete slimmed.peerDependencies
    }
    if (Object.keys(slimmed.peerDependenciesMeta || {}).length === 0) {
      delete slimmed.peerDependenciesMeta
    }
    if (Object.keys(slimmed.optionalDependencies || {}).length === 0) {
      delete slimmed.optionalDependencies
    }
    if (Object.keys(slimmed.engines || {}).length === 0) {
      delete slimmed.engines
    }

    return slimmed as SlimmedManifest
  } catch (err) {
    console.error(`[ERROR] Failed to slim packument version: ${(err as Error).message}`)
    return (manifest || {}) as SlimmedManifest
  }
}

/**
 * Rewrite tarball URLs to point to our registry instead of the original registry
 * Only rewrite if context is provided, otherwise return original URL
 */
function rewriteTarballUrlIfNeeded(
  originalUrl: string,
  packageName: string,
  version: string,
  context: SlimPackumentContext = {}
): string {
  // Only rewrite if we have context indicating this is a proxied request
  if (!context.upstream || !originalUrl || !packageName || !version) {
    return originalUrl
  }

  try {
    // Extract the protocol and host from the context or use defaults
    const protocol = context.protocol || 'http'
    const host = context.host || 'localhost:1337'
    const upstream = context.upstream

    // Create the new tarball URL pointing to our registry
    // For scoped packages like @scope/package, the filename should be package-version.tgz
    // For unscoped packages like package, the filename should be package-version.tgz
    const packageBaseName = packageName.includes('/') ? packageName.split('/')[1] : packageName
    const filename = `${packageBaseName}-${version}.tgz`
    const newUrl = `${protocol}://${host}/${upstream}/${packageName}/-/${filename}`

    console.log(`[TARBALL_REWRITE] ${originalUrl} -> ${newUrl}`)
    return newUrl
  } catch (err) {
    console.error(`[ERROR] Failed to rewrite tarball URL: ${(err as Error).message}`)
    return originalUrl
  }
}

/**
 * Helper function to properly decode scoped package names from URL parameters
 * Handles cases where special characters in package names are URL-encoded
 */
function decodePackageName(scope: string, pkg?: string): string | null {
  if (!scope) return null

  // Decode URL-encoded characters in both scope and pkg
  const decodedScope = decodeURIComponent(scope)
  const decodedPkg = pkg ? decodeURIComponent(pkg) : null

  // Handle scoped packages correctly
  if (decodedScope.startsWith('@')) {
    // If we have both scope and pkg, combine them
    if (decodedPkg && decodedPkg !== '-') {
      return `${decodedScope}/${decodedPkg}`
    }

    // If scope contains an encoded slash, it might be the full package name
    if (decodedScope.includes('/')) {
      return decodedScope
    }

    // Just the scope
    return decodedScope
  } else {
    // Unscoped package - scope is actually the package name
    return decodedScope
  }
}

/**
 * Determines if a package is available only through proxy or is locally published
 * A package is considered proxied if it doesn't exist locally but PROXY is enabled
 */
function isProxiedPackage(packageData: ParsedPackage | null): boolean {
  // If the package doesn't exist locally but PROXY is enabled
  if (!packageData && PROXY) {
    return true
  }

  // If the package is marked as proxied (has a source field indicating where it came from)
  if (packageData && (packageData as any).source === 'proxy') {
    return true
  }

  return false
}

export async function getPackageTarball(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as { scope: string; pkg: string }
    const acceptsIntegrity = c.req.header('accepts-integrity')

    console.log(`[DEBUG] getPackageTarball called with pkg="${pkg}", path="${c.req.path}"`)

    // Handle scoped and unscoped packages correctly with URL decoding
    try {
      // For tarball requests, if scope is undefined/null, pkg should contain the package name
      if (!scope || scope === 'undefined') {
        if (!pkg) {
          throw new Error('Missing package name')
        }
        pkg = decodeURIComponent(pkg)
        console.log(`[DEBUG] Unscoped package: "${pkg}"`)
      } else {
        const packageName = decodePackageName(scope, pkg)
        if (!packageName) {
          throw new Error('Invalid scoped package name')
        }
        pkg = packageName
        console.log(`[DEBUG] Scoped package: "${pkg}"`)
      }
    } catch (err) {
      console.error(`[ERROR] Failed to parse package name: ${(err as Error).message}`)
      console.error(`[ERROR] Input parameters: scope="${scope}", pkg="${pkg}"`)
      return c.json({ error: 'Invalid package name' }, 400)
    }

    const tarball = c.req.path.split('/').pop()
    if (!tarball || !tarball.endsWith('.tgz')) {
      console.error(`[ERROR] Invalid tarball name: ${tarball}`)
      return c.json({ error: 'Invalid tarball name' }, 400)
    }

    const filename = `${pkg}/${tarball}`

    // If integrity checking is requested, get the expected integrity from manifest
    let expectedIntegrity: string | null = null
    if (acceptsIntegrity) {
      try {
        // Extract version from tarball name
        const versionMatch = tarball.match(new RegExp(`${pkg.split('/').pop()}-(.*)\\.tgz`))
        if (versionMatch) {
          const version = versionMatch[1]
          const spec = `${pkg}@${version}`

          // Get the version from DB
          const versionData = await c.db.getVersion(spec)

          if (versionData && versionData.manifest) {
            let manifest: any
            try {
              manifest = typeof versionData.manifest === 'string' ?
                JSON.parse(versionData.manifest) : versionData.manifest
            } catch (e) {
              console.error(`[ERROR] Failed to parse manifest for ${spec}: ${(e as Error).message}`)
            }

            if (manifest && manifest.dist && manifest.dist.integrity) {
              expectedIntegrity = manifest.dist.integrity
              console.log(`[INTEGRITY] Found expected integrity for ${filename}: ${expectedIntegrity}`)

              // Simple string comparison with the provided integrity
              if (acceptsIntegrity !== expectedIntegrity) {
                console.error(`[INTEGRITY ERROR] Provided integrity (${acceptsIntegrity}) does not match expected integrity (${expectedIntegrity}) for ${filename}`)
                return c.json({
                  error: 'Integrity check failed',
                  code: 'EINTEGRITY',
                  expected: expectedIntegrity,
                  actual: acceptsIntegrity
                }, 400)
              }

              console.log(`[INTEGRITY] Verified integrity for ${filename}`)
            } else {
              console.log(`[INTEGRITY] No integrity information found in manifest for ${spec}`)
            }
          } else {
            console.log(`[INTEGRITY] No version data found for ${spec}`)
          }
        }
      } catch (err) {
        console.error(`[INTEGRITY ERROR] Error checking integrity for ${filename}: ${(err as Error).message}`)
      }
    }

    // Try to get the file from our bucket first
    try {
      const file = await c.env.BUCKET.get(filename)

      // If file exists locally, stream it
      if (file) {
        try {
          // We've already verified integrity above if needed
          const headers = new Headers({
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000',
          })

          return new Response(file.body, {
            status: 200,
            headers
          })
        } catch (err) {
          console.error(`[ERROR] Failed to stream local tarball ${filename}: ${(err as Error).message}`)
          // Fall through to proxy if available
        }
      }
    } catch (err) {
      console.error(`[STORAGE ERROR] Failed to get tarball from bucket ${filename}: ${(err as Error).message}`)
      // Continue to proxy if available, otherwise fall through to 404
    }

    // If file doesn't exist and proxying is enabled, try to get it from upstream
    if (PROXY) {
      try {
        // Construct the correct URL for scoped and unscoped packages
        const tarballPath = pkg.includes('/') ?
          `${pkg}/-/${tarball}` :
          `${pkg}/-/${tarball}`

        const source = `${PROXY_URL}/${tarballPath}`
        console.log(`[PROXY] Fetching tarball from ${source}`)

        // First do a HEAD request to check size
        const headResponse = await fetch(source, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'vlt-serverless-registry'
          }
        })

        if (!headResponse.ok) {
          console.error(`[PROXY ERROR] HEAD request failed for ${filename}: ${headResponse.status}`)
          return c.json({ error: 'Failed to check package size' }, 502)
        }

        const contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10)

        // Get the package response first, since we'll need it for all size cases
        const response = await fetch(source, {
          headers: {
            'Accept': 'application/octet-stream',
            'User-Agent': 'vlt-serverless-registry'
          }
        })

        if (!response.ok || !response.body) {
          console.error(`[PROXY ERROR] Failed to fetch package ${filename}: ${response.status}`)
          return c.json({ error: 'Failed to fetch package' }, 502)
        }

        // For very large packages (100MB+), stream directly to client without storing
        if (contentLength > 100_000_000) {
          console.log(`[PROXY] Package is very large (${contentLength} bytes), streaming directly to client`)

          const readable = response.body

          // Return the stream to the client immediately
          return new Response(readable, {
            status: 200,
            headers: new Headers({
              'Content-Type': 'application/octet-stream',
              'Content-Length': contentLength.toString(),
              'Cache-Control': 'public, max-age=31536000'
            })
          })
        }

        // For medium-sized packages (10-100MB), stream directly to client and store async
        if (contentLength > 10_000_000) {
          // Clone the response since we'll need it twice
          const [clientResponse, storageResponse] = response.body.tee()

          // No integrity check when storing proxied packages
          c.executionCtx.waitUntil((async () => {
            try {
              await c.env.BUCKET.put(filename, storageResponse, {
                httpMetadata: {
                  contentType: 'application/octet-stream',
                  cacheControl: 'public, max-age=31536000',
                  // Store the integrity value if we have it from the manifest
                  ...(expectedIntegrity && { integrity: expectedIntegrity })
                }
              })
              console.log(`[PROXY] Successfully stored tarball ${filename}`)
            } catch (err) {
              console.error(`[STORAGE ERROR] Failed to store tarball ${filename}: ${(err as Error).message}`)
            }
          })())

          // Stream directly to client
          return new Response(clientResponse, {
            status: 200,
            headers: new Headers({
              'Content-Type': 'application/octet-stream',
              'Content-Length': contentLength.toString(),
              'Cache-Control': 'public, max-age=31536000'
            })
          })
        }

        // For smaller packages, we can use the tee() approach safely
        const [stream1, stream2] = response.body.tee()

        // Store in R2 bucket asynchronously without integrity check for proxied packages
        c.executionCtx.waitUntil((async () => {
          try {
            await c.env.BUCKET.put(filename, stream1, {
              httpMetadata: {
                contentType: 'application/octet-stream',
                cacheControl: 'public, max-age=31536000',
                // Store the integrity value if we have it from the manifest
                ...(expectedIntegrity && { integrity: expectedIntegrity })
              }
            })
            console.log(`[PROXY] Successfully stored tarball ${filename}`)
          } catch (err) {
            console.error(`[STORAGE ERROR] Failed to store tarball ${filename}: ${(err as Error).message}`)
          }
        })())

        // Return the second stream to the client immediately
        return new Response(stream2, {
          status: 200,
          headers: new Headers({
            'Content-Type': 'application/octet-stream',
            'Content-Length': contentLength.toString(),
            'Cache-Control': 'public, max-age=31536000'
          })
        })

      } catch (err) {
        console.error(`[PROXY ERROR] Network error fetching tarball ${filename}: ${(err as Error).message}`)
        return c.json({ error: 'Failed to contact upstream registry' }, 502)
      }
    }

    return c.json({ error: 'Not found' }, 404)
  } catch (err) {
    console.error(`[ERROR] Unhandled error in getPackageTarball: ${(err as Error).message}`)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Get a single package version manifest
 */
export async function getPackageManifest(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as { scope: string; pkg: string }

    // Handle scoped packages correctly with URL decoding
    try {
      const packageName = decodePackageName(scope, pkg)

      if (!packageName) {
        throw new Error('Invalid package name')
      }
      pkg = packageName
    } catch (err) {
      console.error(`[ERROR] Failed to parse package name: ${(err as Error).message}`)
      return c.json({ error: 'Invalid package name' }, 400)
    }

    // Extract version from URL path
    const pathParts = c.req.path.split('/')
    const versionIndex = pathParts.findIndex(part => part === pkg) + 1
    let version = pathParts[versionIndex] || 'latest'

    // Decode URL-encoded version (e.g., %3E%3D1.0.0%20%3C2.0.0 becomes >=1.0.0 <2.0.0)
    version = decodeURIComponent(version)

    console.log(`[MANIFEST] Requesting manifest for ${pkg}@${version}`)

    // If it's a semver range, try to resolve it to a specific version
    let resolvedVersion = version
    if (semver.validRange(version) && !semver.valid(version)) {
      // This is a range, try to find the best matching version
      try {
        const packageData = await c.db.getPackage(pkg)
        if (packageData) {
          const versions = await c.db.getVersionsByPackage(pkg)
          if (versions && versions.length > 0) {
            const availableVersions = versions.map((v: any) => v.version)
            const bestMatch = semver.maxSatisfying(availableVersions, version)
            if (bestMatch) {
              resolvedVersion = bestMatch
              console.log(`[MANIFEST] Resolved range ${version} to version ${resolvedVersion}`)
            }
          }
        }
      } catch (err) {
        console.error(`[ERROR] Failed to resolve version range: ${(err as Error).message}`)
      }
    }

    // Get the version from our database
    const versionData = await c.db.getVersion(`${pkg}@${resolvedVersion}`)

    if (versionData) {
      // Convert the full manifest to a slimmed version for the response
      const slimmedManifest = slimManifest(versionData.manifest)

      // Ensure we have correct name, version and tarball URL
      const ret = {
        ...slimmedManifest,
        name: pkg,
        version: resolvedVersion,
        dist: {
          ...slimmedManifest.dist,
          tarball: `${DOMAIN}/${createFile({ pkg, version: resolvedVersion })}`,
        }
      }

      // Set proper headers for npm/bun
      c.header('Content-Type', 'application/json')
      c.header('Cache-Control', 'public, max-age=300') // 5 minute cache

      return c.json(ret, 200)
    }

    return c.json({ error: 'Version not found' }, 404)
  } catch (err) {
    console.error(`[ERROR] Failed to get manifest: ${(err as Error).message}`)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Get package dist-tags
 */
export async function getPackageDistTags(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as { scope: string; pkg: string }
    const tag = c.req.param('tag')

    // Handle scoped packages correctly with URL decoding
    try {
      const packageName = decodePackageName(scope, pkg)
      if (!packageName) {
        throw new Error('Invalid package name')
      }
      pkg = packageName
    } catch (err) {
      console.error(`[ERROR] Failed to parse package name: ${(err as Error).message}`)
      return c.json({ error: 'Invalid package name' }, 400)
    }

    console.log(`[DIST-TAGS] Getting dist-tags for ${pkg}${tag ? ` (tag: ${tag})` : ''}`)

    const packageData = await c.db.getPackage(pkg)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    const distTags = packageData.tags || {}

    if (tag) {
      // Return specific tag
      if (distTags[tag]) {
        return c.json({ [tag]: distTags[tag] })
      } else {
        return c.json({ error: `Tag '${tag}' not found` }, 404)
      }
    } else {
      // Return all tags
      return c.json(distTags)
    }
  } catch (err) {
    console.error(`[ERROR] Failed to get dist-tags: ${(err as Error).message}`)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Set/update a package dist-tag
 */
export async function putPackageDistTag(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as { scope: string; pkg: string }
    const tag = c.req.param('tag')

    // Handle scoped packages correctly with URL decoding
    try {
      const packageName = decodePackageName(scope, pkg)
      if (!packageName) {
        throw new Error('Invalid package name')
      }
      pkg = packageName
    } catch (err) {
      console.error(`[ERROR] Failed to parse package name: ${(err as Error).message}`)
      return c.json({ error: 'Invalid package name' }, 400)
    }

    const version = await c.req.text()

    if (!tag || !version) {
      return c.json({ error: 'Tag and version are required' }, 400)
    }

    console.log(`[DIST-TAGS] Setting ${pkg}@${tag} -> ${version}`)

    const packageData = await c.db.getPackage(pkg)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    const distTags = packageData.tags || {}
    distTags[tag] = version

    await c.db.upsertPackage(pkg, distTags)

    return c.json(distTags, 201)
  } catch (err) {
    console.error(`[ERROR] Failed to set dist-tag: ${(err as Error).message}`)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Delete a package dist-tag
 */
export async function deletePackageDistTag(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as { scope: string; pkg: string }
    const tag = c.req.param('tag')

    // Handle scoped packages correctly with URL decoding
    try {
      const packageName = decodePackageName(scope, pkg)
      if (!packageName) {
        throw new Error('Invalid package name')
      }
      pkg = packageName
    } catch (err) {
      console.error(`[ERROR] Failed to parse package name: ${(err as Error).message}`)
      return c.json({ error: 'Invalid package name' }, 400)
    }

    if (!tag) {
      return c.json({ error: 'Tag is required' }, 400)
    }

    if (tag === 'latest') {
      return c.json({ error: 'Cannot delete latest tag' }, 400)
    }

    console.log(`[DIST-TAGS] Deleting ${pkg}@${tag}`)

    const packageData = await c.db.getPackage(pkg)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    const distTags = packageData.tags || {}

    if (!distTags[tag]) {
      return c.json({ error: `Tag '${tag}' not found` }, 404)
    }

    delete distTags[tag]

    await c.db.upsertPackage(pkg, distTags)

    return c.json(distTags)
  } catch (err) {
    console.error(`[ERROR] Failed to delete dist-tag: ${(err as Error).message}`)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Handle general package routes (packument, manifest, tarball)
 */
export async function handlePackageRoute(c: HonoContext) {
  try {
    const path = c.req.path

    // Check if this is a tarball request
    if (path.includes('/-/')) {
      return getPackageTarball(c)
    }

    // Check if this has a version (manifest request)
    const pathParts = path.split('/')
    if (pathParts.length >= 3 && pathParts[2] && !pathParts[2].startsWith('-')) {
      return getPackageManifest(c)
    }

    // Otherwise it's a packument request
    return getPackagePackument(c)
  } catch (err) {
    console.error(`[ERROR] Failed to handle package route: ${(err as Error).message}`)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function getPackagePackument(c: HonoContext) {
  try {
    const name = c.req.param('pkg')
    const scope = c.req.param('scope')
    // Get the versionRange query parameter
    const versionRange = c.req.query('versionRange')

    console.log(`[DEBUG] getPackagePackument called for: name=${name}, scope=${scope}${versionRange ? `, with version range: ${versionRange}` : ''}`)

    if (!name) {
      console.log(`[ERROR] No package name provided in parameters`)
      return c.json({ error: 'Package name is required' }, 400)
    }

    // Check if versionRange is a valid semver range
    const isValidRange = versionRange && semver.validRange(versionRange)
    if (versionRange && !isValidRange) {
      console.log(`[DEBUG] Invalid semver range provided: ${versionRange}`)
      return c.json({ error: `Invalid semver range: ${versionRange}` }, 400)
    }

    // Use racing cache strategy when PROXY is enabled or upstream is specified
    const upstream = (c as any).upstream || (PROXY ? 'npm' : null)
    if (upstream) {
      console.log(`[RACING] Using racing cache strategy for packument: ${name} from upstream: ${upstream}`)

      const fetchUpstreamFn = async () => {
        console.log(`[RACING] Fetching packument from upstream for: ${name}`)

        // Get the appropriate upstream configuration
        const upstreamConfig = getUpstreamConfig(upstream)
        if (!upstreamConfig) {
          throw new Error(`Unknown upstream: ${upstream}`)
        }

        const upstreamUrl = buildUpstreamUrl(upstreamConfig, name)
        console.log(`[RACING] Fetching from URL: ${upstreamUrl}`)

        const response = await fetch(upstreamUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'vlt-serverless-registry'
          }
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Package not found: ${name}`)
          }
          throw new Error(`Upstream returned ${response.status}`)
        }

        const upstreamData = await response.json() as any
        console.log(`[RACING] Successfully fetched packument for: ${name}, has ${Object.keys(upstreamData.versions || {}).length} versions`)

        // Prepare data for storage with consistent structure
        const packageData = {
          name,
          'dist-tags': upstreamData['dist-tags'] || { latest: Object.keys(upstreamData.versions || {}).pop() || '' },
          versions: {} as Record<string, any>,
          time: {
            modified: upstreamData.time?.modified || new Date().toISOString()
          } as Record<string, string>
        }

        // Store timing information for each version
        if (upstreamData.time) {
          Object.entries(upstreamData.time).forEach(([version, time]) => {
            if (version !== 'modified' && version !== 'created') {
              packageData.time[version] = time as string
            }
          })
        }

                // Process versions and apply version range filter if needed
        if (upstreamData.versions) {
          const protocol = new URL(c.req.url).protocol.slice(0, -1) // Remove trailing ':'
          const host = c.req.header('host') || 'localhost:1337'
          const context = { protocol, host, upstream }

          Object.entries(upstreamData.versions).forEach(([version, manifest]) => {
            // Skip versions that don't satisfy the range if a valid range is provided
            if (isValidRange && !semver.satisfies(version, versionRange)) {
              return
            }

            // Create a slimmed version of the manifest for the response with context for URL rewriting
            packageData.versions[version] = slimManifest(manifest as any, context)
          })
        }

        // Return just the packageData for caching - the cache function handles storage metadata separately
        return packageData
      }

      try {
        const result = await getCachedPackageWithRefresh(c, name, fetchUpstreamFn, {
          packumentTtlMinutes: 5,
          upstream
        }) as any

                if (result.fromCache) {
          console.log(`[RACING] Using cached data for: ${name}${result.stale ? ' (stale)' : ''}`)

          // If we have cached data, still need to check if we need to filter by version range
          if (isValidRange && result.package?.versions) {
            const filteredVersions: Record<string, any> = {}
            Object.keys(result.package.versions).forEach(version => {
              if (semver.satisfies(version, versionRange)) {
                filteredVersions[version] = result.package.versions[version]
              }
            })
            result.package.versions = filteredVersions
          }

          return c.json(result.package, 200)
        } else {
          console.log(`[RACING] Using fresh upstream data for: ${name}`)
          return c.json(result.package, 200)
        }
      } catch (error) {
        console.error(`[RACING ERROR] Failed to get package ${name}: ${(error as Error).message}`)

        // Return more specific error codes
        if ((error as Error).message.includes('Package not found')) {
          return c.json({ error: `Package '${name}' not found` }, 404)
        }

        return c.json({ error: 'Failed to fetch package data' }, 502)
      }
    }

    // Fallback to original logic when PROXY is disabled
    const pkg = await c.db.getPackage(name)
    const now = new Date()

    // Initialize the consistent packument response structure
    const packageData = {
      name,
      'dist-tags': { latest: '' } as any,
      versions: {} as Record<string, any>,
      time: {
        modified: now.toISOString()
      } as Record<string, string>
    }

    if (pkg) {
      // Update dist-tags from the database
      packageData['dist-tags'] = pkg.tags || { latest: '' }

      // Update modified time
      if (pkg.lastUpdated) {
        packageData.time.modified = pkg.lastUpdated
      }
    }

    // Get all versions for this package
    try {
      const allVersions = await c.db.getVersionsByPackage(name)

      if (allVersions && allVersions.length > 0) {
        console.log(`[DEBUG] Found ${allVersions.length} versions for ${name} in the database`)

        // Add all versions to the packument, use slimmed manifests
        for (const versionData of allVersions) {
          // Skip versions that don't satisfy the version range if provided
          if (isValidRange && !semver.satisfies((versionData as any).version, versionRange)) {
            continue
          }

          // Use slimManifest to create a smaller response
          packageData.versions[(versionData as any).version] = slimManifest((versionData as any).manifest)
          packageData.time[(versionData as any).version] = (versionData as any).published_at
        }
      } else {
        console.log(`[DEBUG] No versions found for ${name} in the database`)

        // Add at least the latest version as a fallback if it satisfies the range
        const latestVersion = packageData['dist-tags'].latest
        if (latestVersion && (!isValidRange || semver.satisfies(latestVersion, versionRange))) {
          const versionData = await c.db.getVersion(`${name}@${latestVersion}`)
          if (versionData) {
            packageData.versions[latestVersion] = slimManifest(versionData.manifest)
            packageData.time[latestVersion] = (versionData as any).published_at
          } else {
            // Create a mock version for testing
            packageData.versions[latestVersion] = {
              name: name,
              version: latestVersion,
              description: `Mock package for ${name}`,
              dist: {
                tarball: `${DOMAIN}/${name}/-/${name}-${latestVersion}.tgz`
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`[DB ERROR] Failed to get versions for package ${name}: ${(err as Error).message}`)

      // Create a basic version if none are found
      const latestVersion = packageData['dist-tags'].latest
      if (latestVersion) {
        packageData.versions[latestVersion] = {
          name: name,
          version: latestVersion,
          description: `Package ${name}`,
          dist: {
            tarball: `${DOMAIN}/${name}/-/${name}-${latestVersion}.tgz`
          }
        }
      }
    }

    return c.json(packageData, 200)
  } catch (err) {
    console.error(`[ERROR] Failed to get packument: ${(err as Error).message}`)
    return c.json({ error: 'Internal server error' }, 500)
  }
}
