import { EXPOSE_DOCS, API_DOCS, VERSION } from '../config.ts'
import * as Sentry from "@sentry/cloudflare"
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requestId } from 'hono/request-id'
import { bearerAuth } from 'hono/bearer-auth'
import { except } from 'hono/combine'
import { apiReference } from '@scalar/hono-api-reference'
import { secureHeaders } from 'hono/secure-headers'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { getApp } from './utils/spa.ts'
import { verifyToken } from './utils/auth.ts'
import { mountDatabase } from './utils/database.ts'
import { jsonResponseHandler } from './utils/response.ts'
import { requiresToken, catchAll, notFound, isOK } from './utils/routes.ts'
import { handleStaticAssets } from './routes/static.ts'
import { getUsername, getUserProfile } from './routes/users.ts'
import { getToken, putToken, postToken, deleteToken } from './routes/tokens.ts'
import {
  getPackageDistTags,
  putPackageDistTag,
  deletePackageDistTag,
  handlePackageRoute,
  getPackagePackument,
  getPackageManifest,
  getPackageTarball,
} from './routes/packages.ts'
import {
  listPackagesAccess,
  getPackageAccessStatus,
  setPackageAccessStatus,
  grantPackageAccess,
  revokePackageAccess,
} from './routes/access.ts'
import { searchPackages } from './routes/search.ts'
import { handleLogin, handleCallback, requiresAuth } from './routes/auth.ts'
import { sessionMonitor } from './utils/tracing.ts'
import { getUpstreamConfig, buildUpstreamUrl, isValidUpstreamName, getDefaultUpstream } from './utils/upstream.ts'
import { createDatabaseOperations } from './db/client.ts'
import type { Environment } from '../types.ts'

// ---------------------------------------------------------
// App Initialization
// ("strict mode" is turned off to ensure that routes like
// `/hello` & `/hello/` are handled the same way - ref.
// https://hono.dev/docs/api/hono#strict-mode)
// ---------------------------------------------------------

const app = new Hono<{ Bindings: Environment }>({ strict: false })

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

app.use(trimTrailingSlash())
app.use('*', requestId())
app.use('*', jsonResponseHandler() as any)
app.use('*', secureHeaders())
app.use('*', mountDatabase as any)
app.use('*', sessionMonitor as any)

// ---------------------------------------------------------
// Home
// (single page application)
// ---------------------------------------------------------

app.get('/', async (c) => c.html(await getApp()))

// ---------------------------------------------------------
// API Documentation
// ---------------------------------------------------------

if (EXPOSE_DOCS) {
  app.get('/docs', apiReference(API_DOCS as any))
}

// ---------------------------------------------------------
// Health Check
// ---------------------------------------------------------

app.get('/-/ping', isOK as any)
app.get('/health', isOK as any)

// ---------------------------------------------------------
// Search Routes
// ---------------------------------------------------------

app.get('/-/search', searchPackages as any)

// ---------------------------------------------------------
// Authentication Routes
// ---------------------------------------------------------

app.get('/-/auth/callback', handleCallback as any)
app.get('/-/auth/login', handleLogin as any)
app.get('/-/auth/user', requiresAuth as any, isOK as any)

// ---------------------------------------------------------
// Authorization Verification Middleware
// ---------------------------------------------------------

app.use('*', except(requiresToken as any, bearerAuth({ verifyToken }) as any))

// ---------------------------------------------------------
// User Routes
// ---------------------------------------------------------

app.get('/-/whoami', getUsername as any)
app.get('/-/user', getUserProfile as any)

// Handle npm login/adduser (for publishing) - temporary development endpoint
app.put('/-/user/org.couchdb.user:*', async (c: any) => {
  console.log(`[AUTH] Login attempt`)

  try {
    const body = await c.req.json()
    console.log(`[AUTH] Login request for user: ${body.name}`)

    // For development, accept any login and return a token
    const token = 'npm_' + Math.random().toString(36).substr(2, 30)

    return c.json({
      ok: true,
      id: `org.couchdb.user:${body.name || 'test-user'}`,
      rev: '1-' + Math.random().toString(36).substr(2, 10),
      token: token
    })
  } catch (err) {
    console.error(`[AUTH ERROR] ${(err as Error).message}`)
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// ---------------------------------------------------------
// Project Routes
// TODO: Remove extranerous routes once GUI updates
// ---------------------------------------------------------

app.get(['/dashboard.json', '/local/dashboard.json', '/-/projects'], async (c: any) => {
  const data = await fetch(`http://localhost:${process.env.DAEMON_PORT || 3000}/dashboard.json`)
  return c.json(await data.json())
})
app.get(['/app-data.json', '/local/app-data.json', '/-/info'], (c: any) => c.json({
  buildVersion: VERSION,
}))

// Capture specific extraneous local routes & redirect to root
// Note: This must be more specific to not interfere with package routes
app.get('/local/dashboard.json', (c: any) => c.redirect('/', 308))
app.get('/local/app-data.json', (c: any) => c.redirect('/', 308))

// ---------------------------------------------------------
// Token Routes
// ---------------------------------------------------------

app.get('/-/tokens', getToken as any)
app.post('/-/tokens', postToken as any)
app.put('/-/tokens', putToken as any)
app.delete('/-/tokens/:token', deleteToken as any)

// ---------------------------------------------------------
// Dist-tag Routes
// ---------------------------------------------------------

// Unscoped packages
app.get('/-/package/:pkg/dist-tags', getPackageDistTags as any)
app.get('/-/package/:pkg/dist-tags/:tag', getPackageDistTags as any)
app.put('/-/package/:pkg/dist-tags/:tag', putPackageDistTag as any)
app.delete('/-/package/:pkg/dist-tags/:tag', deletePackageDistTag as any)

// Scoped packages
app.get('/-/package/:scope%2f:pkg/dist-tags', getPackageDistTags as any)
app.get('/-/package/:scope%2f:pkg/dist-tags/:tag', getPackageDistTags as any)
app.put('/-/package/:scope%2f:pkg/dist-tags/:tag', putPackageDistTag as any)
app.delete('/-/package/:scope%2f:pkg/dist-tags/:tag', deletePackageDistTag as any)

// ---------------------------------------------------------
// Package Access Management Routes
// ---------------------------------------------------------

app.get('/-/package/:pkg/access', getPackageAccessStatus as any)
app.put('/-/package/:pkg/access', setPackageAccessStatus as any)
app.get('/-/package/:scope%2f:pkg/access', getPackageAccessStatus as any)
app.put('/-/package/:scope%2f:pkg/access', setPackageAccessStatus as any)
app.get('/-/package/list', listPackagesAccess as any)
app.put('/-/package/:pkg/collaborators/:username', grantPackageAccess as any)
app.delete('/-/package/:pkg/collaborators/:username', revokePackageAccess as any)
app.put('/-/package/:scope%2f:pkg/collaborators/:username', grantPackageAccess as any)
app.delete('/-/package/:scope%2f:pkg/collaborators/:username', revokePackageAccess as any)

// ---------------------------------------------------------
// Security/Audit Endpoints
// (npm audit, npm audit fix, etc.)
// ---------------------------------------------------------

// Handle npm audit bulk endpoint (used by npm audit)
app.post('/-/npm/v1/security/advisories/bulk', (c: any) => {
  console.log(`[AUDIT] Rejecting audit bulk request - security auditing not supported`)
  return c.json({
    error: 'Security auditing is not supported by this registry',
    code: 'E_AUDIT_NOT_SUPPORTED',
    detail: 'This private registry does not provide security vulnerability data. Please use `npm audit --registry=https://registry.npmjs.org` to audit against the public npm registry.'
  }, 501)
})

// Handle npm audit quick endpoint
app.post('/-/npm/v1/security/audits/quick', (c: any) => {
  console.log(`[AUDIT] Rejecting audit quick request - security auditing not supported`)
  return c.json({
    error: 'Security auditing is not supported by this registry',
    code: 'E_AUDIT_NOT_SUPPORTED',
    detail: 'This private registry does not provide security vulnerability data. Please use `npm audit --registry=https://registry.npmjs.org` to audit against the public npm registry.'
  }, 501)
})

// Handle npm ping (health check) - this one we can support
app.get('/-/npm/v1/ping', (c: any) => {
  return c.json({}, 200)
})

// Handle npm fund endpoint (used by npm fund)
app.get('/-/npm/v1/funds', (c: any) => {
  console.log(`[FUND] Rejecting fund request - funding data not supported`)
  return c.json({
    error: 'Funding data is not supported by this registry',
    code: 'E_FUND_NOT_SUPPORTED',
    detail: 'This private registry does not provide package funding information.'
  }, 501)
})

// Handle vulnerability database endpoints
app.get('/-/npm/v1/security/advisories', (c: any) => {
  console.log(`[AUDIT] Rejecting advisories request - security auditing not supported`)
  return c.json({
    error: 'Security advisory data is not supported by this registry',
    code: 'E_ADVISORY_NOT_SUPPORTED',
    detail: 'This private registry does not provide security vulnerability data.'
  }, 501)
})

// Handle package metadata bulk endpoints (used by some npm operations)
app.post('/-/npm/v1/packages/bulk', (c: any) => {
  console.log(`[BULK] Rejecting bulk package metadata request - not supported`)
  return c.json({
    error: 'Bulk package metadata operations are not supported by this registry',
    code: 'E_BULK_NOT_SUPPORTED',
    detail: 'This private registry does not support bulk metadata operations.'
  }, 501)
})

// Handle other security/audit endpoints (must come before general npm v1 catch-all)
app.all('/-/npm/v1/security/*', (c: any) => {
  console.log(`[AUDIT] Rejecting security request to ${c.req.path} - not supported`)
  return c.json({
    error: 'Security endpoints are not supported by this registry',
    code: 'E_SECURITY_NOT_SUPPORTED',
    detail: 'This private registry does not provide security vulnerability data. Please use the public npm registry for security-related operations.'
  }, 501)
})

// Handle other npm v1 endpoints that we don't support (catch-all for remaining npm v1 routes)
app.all('/-/npm/v1/*', (c: any) => {
  console.log(`[NPM_V1] Rejecting unsupported npm v1 request to ${c.req.path}`)
  return c.json({
    error: 'This npm v1 endpoint is not supported by this registry',
    code: 'E_ENDPOINT_NOT_SUPPORTED',
    detail: `The endpoint ${c.req.path} is not implemented by this private registry.`
  }, 501)
})

// ---------------------------------------------------------
// Redirect Legacy NPM Routing Warts
// (maximizes backwards compatibility)
// ---------------------------------------------------------

app.get('/-/v1/search', (c: any) => c.redirect('/-/search', 308))
app.get('/-/npm/v1/user', (c: any) => c.redirect('/-/user', 308))
app.get('/-/npm/v1/tokens', (c: any) => c.redirect('/-/tokens', 308))
app.post('/-/npm/v1/tokens', (c: any) => c.redirect('/-/tokens', 308))
app.put('/-/npm/v1/tokens', (c: any) => c.redirect('/-/tokens', 308))
app.delete('/-/npm/v1/tokens/token/:token', (c: any) => {
  return c.redirect(`/-/tokens/${c.req.param('token')}`, 308)
})

// ---------------------------------------------------------
// Static Asset Routes
// (must come before wildcard package routes)
// ---------------------------------------------------------

// Note: Wrangler serves files from src/assets/ at root level, now consolidated under /public/ prefix
app.get('/favicon.ico', notFound as any)
app.get('/robots.txt', notFound as any)
// app.get('/static/*', notFound)

// ---------------------------------------------------------
// Upstream Package Routes
// (must come before catch-all package routes)
// ---------------------------------------------------------

// Handle upstream package requests like /npm/lodash, /jsr/@std/fs
app.get('/:upstream/:pkg', async (c: any) => {
  const upstream = c.req.param('upstream')
  const pkg = c.req.param('pkg')

  console.log(`[UPSTREAM ROUTE] Called with upstream=${upstream}, pkg=${pkg}`)

  // Validate upstream name
  if (!isValidUpstreamName(upstream)) {
    console.log(`[UPSTREAM ROUTE] Invalid upstream name: ${upstream}`)
    return c.json({ error: `Invalid or reserved upstream name: ${upstream}` }, 400)
  }

  // Check if upstream is configured
  const upstreamConfig = getUpstreamConfig(upstream)
  if (!upstreamConfig) {
    return c.json({ error: `Unknown upstream: ${upstream}` }, 404)
  }

  console.log(`[UPSTREAM] Package request for ${pkg} from ${upstream}`)

      // Set upstream context and forward to package handler
  c.upstream = upstream

  // Create a mock parameter function that returns the package name as both scope and pkg
  const originalParam = c.req.param
  c.req.param = (key: string) => {
    if (key === 'scope') return pkg
    if (key === 'pkg') return pkg  // Return the package name for 'pkg' parameter too
    return originalParam.call(c.req, key)
  }

  return getPackagePackument(c)
})

// Handle scoped packages like /npm/@babel/core
app.get('/:upstream/:scope%2f:pkg', async (c: any) => {
  const upstream = c.req.param('upstream')
  const scope = c.req.param('scope')
  const pkg = c.req.param('pkg')

  // Validate upstream name
  if (!isValidUpstreamName(upstream)) {
    return c.json({ error: `Invalid or reserved upstream name: ${upstream}` }, 400)
  }

  // Check if upstream is configured
  const upstreamConfig = getUpstreamConfig(upstream)
  if (!upstreamConfig) {
    return c.json({ error: `Unknown upstream: ${upstream}` }, 404)
  }

  const fullPackageName = `@${scope}/${pkg}`
  console.log(`[UPSTREAM] Scoped package request for ${fullPackageName} from ${upstream}`)

  // Set upstream context
  c.upstream = upstream

  // Create a mock parameter function that returns the full package name as both scope and pkg
  const originalParam = c.req.param
  c.req.param = (key: string) => {
    if (key === 'scope') return fullPackageName
    if (key === 'pkg') return fullPackageName  // Return the full package name for 'pkg' parameter too
    return originalParam.call(c.req, key)
  }

  return getPackagePackument(c)
})

// Handle upstream version requests like /npm/lodash/4.17.21
app.get('/:upstream/:pkg/:version', async (c: any) => {
  const upstream = c.req.param('upstream')
  const pkg = c.req.param('pkg')
  const version = c.req.param('version')

  // Validate upstream name
  if (!isValidUpstreamName(upstream)) {
    return c.json({ error: `Invalid or reserved upstream name: ${upstream}` }, 400)
  }

  // Check if upstream is configured
  const upstreamConfig = getUpstreamConfig(upstream)
  if (!upstreamConfig) {
    return c.json({ error: `Unknown upstream: ${upstream}` }, 404)
  }

  console.log(`[UPSTREAM] Version request for ${pkg}@${version} from ${upstream}`)

  // Set upstream context
  c.upstream = upstream

  // Create a mock parameter function
  const originalParam = c.req.param
  c.req.param = (key: string) => {
    if (key === 'scope') return pkg
    if (key === 'pkg') return pkg
    if (key === 'version') return version
    return originalParam.call(c.req, key)
  }

  return getPackageManifest(c)
})

// Handle upstream scoped package tarball requests like /npm/@scope/package/-/package-1.2.3.tgz
app.get('/:upstream/:scope/:pkg/-/:tarball', async (c: any) => {
  const upstream = c.req.param('upstream')
  const scope = c.req.param('scope')
  const pkg = c.req.param('pkg')
  const tarball = c.req.param('tarball')

  // Validate upstream name
  if (!isValidUpstreamName(upstream)) {
    return c.json({ error: `Invalid or reserved upstream name: ${upstream}` }, 400)
  }

  // Check if upstream is configured
  const upstreamConfig = getUpstreamConfig(upstream)
  if (!upstreamConfig) {
    return c.json({ error: `Unknown upstream: ${upstream}` }, 404)
  }

  console.log(`[UPSTREAM] Scoped tarball request for ${scope}/${pkg}/-/${tarball} from ${upstream}`)

  // Set upstream context
  c.upstream = upstream

  // Create a mock parameter function for scoped packages
  const originalParam = c.req.param
  c.req.param = (key: string) => {
    if (key === 'scope') return scope
    if (key === 'pkg') return pkg
    if (key === 'tarball') return tarball
    return originalParam.call(c.req, key)
  }

  return getPackageTarball(c)
})

// Handle upstream tarball requests like /npm/lodash/-/lodash-4.17.21.tgz
app.get('/:upstream/:pkg/-/:tarball', async (c: any) => {
  const upstream = c.req.param('upstream')
  const pkg = c.req.param('pkg')
  const tarball = c.req.param('tarball')

  // Validate upstream name
  if (!isValidUpstreamName(upstream)) {
    return c.json({ error: `Invalid or reserved upstream name: ${upstream}` }, 400)
  }

  // Check if upstream is configured
  const upstreamConfig = getUpstreamConfig(upstream)
  if (!upstreamConfig) {
    return c.json({ error: `Unknown upstream: ${upstream}` }, 404)
  }

  console.log(`[UPSTREAM] Tarball request for ${pkg}/-/${tarball} from ${upstream}`)

  // Set upstream context
  c.upstream = upstream

  // Create a mock parameter function
  const originalParam = c.req.param
  c.req.param = (key: string) => {
    if (key === 'scope') return pkg  // For unscoped packages, scope is the package name
    if (key === 'pkg') return undefined  // For unscoped packages, pkg parameter should be undefined
    if (key === 'tarball') return tarball
    return originalParam.call(c.req, key)
  }

  return getPackageTarball(c)
})

// Handle security audit endpoints
app.post('/:upstream/-/npm/v1/security/advisories/bulk', async (c: any) => {
  const upstream = c.req.param('upstream')

  console.log(`[AUDIT] Security audit request for upstream: ${upstream}`)

  // Return empty audit results - no vulnerabilities found
  // This satisfies npm's security audit without requiring upstream forwarding
  return c.json({})
})

// Handle security audit endpoints without upstream (fall back to default)
app.post('/-/npm/v1/security/advisories/bulk', async (c: any) => {
  console.log(`[AUDIT] Security audit request (no upstream specified)`)

  // Return empty audit results - no vulnerabilities found
  return c.json({})
})

// Handle package publishing
app.put('/:pkg', async (c: any) => {
  const pkg = decodeURIComponent(c.req.param('pkg'))
  const authHeader = c.req.header('authorization') || c.req.header('Authorization')

  console.log(`[PUBLISH] Publishing package: ${pkg}`)
  console.log(`[PUBLISH] Auth header: ${authHeader ? 'provided' : 'missing'}`)

  // Check for authentication
  if (!authHeader) {
    return c.json({
      error: 'Authentication required',
      reason: 'You must be logged in to publish packages. Run "npm adduser" first.'
    }, 401)
  }

  try {
    const body = await c.req.json()
    console.log(`[PUBLISH] Package data received for ${pkg}, versions: ${Object.keys(body.versions || {}).length}`)

    // For development, just return success
    return c.json({
      ok: true,
      id: pkg,
      rev: '1-' + Math.random().toString(36).substr(2, 10)
    })
  } catch (err) {
    console.error(`[PUBLISH ERROR] ${(err as Error).message}`)
    return c.json({ error: 'Invalid package data' }, 400)
  }
})

// Redirect root-level packages to default upstream (for backward compatibility)
app.get('/:pkg', async (c: any) => {
  const pkg = decodeURIComponent(c.req.param('pkg'))

  // Skip if this looks like a static asset or internal route
  if (pkg.includes('.') || pkg.startsWith('-') || pkg.startsWith('_')) {
    return c.next()
  }

  const defaultUpstream = getDefaultUpstream()
  console.log(`[REDIRECT] Redirecting ${pkg} to default upstream: ${defaultUpstream}`)

  return c.redirect(`/${defaultUpstream}/${pkg}`, 302)
})

// ---------------------------------------------------------
// Package Routes
// ---------------------------------------------------------

app.get('/*', handleStaticAssets as any)
app.put('/*', handlePackageRoute as any)
app.post('/*', handlePackageRoute as any)
app.delete('/*', handlePackageRoute as any)

// ---------------------------------------------------------
// Catch-All-The-Things
// ---------------------------------------------------------

// app.all('*', catchAll)

// ---------------------------------------------------------
// Error Handling
// ---------------------------------------------------------

app.onError((err, c) => {
  Sentry.captureException(err);
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: 'Internal server error' }, 500);
})

// ---------------------------------------------------------
// Wrap with Sentry
// ---------------------------------------------------------

export default Sentry.withSentry(
  (env: Environment) => {
    const { id: versionId } = env.CF_VERSION_METADATA
    return {
      dsn: env.SENTRY.DSN,
      release: versionId,
      tracesSampleRate: 1.0,
      _experiments: { enableLogs: true },
    };
  },
  app
)

/**
 * Queue consumer for background cache refresh jobs
 */
export async function queue(batch: any, env: Environment, ctx: any) {
  console.log(`[QUEUE] Processing batch of ${batch.messages.length} messages`)

  // Create database operations
  const db = createDatabaseOperations(env.DB)

  for (const message of batch.messages) {
    try {
      const { type, packageName, spec, upstream, options } = message.body
      console.log(`[QUEUE] Processing ${type} for ${packageName || spec}`)

      if (type === 'package_refresh') {
        await refreshPackageFromQueue(packageName, upstream, options, env, db, ctx)
      } else if (type === 'version_refresh') {
        await refreshVersionFromQueue(spec, upstream, options, env, db, ctx)
      } else {
        console.error(`[QUEUE] Unknown message type: ${type}`)
      }

      // Acknowledge successful processing
      message.ack()

    } catch (error) {
      console.error(`[QUEUE ERROR] Failed to process message: ${(error as Error).message}`)
      // Don't ack failed messages so they can be retried
      message.retry()
    }
  }
}

/**
 * Refresh package data from upstream in response to queue message
 */
async function refreshPackageFromQueue(packageName: string, upstream: string, options: any, env: Environment, db: any, ctx: any) {
  try {
    console.log(`[QUEUE] Refreshing package data for: ${packageName} from ${upstream}`)

    // Build upstream URL
    const upstreamConfig = getUpstreamConfig(upstream)
    if (!upstreamConfig) {
      throw new Error(`Unknown upstream: ${upstream}`)
    }

    // Fetch fresh data from upstream
    const upstreamUrl = buildUpstreamUrl(upstreamConfig, packageName)

    const response = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'vlt-serverless-registry'
      }
    })

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`)
    }

    const data = await response.json()

    // Store updated data
    await db.upsertCachedPackage(
      packageName,
      data['dist-tags'] || {},
      upstream,
      data.time?.modified || new Date().toISOString()
    )

    console.log(`[QUEUE] Successfully refreshed package: ${packageName}`)

  } catch (error) {
    console.error(`[QUEUE ERROR] Failed to refresh package ${packageName}: ${(error as Error).message}`)
    throw error
  }
}

/**
 * Refresh version data from upstream in response to queue message
 */
async function refreshVersionFromQueue(spec: string, upstream: string, options: any, env: Environment, db: any, ctx: any) {
  try {
    console.log(`[QUEUE] Refreshing version data for: ${spec} from ${upstream}`)

    // Parse spec to get package name and version
    const [packageName, version] = spec.split('@')
    if (!packageName || !version) {
      throw new Error(`Invalid spec format: ${spec}`)
    }

    // Build upstream URL
    const upstreamConfig = getUpstreamConfig(upstream)
    if (!upstreamConfig) {
      throw new Error(`Unknown upstream: ${upstream}`)
    }

    // Fetch fresh data from upstream
    const upstreamUrl = buildUpstreamUrl(upstreamConfig, packageName, version)

    const response = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'vlt-serverless-registry'
      }
    })

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`)
    }

    const manifest = await response.json()

    // Store updated manifest
    await db.upsertCachedVersion(
      spec,
      manifest,
      upstream,
      manifest.time || new Date().toISOString()
    )

    console.log(`[QUEUE] Successfully refreshed version: ${spec}`)

  } catch (error) {
    console.error(`[QUEUE ERROR] Failed to refresh version ${spec}: ${(error as Error).message}`)
    throw error
  }
}
