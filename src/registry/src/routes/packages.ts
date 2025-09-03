import * as semver from 'semver'
import validate from 'validate-npm-package-name'
import { createRoute, z } from '@hono/zod-openapi'
import { URL, PROXY, PROXY_URL } from '../../config.ts'
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
  DatabaseOperations,
} from '../../types.ts'

// Helper function to get typed database from context
function getDb(c: HonoContext): DatabaseOperations {
  return c.get('db')
}

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

interface _SlimmedManifest {
  name: string
  version: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, string>
  bin?: Record<string, string>
  engines?: Record<string, string>
  dist: {
    tarball: string
  }
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

    let parsed: Record<string, any>
    if (typeof manifest === 'string') {
      try {
        parsed = JSON.parse(manifest) as Record<string, any>
      } catch (_e) {
        parsed = manifest as unknown as Record<string, any>
      }
    } else {
      parsed = manifest as Record<string, any>
    }

    // For packuments, only include the most essential fields
    const slimmed: _SlimmedManifest = {
      name: parsed.name as string,
      version: parsed.version as string,
      dependencies: (parsed.dependencies ?? {}) as Record<
        string,
        string
      >,
      peerDependencies: (parsed.peerDependencies ?? {}) as Record<
        string,
        string
      >,
      optionalDependencies: (parsed.optionalDependencies ??
        {}) as Record<string, string>,
      peerDependenciesMeta: (parsed.peerDependenciesMeta ??
        {}) as Record<string, string>,
      bin: (parsed.bin ?? {}) as Record<string, string>,
      engines: (parsed.engines ?? {}) as Record<string, string>,
      dist: {
        tarball: await rewriteTarballUrlIfNeeded(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (parsed.dist?.tarball ?? '') as string,
          parsed.name as string,
          parsed.version as string,
          context,
        ),
      },
    }

    // Remove undefined fields to keep response clean
    Object.keys(slimmed).forEach(key => {
      if (
        key !== 'dist' &&
        key !== 'name' &&
        key !== 'version' &&
        slimmed[key as keyof _SlimmedManifest] === undefined
      ) {
        delete slimmed[key as keyof _SlimmedManifest]
      }
    })

    // Remove empty objects

    if (Object.keys(slimmed.dependencies ?? {}).length === 0) {
      delete slimmed.dependencies
    }

    if (Object.keys(slimmed.peerDependencies ?? {}).length === 0) {
      delete slimmed.peerDependencies
    }
    if (
      Object.keys(slimmed.peerDependenciesMeta ?? {}).length === 0
    ) {
      delete slimmed.peerDependenciesMeta
    }
    if (
      Object.keys(slimmed.optionalDependencies ?? {}).length === 0
    ) {
      delete slimmed.optionalDependencies
    }

    if (Object.keys(slimmed.engines ?? {}).length === 0) {
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
  _originalUrl: string,
  packageName: string,
  version: string,
  context: SlimPackumentContext = {},
): Promise<string> {
  try {
    const { upstream, protocol, host } = context

    if (!upstream || !protocol || !host) {
      // If no context, create a local tarball URL
      return `${URL}/${createFile({ pkg: packageName, version })}`
    }

    // Create a proper upstream tarball URL that points to our registry
    // Format: https://our-domain/upstream/package/-/package-version.tgz
    // For scoped packages like @scope/package, we need to preserve the full name
    const packageFileName =
      packageName.includes('/') ?
        packageName.split('/').pop() // For @scope/package, use just 'package'
      : packageName // For regular packages, use the full name

    return `${protocol}://${host}/${upstream}/${packageName}/-/${packageFileName}-${version}.tgz`
  } catch (_err) {
    // Fallback to local URL format
    return `${URL}/${createFile({ pkg: packageName, version })}`
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

    // If no route parameters, extract package name from path (for upstream routes)
    if (!scope && !pkg) {
      const path = c.req.path
      const pathSegments = path.split('/').filter(Boolean)

      // For upstream routes like /npm/lodash/-/lodash-4.17.21.tgz
      const upstream = c.get('upstream')
      if (upstream && pathSegments.length > 1) {
        // Find the /-/ segment
        const tarballIndex = pathSegments.findIndex(
          segment => segment === '-',
        )
        if (tarballIndex > 1) {
          // Package name is the segments between upstream and /-/
          const packageSegments = pathSegments.slice(1, tarballIndex)
          if (
            packageSegments[0]?.startsWith('@') &&
            packageSegments.length > 1
          ) {
            // Scoped package: @scope/package
            pkg = `${packageSegments[0]}/${packageSegments[1]}`
          } else {
            // Regular package
            pkg = packageSegments[0] || ''
          }
        }
      } else {
        // Direct tarball routes (without upstream)
        const tarballIndex = pathSegments.findIndex(
          segment => segment === '-',
        )
        if (tarballIndex > 0) {
          const packageSegments = pathSegments.slice(0, tarballIndex)
          if (
            packageSegments[0]?.startsWith('@') &&
            packageSegments.length > 1
          ) {
            // Scoped package: @scope/package
            pkg = `${packageSegments[0]}/${packageSegments[1]}`
          } else {
            // Regular package
            pkg = packageSegments[0] || ''
          }
        }
      }
    } else {
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
    }

    // Ensure we have a package name
    if (!pkg) {
      return c.json({ error: 'Invalid package name' }, 400)
    }

    let tarball = c.req.path.split('/').pop()
    if (!tarball?.endsWith('.tgz')) {
      // Hono middleware logs error information
      return c.json({ error: 'Invalid tarball name' }, 400)
    }

    // Check if the tarball filename contains a dist-tag like "latest" instead of a version
    // and resolve it to the actual version number
    const packageFileName =
      pkg.includes('/') ? pkg.split('/').pop() : pkg
    const prefix = `${packageFileName}-`
    const suffix = '.tgz'

    if (tarball.startsWith(prefix) && tarball.endsWith(suffix)) {
      const versionFromTarball = tarball.slice(
        prefix.length,
        -suffix.length,
      )

      // If version looks like a dist-tag (not a semver), try to resolve it
      if (
        versionFromTarball &&
        !semver.valid(versionFromTarball) &&
        !semver.validRange(versionFromTarball)
      ) {
        // This might be a dist-tag like "latest", try to resolve it
        try {
          const upstream = c.get('upstream')
          if (upstream) {
            // Get packument data to find the actual version for this dist-tag
            const upstreamConfig = getUpstreamConfig(upstream)
            if (upstreamConfig) {
              const packumentUrl = buildUpstreamUrl(
                upstreamConfig,
                pkg,
              )
              const packumentResponse = await fetch(packumentUrl, {
                method: 'GET',
                headers: {
                  'User-Agent': 'vlt-serverless-registry',
                  Accept: 'application/json',
                },
              })

              if (packumentResponse.ok) {
                const packumentData = await packumentResponse.json()
                const distTags =
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  ((packumentData as Record<string, any>)[
                    'dist-tags'
                  ] as Record<string, string>) || {}
                const actualVersion = distTags[versionFromTarball]

                if (actualVersion) {
                  // Update the tarball filename with the actual version
                  tarball = `${packageFileName}-${actualVersion}.tgz`
                }
              }
            }
          }
        } catch (_error) {
          // If dist-tag resolution fails, continue with original tarball name
          // and let the upstream handle it (which will likely 404)
        }
      }
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
          const versionData = await getDb(c).getVersion(spec)

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
            },
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

        // Get the upstream configuration
        const upstream = c.get('upstream')
        let source: string

        if (upstream) {
          // Use upstream-specific URL
          const upstreamConfig = getUpstreamConfig(upstream)
          if (!upstreamConfig) {
            return c.json(
              { error: `Unknown upstream: ${upstream}` },
              400,
            )
          }
          source = `${upstreamConfig.url}/${tarballPath}`
        } else {
          // Use default proxy URL
          source = `${PROXY_URL}/${tarballPath}`
        }

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

    // If no route parameters, extract package name from path (for upstream routes)
    if (!scope && !pkg) {
      const path = c.req.path
      const pathSegments = path.split('/').filter(Boolean)

      // For upstream routes like /npm/express/4.18.2
      const upstream = c.get('upstream')
      if (upstream && pathSegments.length > 2) {
        // Package name starts after upstream, version is last segment
        const packageSegments = pathSegments.slice(1, -1) // Remove upstream and version
        if (
          packageSegments[0]?.startsWith('@') &&
          packageSegments.length > 1
        ) {
          // Scoped package: @scope/package
          pkg = `${packageSegments[0]}/${packageSegments[1]}`
        } else {
          // Regular package
          pkg = packageSegments[0] || ''
        }
      } else if (pathSegments.length > 1) {
        // Direct manifest routes (without upstream)
        const packageSegments = pathSegments.slice(0, -1) // Remove version
        if (
          packageSegments[0]?.startsWith('@') &&
          packageSegments.length > 1
        ) {
          // Scoped package: @scope/package
          pkg = `${packageSegments[0]}/${packageSegments[1]}`
        } else {
          // Regular package
          pkg = packageSegments[0] || ''
        }
      }
    } else {
      // Handle scoped packages correctly
      try {
        if (scope && pkg) {
          // Scoped package
          const packageName =
            scope.startsWith('@') ?
              `${scope}/${pkg}`
            : `@${scope}/${pkg}`
          pkg = packageName
        } else if (scope) {
          // Unscoped package (scope is actually the package name)
          pkg = scope
        }

        if (!pkg) {
          throw new Error('Invalid package name')
        }
      } catch (_err) {
        // Hono middleware logs error information
        return c.json({ error: 'Invalid package name' }, 400)
      }
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
        const packageData = await getDb(c).getPackage(pkg)
        if (packageData) {
          const versions = await getDb(c).getVersionsByPackage(pkg)

          if (versions.length > 0) {
            const availableVersions = versions.map(v => v.version)

            const bestMatch = semver.maxSatisfying(
              availableVersions,
              version,
            )
            if (bestMatch) {
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
    const versionData = await c
      .get('db')
      .getVersion(`${pkg}@${resolvedVersion}`)

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
          tarball: `${URL}/${createFile({ pkg, version: resolvedVersion })}`,
        },
      }

      // Set proper headers for npm/bun
      c.header('Content-Type', 'application/json')
      c.header('Cache-Control', 'public, max-age=300') // 5 minute cache

      return c.json(ret, 200)
    }

    // If not found locally and we have an upstream, try to fetch from upstream
    const upstream = c.get('upstream')
    if (upstream && PROXY) {
      try {
        // Get the upstream configuration
        const upstreamConfig = getUpstreamConfig(upstream)
        if (!upstreamConfig) {
          return c.json(
            { error: `Unknown upstream: ${upstream}` },
            400,
          )
        }

        const upstreamUrl = `${upstreamConfig.url}/${pkg}/${resolvedVersion}`

        const response = await fetch(upstreamUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'vlt-registry/1.0.0',
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            return c.json({ error: 'Version not found' }, 404)
          }
          return c.json(
            { error: 'Failed to fetch upstream manifest' },
            502,
          )
        }

        const upstreamManifest = await response.json()

        // Rewrite tarball URL to point to our registry with upstream prefix

        if (
          upstreamManifest &&
          typeof upstreamManifest === 'object' &&
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (upstreamManifest as any).dist?.tarball
        ) {
          const requestUrl = new globalThis.URL(c.req.url)
          const protocol = requestUrl.protocol.slice(0, -1) // Remove trailing ':'
          const host = c.req.header('host') ?? 'localhost:1337'
          const context = {
            protocol,
            host,
            upstream,
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ;(upstreamManifest as any).dist.tarball =
            await rewriteTarballUrlIfNeeded(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              String((upstreamManifest as any).dist.tarball),
              pkg,
              resolvedVersion,
              context,
            )
        }

        // Set proper headers for npm/bun
        c.header('Content-Type', 'application/json')
        c.header('Cache-Control', 'public, max-age=300') // 5 minute cache

        return c.json(upstreamManifest as Record<string, any>, 200)
      } catch (_err) {
        // Fall through to 404
      }
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
    const scope = c.req.param('scope')
    const pkg = c.req.param('pkg')
    const tag = c.req.param('tag')

    // Determine the package name based on route parameters
    let packageName: string | null = null
    if (scope && pkg) {
      // Scoped package: /-/package/:scope%2f:pkg/dist-tags
      packageName = decodePackageName(scope, pkg)
    } else if (pkg) {
      // Unscoped package: /-/package/:pkg/dist-tags
      packageName = decodeURIComponent(pkg)
    }

    if (!packageName) {
      return c.json({ error: 'Invalid package name' }, 400)
    }

    // Set response headers
    c.header('Content-Type', 'application/json')
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate')

    const packageData = await getDb(c).getPackage(packageName)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    // Check if this package is proxied and should not allow dist-tag operations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((packageData as any).source === 'proxy') {
      return c.json(
        {
          error:
            'Cannot perform dist-tag operations on proxied packages',
        },
        403,
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const distTags = packageData.tags ?? {}

    // If no tag specified, return all tags
    if (!tag) {
      // If no tags exist, return default latest tag
      if (Object.keys(distTags).length === 0) {
        return c.json({ latest: '' })
      }
      return c.json(distTags)
    }

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
    const scope = c.req.param('scope')
    const pkg = c.req.param('pkg')
    const tag = c.req.param('tag')

    // Determine the package name based on route parameters
    let packageName: string | null = null
    if (scope && pkg) {
      // Scoped package: /-/package/:scope%2f:pkg/dist-tags/:tag
      packageName = decodePackageName(scope, pkg)
    } else if (pkg) {
      // Unscoped package: /-/package/:pkg/dist-tags/:tag
      packageName = decodeURIComponent(pkg)
    }

    if (!packageName) {
      return c.json({ error: 'Invalid package name' }, 400)
    }

    const version = await c.req.text()

    if (!version || !tag) {
      return c.json({ error: 'Tag and version are required' }, 400)
    }

    // Validate that tag name is not a valid semver range
    if (semver.validRange(tag)) {
      return c.json(
        {
          error: `Tag name must not be a valid SemVer range: ${tag}`,
        },
        400,
      )
    }

    const packageData = await getDb(c).getPackage(packageName)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    // Check if this package is proxied and should not allow dist-tag operations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((packageData as any).source === 'proxy') {
      return c.json(
        {
          error:
            'Cannot perform dist-tag operations on proxied packages',
        },
        403,
      )
    }

    // Validate that the version exists
    const versionSpec = `${packageName}@${version}`
    const versionData = await getDb(c).getVersion(versionSpec)
    if (!versionData) {
      return c.json(
        {
          error: `Version ${version} not found`,
        },
        404,
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const distTags = packageData.tags ?? {}
    distTags[tag] = version

    await getDb(c).upsertPackage(packageName, distTags)

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
    const scope = c.req.param('scope')
    const pkg = c.req.param('pkg')
    const tag = c.req.param('tag')

    // Determine the package name based on route parameters
    let packageName: string | null = null
    if (scope && pkg) {
      // Scoped package: /-/package/:scope%2f:pkg/dist-tags/:tag
      packageName = decodePackageName(scope, pkg)
    } else if (pkg) {
      // Unscoped package: /-/package/:pkg/dist-tags/:tag
      packageName = decodeURIComponent(pkg)
    }

    if (!packageName) {
      return c.json({ error: 'Invalid package name' }, 400)
    }

    // Tag is always provided by the route parameter
    if (!tag) {
      return c.json({ error: 'Tag is required' }, 400)
    }

    if (tag === 'latest') {
      return c.json({ error: 'Cannot delete the "latest" tag' }, 400)
    }

    const packageData = await getDb(c).getPackage(packageName)

    if (!packageData) {
      return c.json({ error: 'Package not found' }, 404)
    }

    // Check if this package is proxied and should not allow dist-tag operations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((packageData as any).source === 'proxy') {
      return c.json(
        {
          error:
            'Cannot perform dist-tag operations on proxied packages',
        },
        403,
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const distTags = packageData.tags ?? {}

    const tagValue = distTags[tag]
    if (tagValue === undefined) {
      return c.json({ error: `Tag ${tag} not found` }, 404)
    }

    delete distTags[tag]

    await getDb(c).upsertPackage(packageName, distTags)

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
    const pathParts = path.split('/').filter(Boolean) // Remove empty strings

    // For upstream routes like /npm/lodash/1.0.0, we need to account for the upstream prefix
    const upstream = c.get('upstream')
    let packageStartIndex = 0

    if (upstream) {
      // Skip the upstream name in the path
      packageStartIndex = 1
    }

    // Check if we have a version segment after the package name
    let hasVersionSegment = false
    if (pathParts.length > packageStartIndex + 1) {
      const potentialVersion = pathParts[packageStartIndex + 1]
      // Handle scoped packages: @scope/package/version
      if (pathParts[packageStartIndex]?.startsWith('@')) {
        // For scoped packages, version is at index packageStartIndex + 2
        const versionSegment = pathParts[packageStartIndex + 2]
        hasVersionSegment =
          pathParts.length > packageStartIndex + 2 &&
          Boolean(versionSegment && !versionSegment.startsWith('-'))
      } else {
        // For regular packages, version is at index packageStartIndex + 1
        hasVersionSegment = Boolean(
          potentialVersion && !potentialVersion.startsWith('-'),
        )
      }
    }

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

/**
 * Publish a package (create or update)
 */
export async function publishPackage(c: HonoContext) {
  try {
    const pkg = decodeURIComponent(c.req.param('pkg'))

    // Validate package name
    const validation = validate(pkg)
    if (!validation.validForNewPackages) {
      return c.json(
        {
          error: 'Invalid package name',
          reason:
            validation.errors?.join(', ') ||
            'Package name is not valid',
        },
        400,
      )
    }

    // Get package data from request body
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const packageData = await c.req.json()

    if (!packageData || typeof packageData !== 'object') {
      return c.json({ error: 'Invalid package data' }, 400)
    }

    // Extract version information

    const versions =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-member-access
      (packageData.versions as Record<string, any>) || {}
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-member-access
    const distTags = (packageData['dist-tags'] as Record<
      string,
      string
    >) || {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      latest: packageData.version as string,
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!packageData.version && !Object.keys(versions).length) {
      return c.json(
        { error: 'Package must have at least one version' },
        400,
      )
    }

    // If this is a single version publish, structure it properly
    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      packageData.version &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      !versions[packageData.version as string]
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const version = packageData.version as string
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      versions[version] = {
        ...packageData,
        name: pkg,
        version,
        dist: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ...(packageData.dist as Record<string, any>),
          tarball:
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (packageData.dist?.tarball as string) ||
            `${c.req.url.split('/').slice(0, 3).join('/')}/${pkg}/-/${pkg.split('/').pop()}-${version}.tgz`,
        },
      }
    }

    // Store package metadata
    await getDb(c).upsertPackage(
      pkg,
      distTags,
      new Date().toISOString(),
    )

    // Store each version
    const versionPromises = Object.entries(versions).map(
      ([version, manifest]) => {
        const typedManifest = manifest as Record<string, any>
        return getDb(c).upsertVersion(
          `${pkg}@${version}`,
          typedManifest as PackageManifest,
          (typedManifest.publishedAt as string) ||
            new Date().toISOString(),
        )
      },
    )

    await Promise.all(versionPromises)

    return c.json({ success: true }, 201)
  } catch (error) {
    // TODO: Replace with proper logging system
    // eslint-disable-next-line no-console
    console.error('Package publish error:', error)
    return c.json({ error: 'Failed to publish package' }, 500)
  }
}

export async function getPackagePackument(c: HonoContext) {
  try {
    // Try to get name from route parameters first (for direct routes)
    let name = c.req.param('pkg')
    const _scope = c.req.param('scope')

    // If no route parameter, extract from path (for upstream routes)
    if (!name) {
      const path = c.req.path
      const pathSegments = path.split('/').filter(Boolean)

      // For upstream routes like /npm/lodash, skip the upstream name
      const upstream = c.get('upstream')
      if (upstream && pathSegments.length > 1) {
        // Handle scoped packages: /npm/@scope/package
        if (
          pathSegments[1]?.startsWith('@') &&
          pathSegments.length > 2
        ) {
          name = `${pathSegments[1]}/${pathSegments[2]}`
        } else {
          name = pathSegments[1] || ''
        }
      } else if (pathSegments.length > 0) {
        // Handle direct package routes
        if (
          pathSegments[0]?.startsWith('@') &&
          pathSegments.length > 1
        ) {
          name = `${pathSegments[0]}/${pathSegments[1] || ''}`
        } else {
          name = pathSegments[0] || ''
        }
      }
    }

    // Get the versionRange query parameter
    const versionRange = c.req.query('versionRange')

    // Hono middleware logs packument request information

    // Name is always provided by the route parameter or extracted from path
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

    // Check if this is an explicit upstream route (like /npm/lodash)
    const explicitUpstream = c.get('upstream')

    // For explicit upstream routes, always use upstream logic
    // For other routes, check if package exists locally first
    let localPkg = null
    if (!explicitUpstream) {
      localPkg = await getDb(c).getPackage(name)
    }

    // Use racing cache strategy when:
    // 1. Explicit upstream is specified (like /npm/lodash)
    // 2. PROXY is enabled and package doesn't exist locally
    const upstream =
      explicitUpstream || (PROXY && !localPkg ? 'npm' : null)
    if (upstream) {
      // Hono middleware logs racing cache strategy information

      const fetchUpstreamFn = async () => {
        // Get the appropriate upstream configuration
        const upstreamConfig = getUpstreamConfig(upstream)
        if (!upstreamConfig) {
          throw new Error(`Unknown upstream: ${upstream}`)
        }

        const upstreamUrl = buildUpstreamUrl(upstreamConfig, name)

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

        const upstreamData: _UpstreamData = await response.json()

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
                packageData.time[version] = time
              }
            },
          )
        }

        // For fast response, only process essential versions synchronously
        if (upstreamData.versions) {
          const requestUrl = new globalThis.URL(c.req.url)
          const protocol = requestUrl.protocol.slice(0, -1) // Remove trailing ':'
          const host = c.req.header('host') ?? 'localhost:1337'
          const context = {
            protocol,
            host,
            upstream: upstream,
          }

          // Get essential versions (latest, plus any matching the version range if specified)
          const distTags = upstreamData['dist-tags'] ?? {}
          const latestVersion = distTags.latest
          const essentialVersions = new Set<string>()

          // Always include latest
          if (latestVersion) {
            essentialVersions.add(latestVersion)
          }

          // If version range specified, include only matching versions (up to 10 for performance)
          if (isValidRange) {
            const matchingVersions = Object.keys(
              upstreamData.versions,
            )
              .filter(v => semver.satisfies(v, versionRange))
              .slice(0, 10) // Limit to 10 versions for performance
            matchingVersions.forEach(v => essentialVersions.add(v))
          } else {
            // For packument requests without version range, include only the 5 most recent versions
            const sortedVersions = Object.keys(upstreamData.versions)
              .sort((a, b) => semver.rcompare(a, b))
              .slice(0, 5)
            sortedVersions.forEach(v => essentialVersions.add(v))
          }

          // Process only essential versions synchronously for fast response
          for (const version of essentialVersions) {
            const manifest = upstreamData.versions[version]
            if (manifest) {
              const slimmedManifest = slimManifest(
                manifest as PackageManifest,
                context,
              )
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (slimmedManifest) {
                packageData.versions[version] = slimmedManifest
              }
            }
          }

          // Process all other versions in background for complete caching
          c.executionCtx.waitUntil(
            (async () => {
              try {
                const allVersionStoragePromises: Promise<unknown>[] =
                  []

                // Process all versions for complete database storage
                Object.entries(upstreamData.versions ?? {}).forEach(
                  ([version, manifest]) => {
                    const versionSpec = `${name}@${version}`
                    const manifestForStorage = {
                      name: name,
                      version: version,
                      ...slimManifest(
                        manifest as PackageManifest,
                        context,
                      ),
                    } as PackageManifest

                    allVersionStoragePromises.push(
                      getDb(c)
                        .upsertCachedVersion(
                          versionSpec,
                          manifestForStorage,
                          upstream,
                          upstreamData.time?.[version] ??
                            new Date().toISOString(),
                        )
                        .catch((_err: unknown) => {
                          // Log error but don't fail the background task
                        }),
                    )
                  },
                )

                // Store package metadata and all versions
                await Promise.all([
                  ...allVersionStoragePromises,
                  getDb(c)
                    .upsertCachedPackage(
                      name,
                      packageData['dist-tags'],
                      upstream,
                      packageData.time.modified,
                    )
                    .catch((_err: unknown) => {
                      // Log error but don't fail the background task
                    }),
                ])
              } catch (_err) {
                // Log error but don't fail the request
              }
            })(),
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
            packumentTtlMinutes: 60, // Cache packuments for 1 hour
            staleWhileRevalidateMinutes: 240, // Allow stale data for 4 hours while refreshing
            upstream: upstream,
          },
        )

        if (result.fromCache && result.package) {
          // Hono middleware logs cached data usage

          // If we have cached data, still need to check if we need to filter by version range
          if (isValidRange) {
            const filteredVersions: Record<string, unknown> = {}
            Object.keys(result.package.versions).forEach(version => {
              if (semver.satisfies(version, versionRange)) {
                filteredVersions[version] =
                  result.package?.versions[version]
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
        // Return more specific error codes
        if ((error as Error).message.includes('Package not found')) {
          return c.json({ error: `Package '${name}' not found` }, 404)
        }

        return c.json({ error: 'Failed to fetch package data' }, 502)
      }
    }

    // Fallback to original logic when PROXY is disabled
    const pkg = await getDb(c).getPackage(name)
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
      packageData['dist-tags'] = pkg.tags

      // Update modified time
      if (pkg.lastUpdated) {
        packageData.time.modified = pkg.lastUpdated
      }
    }

    // Get all versions for this package
    try {
      const allVersions = await getDb(c).getVersionsByPackage(name)

      if (allVersions.length > 0) {
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
            !semver.satisfies(version, versionRange)
          ) {
            continue
          }

          // Use slimManifest to create a smaller response
          const slimmedManifest = slimManifest(
            versionData.manifest as PackageManifest,
          )
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (slimmedManifest) {
            packageData.versions[version] = slimmedManifest
          }
          packageData.time[version] =
            versionData.published_at ?? new Date().toISOString()
        }
      } else {
        // Hono middleware logs no versions found

        // Add at least the latest version as a fallback if it satisfies the range

        const latestVersion = packageData['dist-tags'].latest
        const satisfiesRange =
          !isValidRange ||
          (latestVersion ?
            semver.satisfies(latestVersion, versionRange)
          : false)
        if (latestVersion && satisfiesRange) {
          const versionData = await getDb(c).getVersion(
            `${name}@${latestVersion}`,
          )
          if (versionData) {
            const slimmedManifest = slimManifest(
              versionData.manifest as PackageManifest,
            )
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (slimmedManifest) {
              packageData.versions[latestVersion] = slimmedManifest
            }
            packageData.time[latestVersion] =
              versionData.published_at ?? new Date().toISOString()
          } else {
            // Create a mock version for testing
            const mockManifest: PackageManifest = {
              name: name,
              version: latestVersion,
              description: `Mock package for ${name}`,
              dist: {
                tarball: `${URL}/${name}/-/${name}-${latestVersion}.tgz`,
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
            tarball: `${URL}/${name}/-/${name}-${latestVersion}.tgz`,
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

/**
 * Handle root package route - checks for local package existence and redirects to upstream if not found
 * This is used for the `/:pkg` route to handle package discovery
 */
export async function handleRootPackageRoute(c: HonoContext) {
  const pkg = decodeURIComponent(c.req.param('pkg'))

  // Skip if this looks like a static asset or internal route
  if (
    pkg.includes('.') ||
    pkg.startsWith('-') ||
    pkg.startsWith('_')
  ) {
    // For static assets, let other routes handle this
    return new Response(null, { status: 404 })
  }

  // Check if this package exists locally first
  try {
    const localPackage = await getDb(c).getPackage(pkg)
    if (localPackage) {
      // Package exists locally, handle it with the local package route handler
      return await handlePackageRoute(c)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking local package:', error)
    // Continue to upstream redirect on database error
  }

  // Package doesn't exist locally, redirect to default upstream
  const { getDefaultUpstream } = await import('../utils/upstream.ts')
  const defaultUpstream = getDefaultUpstream()
  return c.redirect(`/${defaultUpstream}/${pkg}`, 302)
}

/**
 * Handle package publishing - validates authentication and delegates to publishPackage
 * This is used for the `PUT /:pkg` route to handle package publishing
 */
export async function handlePackagePublish(c: HonoContext) {
  const authHeader =
    c.req.header('authorization') || c.req.header('Authorization')

  // Check for authentication
  if (!authHeader) {
    return c.json(
      {
        error: 'Authentication required',
        reason:
          'You must be logged in to publish packages. Run "npm adduser" first.',
      },
      401,
    )
  }

  // Extract token and verify
  const token =
    authHeader.startsWith('Bearer ') ?
      authHeader.substring(7).trim()
    : null
  if (!token) {
    return c.json(
      {
        error: 'Invalid authentication format',
        reason:
          'Authorization header must be in "Bearer <token>" format',
      },
      401,
    )
  }

  // Verify token has package publishing permissions
  const { verifyToken } = await import('../utils/auth.ts')
  const isValid = await verifyToken(token, c)
  if (!isValid) {
    return c.json(
      {
        error: 'Invalid or insufficient permissions',
        reason: 'Token does not have permission to publish packages',
      },
      403,
    )
  }

  // Delegate to publishPackage function
  return publishPackage(c)
}

/**
 * Handle package version route - checks for local package existence and redirects to upstream if not found
 * This is used for the `/:pkg/:version` route to handle package version requests
 */
export async function handlePackageVersion(c: HonoContext) {
  const pkg = decodeURIComponent(c.req.param('pkg'))
  const version = c.req.param('version')

  // Skip if this looks like a static asset or internal route
  if (
    pkg.includes('.') ||
    pkg.startsWith('-') ||
    pkg.startsWith('_')
  ) {
    return new Response(null, { status: 404 })
  }

  // Check if this package exists locally first
  try {
    const localPackage = await getDb(c).getPackage(pkg)
    if (localPackage) {
      // Package exists locally, handle it with the local package route handler
      return await handlePackageRoute(c)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking local package version:', error)
    // Continue to upstream redirect on database error
  }

  // Package doesn't exist locally, redirect to default upstream
  const { getDefaultUpstream } = await import('../utils/upstream.ts')
  const defaultUpstream = getDefaultUpstream()
  return c.redirect(`/${defaultUpstream}/${pkg}/${version}`, 302)
}

/**
 * Handle package tarball route - checks for local package existence and redirects to upstream if not found
 * This is used for the `/:pkg/-/:tarball` route to handle package tarball requests
 */
export async function handlePackageTarball(c: HonoContext) {
  const pkg = decodeURIComponent(c.req.param('pkg'))

  // Skip if this looks like a static asset or internal route
  if (
    pkg.includes('.') ||
    pkg.startsWith('-') ||
    pkg.startsWith('_')
  ) {
    return new Response(null, { status: 404 })
  }

  // Check if this package exists locally first
  try {
    const localPackage = await getDb(c).getPackage(pkg)
    if (localPackage) {
      // Package exists locally, handle it with the local package route handler
      return await handlePackageRoute(c)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking local package tarball:', error)
    // Continue to upstream redirect on database error
  }

  // Package doesn't exist locally, redirect to default upstream
  const { getDefaultUpstream } = await import('../utils/upstream.ts')
  const defaultUpstream = getDefaultUpstream()
  const tarball = c.req.param('tarball')
  return c.redirect(`/${defaultUpstream}/${pkg}/-/${tarball}`, 302)
}

/**
 * Validates upstream and sets context, then delegates to handlePackageRoute
 * Common logic shared by all upstream routes
 */
async function validateUpstreamAndDelegate(
  c: HonoContext,
): Promise<Response> {
  const upstream = c.req.param('upstream')

  // Import validation functions dynamically to avoid circular dependencies
  const { isValidUpstreamName, getUpstreamConfig } = await import(
    '../utils/upstream.ts'
  )

  // Validate upstream name
  if (!isValidUpstreamName(upstream)) {
    return c.json(
      { error: `Invalid or reserved upstream name: ${upstream}` },
      400,
    )
  }

  // Check if upstream is configured
  const upstreamConfig = getUpstreamConfig(upstream)
  if (!upstreamConfig) {
    return c.json({ error: `Unknown upstream: ${upstream}` }, 404)
  }

  // Set upstream context and delegate to handlePackageRoute
  c.set('upstream', upstream)
  return await handlePackageRoute(c)
}

/**
 * Handle upstream package requests like /npm/lodash, /jsr/@std/fs
 * This is used for the `/:upstream/:pkg` route
 */
export async function handleUpstreamPackage(c: HonoContext) {
  return validateUpstreamAndDelegate(c)
}

/**
 * Handle unencoded scoped package tarball requests like /npm/@types/node/-/node-18.0.0.tgz
 * This is used for the `/:upstream/:scope/:pkg/-/:tarball` route (most specific - 5 segments)
 */
export async function handleUpstreamScopedTarball(c: HonoContext) {
  return validateUpstreamAndDelegate(c)
}

/**
 * Handle unencoded scoped package versions like /npm/@types/node/18.0.0
 * This is used for the `/:upstream/:scope/:pkg/:version` route
 */
export async function handleUpstreamScopedVersion(c: HonoContext) {
  return validateUpstreamAndDelegate(c)
}

/**
 * Handle URL-encoded scoped packages like /npm/@babel%2Fcore
 * This is used for the `/:upstream/:scope%2f:pkg` route
 */
export async function handleUpstreamEncodedScoped(c: HonoContext) {
  return validateUpstreamAndDelegate(c)
}

/**
 * Unified route handler for 3-segment paths: /npm/pkg/version OR /npm/@scope/package
 * This is used for the `/:upstream/:param2/:param3` route
 */
export async function handleUpstreamUnified(c: HonoContext) {
  return validateUpstreamAndDelegate(c)
}

/**
 * Handle upstream tarball requests like /npm/lodash/-/lodash-4.17.21.tgz
 * This is used for the `/:upstream/:pkg/-/:tarball` route
 */
export async function handleUpstreamTarball(c: HonoContext) {
  return validateUpstreamAndDelegate(c)
}

// Route definitions for OpenAPI documentation

// Package manifest routes
export const getPackageRoute = createRoute({
  method: 'get',
  path: '/{pkg}',
  tags: ['Packages'],
  summary: 'Get Package Manifest',
  description: `Get the full package manifest (packument) for a package
\`\`\`bash
$ npm view lodash
\`\`\``,
  request: {
    params: z.object({
      pkg: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            'dist-tags': z.record(z.string()),
            versions: z.record(z.any()),
          }),
        },
      },
      description: 'Package manifest',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const getScopedPackageRoute = createRoute({
  method: 'get',
  path: '/{scope}/{pkg}',
  tags: ['Packages'],
  summary: 'Get Scoped Package Manifest',
  description: `Get the full package manifest for a scoped package
\`\`\`bash
$ npm view @types/node
\`\`\``,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            'dist-tags': z.record(z.string()),
            versions: z.record(z.any()),
          }),
        },
      },
      description: 'Package manifest',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

// Package version routes
export const getPackageVersionRoute = createRoute({
  method: 'get',
  path: '/{pkg}/{version}',
  tags: ['Packages'],
  summary: 'Get Package Version Manifest',
  description: `Get the manifest for a specific version of a package
\`\`\`bash
$ npm view lodash@4.17.21
\`\`\``,
  request: {
    params: z.object({
      pkg: z.string(),
      version: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            version: z.string(),
            dist: z.object({
              tarball: z.string(),
              shasum: z.string(),
            }),
          }),
        },
      },
      description: 'Package version manifest',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package version not found',
    },
  },
})

export const getScopedPackageVersionRoute = createRoute({
  method: 'get',
  path: '/{scope}/{pkg}/{version}',
  tags: ['Packages'],
  summary: 'Get Scoped Package Version Manifest',
  description: `Get the manifest for a specific version of a scoped package
\`\`\`bash
$ npm view @types/node@18.0.0
\`\`\``,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
      version: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            version: z.string(),
            dist: z.object({
              tarball: z.string(),
              shasum: z.string(),
            }),
          }),
        },
      },
      description: 'Package version manifest',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package version not found',
    },
  },
})

// Package tarball routes
export const getPackageTarballRoute = createRoute({
  method: 'get',
  path: '/{pkg}/-/{tarball}',
  tags: ['Packages'],
  summary: 'Download Package Tarball',
  description: `Download the tarball for a specific version of a package`,
  request: {
    params: z.object({
      pkg: z.string(),
      tarball: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/octet-stream': {
          schema: z.string().openapi({ format: 'binary' }),
        },
      },
      description: 'Package tarball',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Tarball not found',
    },
  },
})

export const getScopedPackageTarballRoute = createRoute({
  method: 'get',
  path: '/{scope}/{pkg}/-/{tarball}',
  tags: ['Packages'],
  summary: 'Download Scoped Package Tarball',
  description: `Download the tarball for a specific version of a scoped package`,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
      tarball: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/octet-stream': {
          schema: z.string().openapi({ format: 'binary' }),
        },
      },
      description: 'Package tarball',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Tarball not found',
    },
  },
})

// Package publishing route
export const publishPackageRoute = createRoute({
  method: 'put',
  path: '/{pkg}',
  tags: ['Packages'],
  summary: 'Publish Package',
  description: `Publish a new version of a package
\`\`\`bash
$ npm publish
\`\`\``,
  request: {
    params: z.object({
      pkg: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            versions: z.record(z.any()),
            'dist-tags': z.record(z.string()),
            _attachments: z.record(z.any()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            ok: z.boolean(),
            id: z.string(),
            rev: z.string(),
          }),
        },
      },
      description: 'Package published successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Bad request',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Authentication required',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Insufficient permissions',
    },
  },
})

// Dist-tag route definitions
export const getPackageDistTagsRoute = createRoute({
  method: 'get',
  path: '/-/package/{pkg}/dist-tags',
  tags: ['Dist-Tags'],
  summary: 'Get Package Dist Tags',
  description: `Get all dist-tags for a package
\`\`\`bash
$ npm dist-tag ls mypackage
\`\`\``,
  request: {
    params: z.object({
      pkg: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.record(z.string()),
        },
      },
      description: 'Package dist-tags',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const putPackageDistTagRoute = createRoute({
  method: 'put',
  path: '/-/package/{pkg}/dist-tags/{tag}',
  tags: ['Dist-Tags'],
  summary: 'Set Package Dist Tag',
  description: `Set or update a dist-tag for a package version
\`\`\`bash
$ npm dist-tag add mypackage@1.0.0 beta
\`\`\``,
  request: {
    params: z.object({
      pkg: z.string(),
      tag: z.string(),
    }),
    body: {
      content: {
        'text/plain': {
          schema: z.string(),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            ok: z.boolean(),
            id: z.string(),
            rev: z.string(),
          }),
        },
      },
      description: 'Dist-tag set successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Invalid version or tag',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Cannot modify dist-tags on proxied packages',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found',
    },
  },
})

export const deletePackageDistTagRoute = createRoute({
  method: 'delete',
  path: '/-/package/{pkg}/dist-tags/{tag}',
  tags: ['Dist-Tags'],
  summary: 'Delete Package Dist Tag',
  description: `Delete a dist-tag from a package
\`\`\`bash
$ npm dist-tag rm mypackage beta
\`\`\``,
  request: {
    params: z.object({
      pkg: z.string(),
      tag: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            ok: z.boolean(),
            id: z.string(),
            rev: z.string(),
          }),
        },
      },
      description: 'Dist-tag deleted successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Cannot delete latest tag or invalid request',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Cannot modify dist-tags on proxied packages',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package or tag not found',
    },
  },
})

// =============================================================================
// Upstream Package Routes
// =============================================================================

// Upstream package manifest routes
export const getUpstreamPackageRoute = createRoute({
  method: 'get',
  path: '/{upstream}/{pkg}',
  tags: ['Packages'],
  summary: 'Get upstream package manifest',
  description:
    'Retrieve package manifest from upstream registry (e.g., npm, jsr)',
  request: {
    params: z.object({
      upstream: z.string().min(1).openapi({
        description: 'Upstream registry name (e.g., npm, jsr)',
      }),
      pkg: z.string().min(1).openapi({ description: 'Package name' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z
            .object({
              name: z.string(),
              'dist-tags': z.record(z.string()),
              versions: z.record(z.unknown()),
              time: z.record(z.string()),
            })
            .openapi({ description: 'Package manifest data' }),
        },
      },
      description: 'Package manifest retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found in upstream registry',
    },
  },
})

export const getUpstreamScopedPackageRoute = createRoute({
  method: 'get',
  path: '/{upstream}/{scope}/{pkg}',
  tags: ['Packages'],
  summary: 'Get upstream scoped package manifest',
  description:
    'Retrieve scoped package manifest from upstream registry',
  request: {
    params: z.object({
      upstream: z
        .string()
        .min(1)
        .openapi({ description: 'Upstream registry name' }),
      scope: z
        .string()
        .min(1)
        .openapi({ description: 'Package scope (e.g., @types)' }),
      pkg: z.string().min(1).openapi({ description: 'Package name' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            'dist-tags': z.record(z.string()),
            versions: z.record(z.unknown()),
            time: z.record(z.string()),
          }),
        },
      },
      description: 'Scoped package manifest retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Scoped package not found in upstream registry',
    },
  },
})

// Upstream package version routes
export const getUpstreamPackageVersionRoute = createRoute({
  method: 'get',
  path: '/{upstream}/{pkg}/{version}',
  tags: ['Packages'],
  summary: 'Get upstream package version manifest',
  description:
    'Retrieve specific version manifest from upstream registry',
  request: {
    params: z.object({
      upstream: z
        .string()
        .min(1)
        .openapi({ description: 'Upstream registry name' }),
      pkg: z.string().min(1).openapi({ description: 'Package name' }),
      version: z
        .string()
        .min(1)
        .openapi({ description: 'Package version' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            version: z.string(),
            dependencies: z.record(z.string()).optional(),
            peerDependencies: z.record(z.string()).optional(),
            optionalDependencies: z.record(z.string()).optional(),
            peerDependenciesMeta: z.record(z.string()).optional(),
            bin: z.record(z.string()).optional(),
            engines: z.record(z.string()).optional(),
            dist: z.object({
              tarball: z.string(),
            }),
          }),
        },
      },
      description: 'Package version manifest retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package version not found in upstream registry',
    },
  },
})

export const getUpstreamScopedPackageVersionRoute = createRoute({
  method: 'get',
  path: '/{upstream}/{scope}/{pkg}/{version}',
  tags: ['Packages'],
  summary: 'Get upstream scoped package version manifest',
  description:
    'Retrieve specific version manifest for scoped package from upstream registry',
  request: {
    params: z.object({
      upstream: z
        .string()
        .min(1)
        .openapi({ description: 'Upstream registry name' }),
      scope: z
        .string()
        .min(1)
        .openapi({ description: 'Package scope' }),
      pkg: z.string().min(1).openapi({ description: 'Package name' }),
      version: z
        .string()
        .min(1)
        .openapi({ description: 'Package version' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            version: z.string(),
            dependencies: z.record(z.string()).optional(),
            peerDependencies: z.record(z.string()).optional(),
            optionalDependencies: z.record(z.string()).optional(),
            peerDependenciesMeta: z.record(z.string()).optional(),
            bin: z.record(z.string()).optional(),
            engines: z.record(z.string()).optional(),
            dist: z.object({
              tarball: z.string(),
            }),
          }),
        },
      },
      description:
        'Scoped package version manifest retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description:
        'Scoped package version not found in upstream registry',
    },
  },
})

// Upstream package tarball routes
export const getUpstreamPackageTarballRoute = createRoute({
  method: 'get',
  path: '/{upstream}/{pkg}/-/{tarball}',
  tags: ['Packages'],
  summary: 'Download upstream package tarball',
  description: 'Download package tarball from upstream registry',
  request: {
    params: z.object({
      upstream: z
        .string()
        .min(1)
        .openapi({ description: 'Upstream registry name' }),
      pkg: z.string().min(1).openapi({ description: 'Package name' }),
      tarball: z
        .string()
        .min(1)
        .openapi({ description: 'Tarball filename' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/octet-stream': {
          schema: z.string().openapi({ format: 'binary' }),
        },
      },
      description: 'Package tarball downloaded successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package tarball not found in upstream registry',
    },
  },
})

export const getUpstreamScopedPackageTarballRoute = createRoute({
  method: 'get',
  path: '/{upstream}/{scope}/{pkg}/-/{tarball}',
  tags: ['Packages'],
  summary: 'Download upstream scoped package tarball',
  description:
    'Download scoped package tarball from upstream registry',
  request: {
    params: z.object({
      upstream: z
        .string()
        .min(1)
        .openapi({ description: 'Upstream registry name' }),
      scope: z
        .string()
        .min(1)
        .openapi({ description: 'Package scope' }),
      pkg: z.string().min(1).openapi({ description: 'Package name' }),
      tarball: z
        .string()
        .min(1)
        .openapi({ description: 'Tarball filename' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/octet-stream': {
          schema: z.string().openapi({ format: 'binary' }),
        },
      },
      description: 'Scoped package tarball downloaded successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description:
        'Scoped package tarball not found in upstream registry',
    },
  },
})

// Special upstream routes for URL-encoded scoped packages
export const getUpstreamEncodedScopedPackageRoute = createRoute({
  method: 'get',
  path: '/{upstream}/{scope%2f:pkg}',
  tags: ['Packages'],
  summary: 'Get upstream URL-encoded scoped package',
  description:
    'Retrieve scoped package manifest using URL-encoded scope format',
  request: {
    params: z.object({
      upstream: z
        .string()
        .min(1)
        .openapi({ description: 'Upstream registry name' }),
      'scope%2f:pkg': z.string().min(1).openapi({
        description:
          'URL-encoded scoped package name (e.g., @babel%2Fcore)',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            'dist-tags': z.record(z.string()),
            versions: z.record(z.unknown()),
            time: z.record(z.string()),
          }),
        },
      },
      description:
        'URL-encoded scoped package manifest retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description:
        'URL-encoded scoped package not found in upstream registry',
    },
  },
})

// Unified upstream route (handles both scoped packages and versions)
export const getUpstreamUnifiedRoute = createRoute({
  method: 'get',
  path: '/{upstream}/{param2}/{param3}',
  tags: ['Packages'],
  summary: 'Unified upstream route handler',
  description:
    'Handles both /upstream/@scope/package and /upstream/package/version patterns',
  request: {
    params: z.object({
      upstream: z
        .string()
        .min(1)
        .openapi({ description: 'Upstream registry name' }),
      param2: z
        .string()
        .min(1)
        .openapi({ description: 'Either package name or scope' }),
      param3: z
        .string()
        .min(1)
        .openapi({ description: 'Either version or package name' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.union([
            z.object({
              name: z.string(),
              'dist-tags': z.record(z.string()),
              versions: z.record(z.unknown()),
              time: z.record(z.string()),
            }),
            z.object({
              name: z.string(),
              version: z.string(),
              dependencies: z.record(z.string()).optional(),
              peerDependencies: z.record(z.string()).optional(),
              optionalDependencies: z.record(z.string()).optional(),
              peerDependenciesMeta: z.record(z.string()).optional(),
              bin: z.record(z.string()).optional(),
              engines: z.record(z.string()).optional(),
              dist: z.object({
                tarball: z.string(),
              }),
            }),
          ]),
        },
      },
      description:
        'Package manifest or version data retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Package not found in upstream registry',
    },
  },
})
