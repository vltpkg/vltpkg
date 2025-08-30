import {
  API_DOCS_ENABLED,
  DAEMON_ENABLED,
  DAEMON_URL,
  OPEN_API_CONFIG,
} from '../config.ts'
import { OpenAPIHono } from '@hono/zod-openapi'
import { requestId } from 'hono/request-id'
import { bearerAuth } from 'hono/bearer-auth'
import { except } from 'hono/combine'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { getApp } from './utils/spa.ts'
import { verifyToken } from './utils/auth.ts'
import { mountDatabase } from './utils/database.ts'
import { jsonResponseHandler } from './utils/response.ts'
import { requiresToken } from './utils/routes.ts'
import { getUsername, getUserProfile } from './routes/users.ts'
import { pingRoute } from './routes/ping.ts'
import { getDocs } from './routes/docs.ts'
import {
  getToken,
  putToken,
  postToken,
  deleteToken,
} from './routes/tokens.ts'
import {
  getPackageDistTags,
  putPackageDistTag,
  deletePackageDistTag,
  handlePackageRoute,
  publishPackage,
} from './routes/packages.ts'
import {
  listPackagesAccess,
  getPackageAccessStatus,
  setPackageAccessStatus,
  grantPackageAccess,
  revokePackageAccess,
} from './routes/access.ts'
import { searchPackages } from './routes/search.ts'
import {
  isValidUpstreamName,
  getUpstreamConfig,
  getDefaultUpstream,
  buildUpstreamUrl,
} from './utils/upstream.ts'
import { sessionMonitor } from './utils/tracing.ts'
import { createDatabaseOperations } from './db/client.ts'
import {
  handleStaticAssets,
  handleFavicon,
  handleRobots,
  handleManifest,
} from './routes/static.ts'
import type { Environment } from '../types.ts'
import type { Context } from 'hono'

// ---------------------------------------------------------
// App Initialization
// ("strict mode" is turned off to ensure that routes like
// `/hello` & `/hello/` are handled the same way - ref.
// https://hono.dev/docs/api/hono#strict-mode)
// ---------------------------------------------------------

const app = new OpenAPIHono<{
  Bindings: Environment
  Variables: {
    db: ReturnType<typeof createDatabaseOperations>
  }
}>({ strict: false })

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

app.use(trimTrailingSlash())
app.use('*', requestId())
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', jsonResponseHandler())
app.use('*', mountDatabase)
app.use('*', sessionMonitor)

// ---------------------------------------------------------
// Home
// (Single Page Application)
// ---------------------------------------------------------

app.get('/', async c => c.html(await getApp(c.env.ASSETS)))

// ---------------------------------------------------------
// Documentation
// ---------------------------------------------------------

if (API_DOCS_ENABLED) {
  app.doc('/-/api', OPEN_API_CONFIG)
  app.get('/-/docs', getDocs)
}

// ---------------------------------------------------------
// Health Check
// ---------------------------------------------------------

app.openapi(pingRoute, (c: Context) => c.json({}, 200))

// ---------------------------------------------------------
// Authorization Verification Middleware
// ---------------------------------------------------------

app.use('*', except(requiresToken, bearerAuth({ verifyToken })))

// ---------------------------------------------------------
// User Routes
// ---------------------------------------------------------

app.get('/-/whoami', getUsername)
app.get('/-/user', getUserProfile)

// ---------------------------------------------------------
// Daemon Project Routes - only local use
// ---------------------------------------------------------

if (DAEMON_ENABLED) {
  app.get('/dashboard.json', async (c: Context) => {
    const data = await fetch(`${DAEMON_URL}/dashboard.json`)
    const jsonData = (await data.json()) as Record<string, unknown>
    return c.json(jsonData)
  })

  app.get('/app-data.json', async (c: Context) => {
    const data = await fetch(`${DAEMON_URL}/app-data.json`)
    const jsonData = (await data.json()) as Record<string, unknown>
    return c.json(jsonData)
  })
}

// ---------------------------------------------------------
// Token Routes
// ---------------------------------------------------------

app.get('/-/tokens', getToken)
app.post('/-/tokens', postToken)
app.put('/-/tokens', putToken)
app.delete('/-/tokens/:token', deleteToken)

// ---------------------------------------------------------
// Dist-tag Routes
// ---------------------------------------------------------

// Unscoped packages
app.get('/-/package/:pkg/dist-tags', getPackageDistTags)
app.get('/-/package/:pkg/dist-tags/:tag', getPackageDistTags)
app.put('/-/package/:pkg/dist-tags/:tag', putPackageDistTag)
app.delete('/-/package/:pkg/dist-tags/:tag', deletePackageDistTag)

// Scoped packages (URL encoded)
app.get('/-/package/:scope%2f:pkg/dist-tags', getPackageDistTags)
app.get('/-/package/:scope%2f:pkg/dist-tags/:tag', getPackageDistTags)
app.put('/-/package/:scope%2f:pkg/dist-tags/:tag', putPackageDistTag)
app.delete(
  '/-/package/:scope%2f:pkg/dist-tags/:tag',
  deletePackageDistTag,
)

// ---------------------------------------------------------
// Access Control Routes
// ---------------------------------------------------------

app.get('/-/package/:pkg/access', getPackageAccessStatus)
app.post('/-/package/:pkg/access', setPackageAccessStatus)

app.get('/-/package/:scope%2f:pkg/access', getPackageAccessStatus)
app.post('/-/package/:scope%2f:pkg/access', setPackageAccessStatus)

app.get('/-/package/list', listPackagesAccess)

app.put('/-/package/:pkg/collaborators/:username', grantPackageAccess)
app.delete(
  '/-/package/:pkg/collaborators/:username',
  revokePackageAccess,
)

app.put(
  '/-/package/:scope%2f:pkg/collaborators/:username',
  grantPackageAccess,
)
app.delete(
  '/-/package/:scope%2f:pkg/collaborators/:username',
  revokePackageAccess,
)

// ---------------------------------------------------------
// Search Packages
// ---------------------------------------------------------

app.get('/-/search', searchPackages)

// ---------------------------------------------------------
// Handle Audit Requests
// ---------------------------------------------------------

app.post('/-/npm/audit', async (c: Context) => {
  return c.json({ error: 'Not yet implemented' }, 404)
})

// ---------------------------------------------------------
// Redirect Legacy NPM Routing
// (maximizes backwards compatibility)
// ---------------------------------------------------------

app.get('/-/v1/search', (c: Context) => c.redirect('/-/search', 308))
app.get('/-/npm/v1/user', (c: Context) => c.redirect('/-/user', 308))
app.get('/-/npm/v1/tokens', (c: Context) =>
  c.redirect('/-/tokens', 308),
)
app.post('/-/npm/v1/tokens', (c: Context) =>
  c.redirect('/-/tokens', 308),
)
app.put('/-/npm/v1/tokens', (c: Context) =>
  c.redirect('/-/tokens', 308),
)
app.delete('/-/npm/v1/tokens/token/:token', (c: Context) => {
  return c.redirect(`/-/tokens/${c.req.param('token')}`, 308)
})
app.post('/-/npm/v1/security/audits/quick', async (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// ---------------------------------------------------------
// Upstream Package Routes
// (must come before catch-all package routes)
// ---------------------------------------------------------

// Handle upstream package requests like /npm/lodash, /jsr/@std/fs
app.get('/:upstream/:pkg', async (c: Context) => {
  const upstream = c.req.param('upstream')

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
  return handlePackageRoute(c as any)
})

// Handle unencoded scoped package tarball requests like /npm/@types/node/-/node-18.0.0.tgz
// (Most specific route - 5 segments)
app.get('/:upstream/:scope/:pkg/-/:tarball', async (c: Context) => {
  const upstream = c.req.param('upstream')

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
  return handlePackageRoute(c as any)
})

// Handle unencoded scoped package versions like /npm/@types/node/18.0.0
app.get('/:upstream/:scope/:pkg/:version', async (c: Context) => {
  const upstream = c.req.param('upstream')

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
  return handlePackageRoute(c as any)
})

// Handle URL-encoded scoped packages like /npm/@babel%2Fcore
app.get('/:upstream/:scope%2f:pkg', async (c: Context) => {
  const upstream = c.req.param('upstream')

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
  return handlePackageRoute(c as any)
})

// Unified route handler for 3-segment paths: /npm/pkg/version OR /npm/@scope/package
app.get('/:upstream/:param2/:param3', async (c: Context) => {
  const upstream = c.req.param('upstream')

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
  return handlePackageRoute(c as any)
})

// Handle upstream tarball requests like /npm/lodash/-/lodash-4.17.21.tgz
app.get('/:upstream/:pkg/-/:tarball', async (c: Context) => {
  const upstream = c.req.param('upstream')

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
  return handlePackageRoute(c as any)
})

app.post(
  '/:upstream/-/npm/v1/security/advisories/bulk',
  async (c: Context) => {
    return c.redirect('/-/npm/audit', 308)
  },
)
app.post('/-/npm/v1/security/advisories/bulk', async (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// Handle package publishing
app.put('/:pkg', async (c: Context) => {
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
  const isValid = await verifyToken(token, c as any)
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
  return publishPackage(c as any)
})

// Handle local package versions like /my-package/1.0.0
app.get('/:pkg/:version', async (c: Context) => {
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
    const localPackage = await c.get('db').getPackage(pkg)
    if (localPackage) {
      // Package exists locally, handle it with the local package route handler
      return handlePackageRoute(c as any)
    }
  } catch (error) {
    console.error('Error checking local package version:', error)
    // Continue to upstream redirect on database error
  }

  // Package doesn't exist locally, redirect to default upstream
  const defaultUpstream = getDefaultUpstream()
  return c.redirect(`/${defaultUpstream}/${pkg}/${version}`, 302)
})

// Handle local package tarballs like /my-package/-/my-package-1.0.0.tgz
app.get('/:pkg/-/:tarball', async (c: Context) => {
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
    const localPackage = await c.get('db').getPackage(pkg)
    if (localPackage) {
      // Package exists locally, handle it with the local package route handler
      return handlePackageRoute(c as any)
    }
  } catch (error) {
    console.error('Error checking local package tarball:', error)
    // Continue to upstream redirect on database error
  }

  // Package doesn't exist locally, redirect to default upstream
  const defaultUpstream = getDefaultUpstream()
  const tarball = c.req.param('tarball')
  return c.redirect(`/${defaultUpstream}/${pkg}/-/${tarball}`, 302)
})

// Handle local packages (check local first, then redirect to upstream)
app.get('/:pkg', async (c: Context) => {
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
    const localPackage = await c.get('db').getPackage(pkg)
    if (localPackage) {
      // Package exists locally, handle it with the local package route handler
      return handlePackageRoute(c as any)
    }
  } catch (error) {
    console.error('Error checking local package:', error)
    // Continue to upstream redirect on database error
  }

  // Package doesn't exist locally, redirect to default upstream
  const defaultUpstream = getDefaultUpstream()
  return c.redirect(`/${defaultUpstream}/${pkg}`, 302)
})

// ---------------------------------------------------------
// Handle Static Assets
// ---------------------------------------------------------

app.get('/public/*', handleStaticAssets)
app.get('/favicon.ico', handleFavicon)
app.get('/robots.txt', handleRobots)
app.get('/manifest.json', handleManifest)
app.get('/*', handleStaticAssets)

// Queue handler for background cache refresh jobs
export async function queue(
  batch: import('../../types.ts').QueueBatch,
  env: any,
) {
  const db = createDatabaseOperations(env.DB)

  for (const message of batch.messages) {
    try {
      const { type, packageName, spec, upstream, options } =
        message.body

      if (type === 'package_refresh' && packageName) {
        // Handle package refresh - refetch from upstream and cache
        const upstreamConfig = getUpstreamConfig(upstream)
        if (upstreamConfig) {
          const upstreamUrl = buildUpstreamUrl(
            upstreamConfig,
            packageName,
          )
          const response = await fetch(upstreamUrl, {
            headers: { Accept: 'application/json' },
          })

          if (response.ok) {
            const upstreamData = (await response.json())

            // Cache the package metadata
            if (upstreamData['dist-tags']) {
              await db.upsertCachedPackage(
                packageName,
                upstreamData['dist-tags'],
                upstream,
                new Date().toISOString(),
              )
            }

            // Cache all versions
            if (upstreamData.versions) {
              const versionPromises = Object.entries(
                upstreamData.versions,
              ).map(async ([version, manifest]) => {
                try {
                  await db.upsertCachedVersion(
                    `${packageName}@${version}`,
                    manifest as any,
                    upstream,
                    (manifest as any)?.publishedAt ||
                      new Date().toISOString(),
                  )
                } catch (_error) {
                  // Silently fail individual versions
                }
              })
              await Promise.allSettled(versionPromises)
            }
          }
        }
      } else if (type === 'version_refresh' && spec) {
        // Handle version refresh - similar logic for individual versions
        // (This would be implemented if needed)
      }

      // Acknowledge successful processing
      message.ack()
    } catch (error) {
      // Retry failed messages
      console.error('Queue processing error:', error)
      message.retry()
    }
  }
}

export default app
