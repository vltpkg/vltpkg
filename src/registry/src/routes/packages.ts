import * as semver from 'semver'
import { DOMAIN, PROXY, PROXY_URL } from '../../config.ts'
import {
  getUpstreamConfig,
  buildUpstreamUrl,
} from '../utils/upstream.ts'
import { createFile, slimManifest } from '../utils/packages.ts'
import { getCachedPackageWithRefresh } from '../utils/cache.ts'
import type {
  HonoContext,
  SlimmedManifest,
  ParsedPackage,
  PackageManifest,
} from '../../types.ts'

interface SlimPackumentContext {
  protocol?: string
  host?: string
  upstream?: string
}

interface _TarballRequestParams {
  scope: string
  pkg: string
}

interface _PackageRouteSegments {
  upstream?: string
  packageName: string
  segments: string[]
}

interface _UpstreamData {
  'dist-tags'?: Record<string, string>
  versions?: Record<string, unknown>
  time?: Record<string, string>
  [key: string]: unknown
}

interface PackageData {
  name: string
  'dist-tags': Record<string, string>
  versions: Record<string, unknown>
  time: Record<string, string>
}

// Use the existing ParsedVersion interface from types.ts instead

interface _CachedResult {
  fromCache?: boolean
  package?: PackageData
}

/**
 * Ultra-aggressive slimming for packument versions (used in /:upstream/:pkg responses)
 * Only includes the absolute minimum fields needed for dependency resolution and installation
 * Fields included: name, version, dependencies, peerDependencies, optionalDependencies, peerDependenciesMeta, bin, engines, dist.tarball
 */
export async function slimPackumentVersion(
  manifest: any,
  context: SlimPackumentContext = {},
): Promise<SlimmedManifest | null> {
  try {
    if (!manifest) return null

    // Parse manifest if it's a string
     
    let parsed: any
    if (typeof manifest === 'string') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        parsed = JSON.parse(manifest)
      } catch (_e) {
         
        parsed = manifest
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      parsed = manifest
    }

    // For packuments, only include the most essential fields
     
    const slimmed: any = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      name: parsed.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      version: parsed.version,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      dependencies: parsed.dependencies || {},
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      peerDependencies: parsed.peerDependencies || {},
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      optionalDependencies: parsed.optionalDependencies || {},
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      peerDependenciesMeta: parsed.peerDependenciesMeta || {},
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      bin: parsed.bin,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      engines: parsed.engines,
      dist: {
        tarball: rewriteTarballUrlIfNeeded(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          parsed.dist?.tarball || '',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          parsed.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          parsed.version,
          context,
        ),
      },
    }

    // Remove undefined fields to keep response clean
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Object.keys(slimmed).forEach(key => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (key !== 'dist' && slimmed[key] === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete slimmed[key]
      }
    })

    // Remove empty objects
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    if (Object.keys(slimmed.dependencies || {}).length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete slimmed.dependencies
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    if (Object.keys(slimmed.peerDependencies || {}).length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete slimmed.peerDependencies
    }
    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      Object.keys(slimmed.peerDependenciesMeta || {}).length === 0
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete slimmed.peerDependenciesMeta
    }
    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      Object.keys(slimmed.optionalDependencies || {}).length === 0
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete slimmed.optionalDependencies
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    if (Object.keys(slimmed.engines || {}).length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete slimmed.engines
    }

    return slimmed as SlimmedManifest
  } catch (_err) {
    // Hono logger will capture the error context automatically
    return null
  }
}

/**
 * Rewrite tarball URLs to point to our registry instead of the original registry
 * Only rewrite if context is provided, otherwise return original URL
 */
export async function rewriteTarballUrlIfNeeded(
  originalUrl: string,
  _packageName: string,
  _version: string,
  context: SlimPackumentContext = {},
): Promise<string> {
  try {
    const { upstream, protocol, host } = context

    if (!upstream || !protocol || !host) {
      return originalUrl
    }

    const newUrl = originalUrl
      .replace(protocol, host)
      .replace(upstream, 'localhost:1337')
    // Hono logger will capture this information
    return newUrl
  } catch (_err) {
    // Hono logger will capture the error context automatically
    return originalUrl
  }
}

/**
 * Helper function to properly decode scoped package names from URL parameters
 * Handles cases where special characters in package names are URL-encoded
 */
function decodePackageName(
  scope: string,
  pkg?: string,
): string | null {
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
function _isProxiedPackage(
  packageData: ParsedPackage | null,
): boolean {
  // If the package doesn't exist locally but PROXY is enabled
  if (!packageData && PROXY) {
    return true
  }

  // If the package is marked as proxied (has a source field indicating where it came from)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (packageData && (packageData as any).source === 'proxy') {
    return true
  }

  return false
}

export async function getPackageTarball(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as {
      scope: string
      pkg: string
    }
    const acceptsIntegrity = c.req.header('accepts-integrity')

    // Debug: getPackageTarball called with pkg and path (logged by Hono middleware)

    // Handle scoped and unscoped packages correctly with URL decoding
    try {
      // For tarball requests, if scope is undefined/null, pkg should contain the package name
      if (!scope || scope === 'undefined') {
        if (!pkg) {
          throw new Error('Missing package name')
        }
        pkg = decodeURIComponent(pkg)
        // Hono middleware logs debug information
      } else {
        const packageName = decodePackageName(scope, pkg)
        if (!packageName) {
          throw new Error('Invalid scoped package name')
        }
        pkg = packageName
        // Hono middleware logs debug information
      }
    } catch (_err) {
      // Hono middleware logs error information
      return c.json({ error: 'Invalid package name' }, 400)
    }

    const tarball = c.req.path.split('/').pop()
    if (!tarball?.endsWith('.tgz')) {
      // Hono middleware logs error information
      return c.json({ error: 'Invalid tarball name' }, 400)
    }

    const filename = `${pkg}/${tarball}`

    // If integrity checking is requested, get the expected integrity from manifest
    let expectedIntegrity: string | null = null
    if (acceptsIntegrity) {
      try {
        // Extract version from tarball name
        const versionMatch = new RegExp(
          `${pkg.split('/').pop()}-(.*)\\.tgz`,
        ).exec(tarball)
        if (versionMatch) {
          const version = versionMatch[1]
          const spec = `${pkg}@${version}`

          // Get the version from DB
          const versionData = await c.db.getVersion(spec)

          if (versionData?.manifest) {
             
            let manifest: any
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              manifest =
                typeof versionData.manifest === 'string' ?
                  JSON.parse(versionData.manifest)
                : versionData.manifest
            } catch (_e) {
              // Hono middleware logs error information
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (manifest?.dist?.integrity) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              expectedIntegrity = manifest.dist.integrity
              // Hono middleware logs integrity information

              // Simple string comparison with the provided integrity
              if (acceptsIntegrity !== expectedIntegrity) {
                // Hono middleware logs integrity error
                return c.json(
                  {
                    error: 'Integrity check failed',
                    code: 'EINTEGRITY',
                    expected: expectedIntegrity,
                    actual: acceptsIntegrity,
                  },
                  400,
                )
              }

              // Hono middleware logs integrity verification
            } else {
              // Hono middleware logs integrity information
            }
          } else {
            // Hono middleware logs integrity information
          }
        }
      } catch (_err) {
        // Hono middleware logs integrity error
      }
    }

    // Try to get the file from our bucket first
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const file = await c.env.BUCKET.get(filename)

      // If file exists locally, stream it
      if (file) {
        try {
          // We've already verified integrity above if needed
          const headers = new Headers({
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000',
          })

          return new Response(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            file.body,
            {
              status: 200,
              headers,
            }
          )
        } catch (_err) {
          // Hono middleware logs streaming error
          // Fall through to proxy if available
        }
      }
    } catch (_err) {
      // Hono middleware logs storage error
      // Continue to proxy if available, otherwise fall through to 404
    }

    // If file doesn't exist and proxying is enabled, try to get it from upstream
    if (PROXY) {
      try {
        // Construct the correct URL for scoped and unscoped packages
        const tarballPath =
          pkg.includes('/') ?
            `${pkg}/-/${tarball}`
          : `${pkg}/-/${tarball}`

        const source = `${PROXY_URL}/${tarballPath}`
        // Hono middleware logs proxy information

        // First do a HEAD request to check size
        const headResponse = await fetch(source, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'vlt-serverless-registry',
          },
        })

        if (!headResponse.ok) {
          // Hono middleware logs proxy error
          return c.json(
            { error: 'Failed to check package size' },
            502,
          )
        }

        const contentLength = parseInt(
          headResponse.headers.get('content-length') || '0',
          10,
        )

        // Get the package response first, since we'll need it for all size cases
        const response = await fetch(source, {
          headers: {
            Accept: 'application/octet-stream',
            'User-Agent': 'vlt-serverless-registry',
          },
        })

        if (!response.ok || !response.body) {
          // Hono middleware logs proxy error
          return c.json({ error: 'Failed to fetch package' }, 502)
        }

        // For very large packages (100MB+), stream directly to client without storing
        if (contentLength > 100_000_000) {
          // Hono middleware logs large package streaming

          const readable = response.body

          // Return the stream to the client immediately
          return new Response(readable, {
            status: 200,
            headers: new Headers({
              'Content-Type': 'application/octet-stream',
              'Content-Length': contentLength.toString(),
              'Cache-Control': 'public, max-age=31536000',
            }),
          })
        }

        // For medium-sized packages (10-100MB), stream directly to client and store async
        if (contentLength > 10_000_000) {
          // Clone the response since we'll need it twice
          const [clientResponse, storageResponse] =
            response.body.tee()

          // No integrity check when storing proxied packages
          c.executionCtx.waitUntil(
            (async () => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                await c.env.BUCKET.put(filename, storageResponse, {
                  httpMetadata: {
                    contentType: 'application/octet-stream',
                    cacheControl: 'public, max-age=31536000',
                    // Store the integrity value if we have it from the manifest
                    ...(expectedIntegrity && {
                      integrity: expectedIntegrity,
                    }),
                  },
                })
                // Hono middleware logs successful storage
              } catch (_err) {
                // Hono middleware logs storage error
              }
            })(),
          )

          // Stream directly to client
          return new Response(clientResponse, {
            status: 200,
            headers: new Headers({
              'Content-Type': 'application/octet-stream',
              'Content-Length': contentLength.toString(),
              'Cache-Control': 'public, max-age=31536000',
            }),
          })
        }

        // For smaller packages, we can use the tee() approach safely
        const [stream1, stream2] = response.body.tee()

        // Store in R2 bucket asynchronously without integrity check for proxied packages
        c.executionCtx.waitUntil(
          (async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              await c.env.BUCKET.put(filename, stream1, {
                httpMetadata: {
                  contentType: 'application/octet-stream',
                  cacheControl: 'public, max-age=31536000',
                  // Store the integrity value if we have it from the manifest
                  ...(expectedIntegrity && {
                    integrity: expectedIntegrity,
                  }),
                },
              })
              // Hono middleware logs successful storage
            } catch (_err) {
              // Hono middleware logs storage error
            }
          })(),
        )

        // Return the second stream to the client immediately
        return new Response(stream2, {
          status: 200,
          headers: new Headers({
            'Content-Type': 'application/octet-stream',
            'Content-Length': contentLength.toString(),
            'Cache-Control': 'public, max-age=31536000',
          }),
        })
      } catch (_err) {
        // Hono middleware logs network error
        return c.json(
          { error: 'Failed to contact upstream registry' },
          502,
        )
      }
    }

    return c.json({ error: 'Not found' }, 404)
  } catch (_err) {
    // Hono middleware logs general error
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Get a single package version manifest
 */
export async function getPackageManifest(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as {
      scope: string
      pkg: string
    }

    // Handle scoped packages correctly with URL decoding
    try {
      const packageName = decodePackageName(scope, pkg)

      if (!packageName) {
        throw new Error('Invalid package name')
      }
      pkg = packageName
    } catch (_err) {
      // Hono middleware logs error information
      return c.json({ error: 'Invalid package name' }, 400)
    }

    // Extract version from URL path
    const pathParts = c.req.path.split('/')
    const versionIndex = pathParts.findIndex(part => part === pkg) + 1
    let version = pathParts[versionIndex] || 'latest'

    // Decode URL-encoded version (e.g., %3E%3D1.0.0%20%3C2.0.0 becomes >=1.0.0 <2.0.0)
    version = decodeURIComponent(version)

    // Hono middleware logs manifest request information

    // If it's a semver range, try to resolve it to a specific version
    let resolvedVersion = version
    if (semver.validRange(version) && !semver.valid(version)) {
      // This is a range, try to find the best matching version
      try {
        const packageData = await c.db.getPackage(pkg)
        if (packageData) {
          const versions = await c.db.getVersionsByPackage(pkg)
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (versions && versions.length > 0) {
             
            const availableVersions = versions.map(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
              (v: any) => v.version,
            )
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const bestMatch = semver.maxSatisfying(
              availableVersions,
              version,
            )
            if (bestMatch) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              resolvedVersion = bestMatch
              // Hono middleware logs version resolution
            }
          }
        }
      } catch (_err) {
        // Hono middleware logs version range error
      }
    }

    // Get the version from our database
    const versionData = await c.db.getVersion(
      `${pkg}@${resolvedVersion}`,
    )

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
        },
      }

      // Set proper headers for npm/bun
      c.header('Content-Type', 'application/json')
      c.header('Cache-Control', 'public, max-age=300') // 5 minute cache

      return c.json(ret, 200)
    }

    return c.json({ error: 'Version not found' }, 404)
  } catch (_err) {
    // Hono middleware logs error information
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Get package dist-tags
 */
export async function getPackageDistTags(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as {
      scope: string
      pkg: string
    }
    const tag = c.req.param('tag')

    // Handle scoped packages correctly with URL decoding
    try {
      const packageName = decodePackageName(scope, pkg)
      if (!packageName) {
        throw new Error('Invalid package name')
      }
      pkg = packageName
    } catch (_err) {
      // Hono middleware logs error information
      return c.json({ error: 'Invalid package name' }, 400)
    }

    // Hono middleware logs dist-tags request information

    const packageData = await c.db.getPackage(pkg)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    const distTags = packageData.tags || {}

    // Return specific tag
    const tagValue = distTags[tag]
    if (tagValue !== undefined) {
      return c.json({ [tag]: tagValue })
    }
    return c.json({ error: `Tag '${tag}' not found` }, 404)
  } catch (_err) {
    // Hono middleware logs error information
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Set/update a package dist-tag
 */
export async function putPackageDistTag(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as {
      scope: string
      pkg: string
    }
    const tag = c.req.param('tag')

    // Handle scoped packages correctly with URL decoding
    try {
      const packageName = decodePackageName(scope, pkg)
      if (!packageName) {
        throw new Error('Invalid package name')
      }
      pkg = packageName
    } catch (_err) {
      // Hono middleware logs error information
      return c.json({ error: 'Invalid package name' }, 400)
    }

    const version = await c.req.text()

    if (!version) {
      return c.json({ error: 'Tag and version are required' }, 400)
    }

    // Hono middleware logs dist-tag setting information

    const packageData = await c.db.getPackage(pkg)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    const distTags = packageData.tags || {}
    distTags[tag] = version

    await c.db.upsertPackage(pkg, distTags)

    return c.json(distTags, 201)
  } catch (_err) {
    // Hono middleware logs error information
    return c.json({ error: 'Internal server error' }, 500)
  }
}

/**
 * Delete a package dist-tag
 */
export async function deletePackageDistTag(c: HonoContext) {
  try {
    let { scope, pkg } = c.req.param() as {
      scope: string
      pkg: string
    }
    const tag = c.req.param('tag')

    // Handle scoped packages correctly with URL decoding
    try {
      const packageName = decodePackageName(scope, pkg)
      if (!packageName) {
        throw new Error('Invalid package name')
      }
      pkg = packageName
    } catch (_err) {
      // Hono middleware logs error information
      return c.json({ error: 'Invalid package name' }, 400)
    }

    // Tag is always provided by the route parameter
    if (!tag) {
      return c.json({ error: 'Tag is required' }, 400)
    }

    if (tag === 'latest') {
      return c.json({ error: 'Cannot delete latest tag' }, 400)
    }

    // Hono middleware logs dist-tag deletion information

    const packageData = await c.db.getPackage(pkg)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    const distTags = packageData.tags || {}

    const tagValue = distTags[tag]
    if (tagValue === undefined) {
      return c.json({ error: `Tag '${tag}' not found` }, 404)
    }

    delete distTags[tag]

    await c.db.upsertPackage(pkg, distTags)

    return c.json(distTags)
  } catch (_err) {
    // Hono middleware logs error information
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
      return await getPackageTarball(c)
    }

    // Check if this has a version (manifest request)
    const pathParts = path.split('/')
    const hasVersionSegment = pathParts.length >= 3 &&
      pathParts[2] &&
      !pathParts[2].startsWith('-')
     
    if (hasVersionSegment) {
      return await getPackageManifest(c)
    }

    // Otherwise it's a packument request
    return await getPackagePackument(c)
  } catch (_err) {
    // Hono middleware logs error information
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function getPackagePackument(c: HonoContext) {
  try {
    const name = c.req.param('pkg')
    const _scope = c.req.param('scope')
    // Get the versionRange query parameter
    const versionRange = c.req.query('versionRange')

    // Hono middleware logs packument request information

    // Name is always provided by the route parameter
    if (!name) {
      return c.json({ error: 'Package name is required' }, 400)
    }

    // Check if versionRange is a valid semver range
    const isValidRange =
      versionRange && semver.validRange(versionRange)
    const hasInvalidRange = versionRange && !isValidRange
     
    if (hasInvalidRange) {
      // Hono middleware logs invalid semver range
      return c.json(
        { error: `Invalid semver range: ${versionRange}` },
        400,
      )
    }

    // Use racing cache strategy when PROXY is enabled or upstream is specified
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const upstream = (c as any).upstream || (PROXY ? 'npm' : null)
    if (upstream) {
      // Hono middleware logs racing cache strategy information

      const fetchUpstreamFn = async () => {
        // Hono middleware logs upstream fetch information

        // Get the appropriate upstream configuration
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const upstreamConfig = getUpstreamConfig(upstream)
        if (!upstreamConfig) {
          throw new Error(`Unknown upstream: ${upstream}`)
        }

        const upstreamUrl = buildUpstreamUrl(upstreamConfig, name)
        // Hono middleware logs upstream URL

        const response = await fetch(upstreamUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'vlt-registry/1.0.0',
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Package not found')
          }
          throw new Error(`Upstream error: ${response.status}`)
        }

                            const upstreamData = (await response.json()) as _UpstreamData
          // Hono middleware logs successful upstream fetch

        // Prepare data for storage with consistent structure
        const packageData: PackageData = {
          name,
          'dist-tags': upstreamData['dist-tags'] ?? {
            latest:
              Object.keys(upstreamData.versions ?? {}).pop() ?? '',
          },
          versions: {},
          time: {
            modified:
              upstreamData.time?.modified ?? new Date().toISOString(),
          },
        }

        // Store timing information for each version
        if (upstreamData.time) {
          Object.entries(upstreamData.time).forEach(
            ([version, time]) => {
              if (version !== 'modified' && version !== 'created') {
                packageData.time[version] = time as string
              }
            },
          )
        }

        // Process versions and apply version range filter if needed
        if (upstreamData.versions) {
          const protocol = new URL(c.req.url).protocol.slice(0, -1) // Remove trailing ':'
          const host = c.req.header('host') || 'localhost:1337'
          const context = { protocol, host, upstream }

          Object.entries(upstreamData.versions).forEach(
            ([version, manifest]) => {
              // Skip versions that don't satisfy the range if a valid range is provided
              if (
                isValidRange &&
                !semver.satisfies(version, versionRange)
              ) {
                return
              }

              // Create a slimmed version of the manifest for the response with context for URL rewriting
              packageData.versions[version] = slimManifest(
                manifest as PackageManifest,
                context,
              )
            },
          )
        }

        // Return just the packageData for caching - the cache function handles storage metadata separately
        return packageData
      }

      try {
        const result = await getCachedPackageWithRefresh(
          c,
          name,
          fetchUpstreamFn,
          {
            packumentTtlMinutes: 5,
            upstream,
          },
        )

        if (result.fromCache && result.package) {
          // Hono middleware logs cached data usage

          // If we have cached data, still need to check if we need to filter by version range
          if (isValidRange && result.package.versions) {
            const filteredVersions: Record<string, unknown> = {}
            Object.keys(result.package.versions).forEach(version => {
              if (semver.satisfies(version, versionRange)) {
                filteredVersions[version] =
                  result.package.versions[version]
              }
            })
            result.package.versions = filteredVersions
          }

          return c.json(result.package, 200)
        } else if (result.package) {
          // Hono middleware logs fresh upstream data usage
          return c.json(result.package, 200)
        } else {
          return c.json({ error: 'Package data not available' }, 500)
        }
      } catch (error) {
        // Hono middleware logs racing error

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
    const packageData: PackageData = {
      name,
      'dist-tags': { latest: '' },
      versions: {},
      time: {
        modified: now.toISOString(),
      },
    }

    if (pkg) {
      // Update dist-tags from the database
      packageData['dist-tags'] = pkg.tags ?? { latest: '' }

      // Update modified time
      if (pkg.lastUpdated) {
        packageData.time.modified = pkg.lastUpdated
      }
    }

    // Get all versions for this package
    try {
      const allVersions = await c.db.getVersionsByPackage(name)

      if (allVersions?.length) {
        // Hono middleware logs version count information

        // Add all versions to the packument, use slimmed manifests
        for (const versionData of allVersions) {
          // Extract version from spec (format: "package@version")
          const versionParts = versionData.spec.split('@')
          const version = versionParts[versionParts.length - 1]
          
          // Ensure version is defined before proceeding
          if (!version) {
            continue
          }
          
          // Skip versions that don't satisfy the version range if provided
          if (
            isValidRange &&
            !semver.satisfies(
              version,
              versionRange,
            )
          ) {
            continue
          }

          // Use slimManifest to create a smaller response
          packageData.versions[version] =
            slimManifest(versionData.manifest)
          packageData.time[version] = versionData.publishedAt || new Date().toISOString()
        }
      } else {
        // Hono middleware logs no versions found

        // Add at least the latest version as a fallback if it satisfies the range
         
        const latestVersion = packageData['dist-tags'].latest
        const satisfiesRange = !isValidRange ||
          (latestVersion ? semver.satisfies(latestVersion, versionRange) : false)
        if (latestVersion && satisfiesRange) {
          const versionData = await c.db.getVersion(
            `${name}@${latestVersion}`,
          )
          if (versionData) {
            packageData.versions[latestVersion] = slimManifest(
              versionData.manifest,
            )
            packageData.time[latestVersion] = versionData.publishedAt || new Date().toISOString()
          } else {
            // Create a mock version for testing
            const mockManifest: PackageManifest = {
              name: name,
              version: latestVersion,
              description: `Mock package for ${name}`,
              dist: {
                tarball: `${DOMAIN}/${name}/-/${name}-${latestVersion}.tgz`,
              },
            }
            packageData.versions[latestVersion] = mockManifest
          }
        }
      }
    } catch (_err) {
      // Hono middleware logs database error

      // Create a basic version if none are found
      const latestVersion = packageData['dist-tags'].latest
      if (latestVersion) {
        const mockManifest: PackageManifest = {
          name: name,
          version: latestVersion,
          description: `Package ${name}`,
          dist: {
            tarball: `${DOMAIN}/${name}/-/${name}-${latestVersion}.tgz`,
          },
        }
        packageData.versions[latestVersion] = mockManifest
      }
    }

    return c.json(packageData, 200)
  } catch (_err) {
    // Hono middleware logs error information
    return c.json({ error: 'Internal server error' }, 500)
  }
}
