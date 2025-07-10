import { URL, OPEN_API_DOCS, SCALAR_API_DOCS, DAEMON_URL, DAEMON_ENABLED } from '../config.ts'
import { Hono } from 'hono'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import { HTTPException } from 'hono/http-exception'
import { requestId } from 'hono/request-id'
import { bearerAuth } from 'hono/bearer-auth'
import { except } from 'hono/combine'
import { logger } from 'hono/logger'
import { Scalar } from '@scalar/hono-api-reference'
import { secureHeaders } from 'hono/secure-headers'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { getApp } from './utils/spa.ts'
import { verifyToken } from './utils/auth.ts'
import { mountDatabase } from './utils/database.ts'
import { jsonResponseHandler } from './utils/response.ts'
import { requiresToken, isOK } from './utils/routes.ts'
import { getUsername, getUserProfile } from './routes/users.ts'
import { pingRoute } from './routes/ping.ts'
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
  handleLogin,
  handleCallback,
  requiresAuth,
} from './routes/auth.ts'
import { sessionMonitor } from './utils/tracing.ts'
import {
  getUpstreamConfig,
  buildUpstreamUrl,
  isValidUpstreamName,
  getDefaultUpstream,
} from './utils/upstream.ts'
import { createDatabaseOperations } from './db/client.ts'
import { 
  handleStaticAssets, 
  handleFavicon, 
  handleRobots, 
  handleManifest 
} from './routes/static.ts'
import type { Environment, HonoContext } from '../types.ts'
import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

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
app.use('*', jsonResponseHandler())
app.use('*', secureHeaders())
app.use('*', mountDatabase)
app.use('*', sessionMonitor)

const MinimalJsonHeaderSchema = z.object({
  Accept: z.enum(['application/json', 'application/vnd.npm.install-v1+json']).optional(),
})

// ---------------------------------------------------------
// API Documentation
// ---------------------------------------------------------

app.doc('/-/api', OPEN_API_DOCS)
app.get('/-/docs', Scalar(async () => {
  const api = await fetch(`${URL}/-/api`)
  const result = await api.json() as OpenAPIObject
  let options = structuredClone(SCALAR_API_DOCS)
  options.spec.content = { ...options.spec.content, ...result }
  return options
}))

// // ---------------------------------------------------------
// // Home
// // (single page application)
// // ---------------------------------------------------------

// app.get('/', async c => c.html(await getApp()))

// ---------------------------------------------------------
// Health Check
// ---------------------------------------------------------

app.openapi(pingRoute, isOK)
app.get('/health', (c: Context) => c.redirect('/-/ping', 308))

// // ---------------------------------------------------------
// // Search Routes
// // ---------------------------------------------------------

// app.get('/-/search', searchPackages)

// // ---------------------------------------------------------
// // Authentication Routes
// // ---------------------------------------------------------

// app.get('/-/auth/callback', handleCallback)
// app.get('/-/auth/login', handleLogin)
// app.get('/-/auth/user', requiresAuth, isOK)

// // ---------------------------------------------------------
// // Authorization Verification Middleware
// // ---------------------------------------------------------

// app.use('*', except(requiresToken, bearerAuth({ verifyToken })))

// // ---------------------------------------------------------
// // User Routes
// // ---------------------------------------------------------

// app.get('/-/whoami', getUsername)
// app.get('/-/user', getUserProfile)

// // ---------------------------------------------------------
// // Daemon Project Routes - only local use
// // ---------------------------------------------------------

// if (DAEMON_ENABLED) {
//   app.get('/dashboard.json', async (c: Context) => {
//     const data = await fetch(`${DAEMON_URL}/dashboard.json`)
//     return c.json(await data.json())
//   })

//   app.get('/app-data.json', async (c: Context) => {
//     const data = await fetch(`${DAEMON_URL}/app-data.json`)
//     return c.json(await data.json())
//   })
// }

// // ---------------------------------------------------------
// // Token Routes
// // ---------------------------------------------------------

// app.get('/-/tokens', getToken)
// app.post('/-/tokens', postToken)
// app.put('/-/tokens', putToken)
// app.delete('/-/tokens/:token', deleteToken)

// // ---------------------------------------------------------
// // Dist-tag Routes
// // ---------------------------------------------------------

// // Unscoped packages
// app.get('/-/package/:pkg/dist-tags', getPackageDistTags)
// app.get('/-/package/:pkg/dist-tags/:tag', getPackageDistTags)
// app.put('/-/package/:pkg/dist-tags/:tag', putPackageDistTag)
// app.delete('/-/package/:pkg/dist-tags/:tag', deletePackageDistTag)

// // Scoped packages (URL encoded)
// app.get('/-/package/:scope%2f:pkg/dist-tags', getPackageDistTags)
// app.get('/-/package/:scope%2f:pkg/dist-tags/:tag', getPackageDistTags)
// app.put('/-/package/:scope%2f:pkg/dist-tags/:tag', putPackageDistTag)
// app.delete(
//   '/-/package/:scope%2f:pkg/dist-tags/:tag',
//   deletePackageDistTag,
// )

// // ---------------------------------------------------------
// // Access Control Routes
// // ---------------------------------------------------------

// app.get('/-/package/:pkg/access', getPackageAccessStatus)
// app.post('/-/package/:pkg/access', setPackageAccessStatus)

// app.get('/-/package/:scope%2f:pkg/access', getPackageAccessStatus)
// app.post('/-/package/:scope%2f:pkg/access', setPackageAccessStatus)

// app.get('/-/package/list', listPackagesAccess)

// app.put('/-/package/:pkg/collaborators/:username', grantPackageAccess)
// app.delete('/-/package/:pkg/collaborators/:username', revokePackageAccess)

// app.put('/-/package/:scope%2f:pkg/collaborators/:username', grantPackageAccess)
// app.delete('/-/package/:scope%2f:pkg/collaborators/:username', revokePackageAccess)

// // ---------------------------------------------------------
// // Handle Audit Requests
// // ---------------------------------------------------------

// app.post('/-/npm/audit', async (c: Context) => {
//   return c.json({ error: 'Not yet implemented' }, 404)
// })

// // ---------------------------------------------------------
// // Redirect Legacy NPM Routing Warts
// // (maximizes backwards compatibility)
// // ---------------------------------------------------------

// app.get('/-/v1/search', (c: Context) => c.redirect('/-/search', 308))
// app.get('/-/npm/v1/user', (c: Context) => c.redirect('/-/user', 308))
// app.get('/-/npm/v1/tokens', (c: Context) => c.redirect('/-/tokens', 308))
// app.post('/-/npm/v1/tokens', (c: Context) => c.redirect('/-/tokens', 308))
// app.put('/-/npm/v1/tokens', (c: Context) => c.redirect('/-/tokens', 308))
// app.delete('/-/npm/v1/tokens/token/:token', (c: Context) => {
//   return c.redirect(`/-/tokens/${c.req.param('token')}`, 308)
// })
// app.post('/-/npm/v1/security/audits/quick', async (c: Context) => {
//   return c.redirect('/-/npm/audit', 308)
// })

// // ---------------------------------------------------------
// // Handle Static Assets
// // ---------------------------------------------------------

// app.get('/public/*', handleStaticAssets)
// app.get('/favicon.ico', handleFavicon)
// app.get('/robots.txt', handleRobots)
// app.get('/manifest.json', handleManifest)
// app.get('/*', handleStaticAssets)

// // ---------------------------------------------------------
// // Package Routes (Catch-all for packages)
// // ---------------------------------------------------------

// app.get('/*', async (c: Context<{ Bindings: Environment }>) => {
//   const path = c.req.path

//   // Check if this is a hash-based route (starts with /*)
//   if (path.startsWith('/*/')) {
//     return c.json(
//       { error: 'Hash-based package lookup not yet implemented' },
//       501,
//     )
//   }

//   // Extract path segments
//   const pathSegments = path.split('/').filter(Boolean)

//   // Check if the first segment is a reserved route name
//   const potentialUpstream = pathSegments[0]
//   if (!isValidUpstreamName(potentialUpstream)) {
//     return c.json(
//       {
//         error: `Route '${potentialUpstream}' is reserved and cannot be used as an upstream`,
//       },
//       400,
//     )
//   }

//   // Check if first segment is a valid upstream name
//   if (potentialUpstream && getUpstreamConfig(potentialUpstream)) {
//     // This is an upstream route, handle it
//     c.set('upstream', potentialUpstream)
//     return handlePackageRoute(c as HonoContext)
//   }

//   // No upstream specified, redirect to default upstream
//   const defaultUpstream = getDefaultUpstream()
//   const redirectPath = `/${defaultUpstream}${path}`

//   return c.redirect(redirectPath, 302)
// })

// // ---------------------------------------------------------
// // Error Handling
// // ---------------------------------------------------------

// app.onError((err, c) => {
//   if (err instanceof HTTPException) {
//     return err.getResponse()
//   }

//   // Sentry error reporting (if configured)
//   const sentryDsn = c.env.SENTRY_DSN as string | undefined
//   if (sentryDsn) {
//     try {
//       // Note: Sentry.init would be called here if properly imported
//       const _sentryConfig = {
//         dsn: sentryDsn,
//         environment: (c.env.ENVIRONMENT as string) || 'development',
//       }
//     } catch (_initError) {
//       // Sentry initialization failed, continue without it
//     }
//   }

//   // Hono middleware logs error information
//   if (c.env.CACHE_REFRESH_QUEUE) {
//     // Handle queue-specific errors
//   }

//   // Create database operations if needed
//   if (c.env.D1_DATABASE) {
//     const _db = createDatabaseOperations(c.env.D1_DATABASE)
//     if (c.env.CACHE_REFRESH_QUEUE) {
//       const errorWithBody = err as { body?: unknown }
//       const _body = errorWithBody.body
//       // Hono middleware logs queue processing error
//     }
//   }

//   // Handle different error types
//   const errorWithCode = err as { code?: string }
//   if (errorWithCode.code === 'ECONNREFUSED') {
//     return c.json({ error: 'Service temporarily unavailable' }, 503)
//   }

//   if (errorWithCode.code === 'ETIMEDOUT') {
//     return c.json({ error: 'Request timeout' }, 408)
//   }

//   const errorWithMessage = err as { message?: string }
//   if (errorWithMessage.message?.includes('Package not found')) {
//     return c.json({ error: 'Package not found' }, 404)
//   }

//   if (errorWithMessage.message?.includes('Version not found')) {
//     return c.json({ error: 'Version not found' }, 404)
//   }

//   // Hono middleware logs unexpected error

//   if (c.env.CACHE_REFRESH_QUEUE) {
//     try {
//       const queueWithAck = c.env.CACHE_REFRESH_QUEUE as {
//         ack(): void
//       }
//       queueWithAck.ack()
//     } catch (_ackError) {
//       // Hono middleware logs queue ack error
//     }
//   }

//   if (c.env.CACHE_REFRESH_QUEUE) {
//     try {
//       const queueWithRetry = c.env.CACHE_REFRESH_QUEUE as {
//         retry(): void
//       }
//       queueWithRetry.retry()
//     } catch (_retryError) {
//       // Queue retry failed, message will be discarded
//     }
//   }

//   return c.json({ error: 'Internal server error' }, 500)
// })

// // ---------------------------------------------------------
// // Queue Handlers
// // ---------------------------------------------------------

// export async function queue(
//   batch: QueueBatch,
//   env: Environment,
//   _ctx: unknown,
// ) {
//   // Process queue messages for cache refresh
//   for (const message of batch.messages) {
//     try {
//       const body = message.body
//       // Hono middleware logs queue message processing

//       if (body.type === 'package_refresh') {
//         await refreshPackageFromQueue(
//           body.packageName ?? '',
//           body.upstream,
//           body.options,
//           env,
//           createDatabaseOperations(
//             env.D1_DATABASE ?? ({} as D1Database),
//           ),
//           _ctx,
//         )
//       } else {
//         await refreshVersionFromQueue(
//           body.spec ?? '',
//           body.upstream,
//           body.options,
//           env,
//           createDatabaseOperations(
//             env.D1_DATABASE ?? ({} as D1Database),
//           ),
//           _ctx,
//         )
//       }

//       message.ack()
//     } catch (error) {
//       // Hono middleware logs queue processing error
//       const errorWithModified = error as { modified?: unknown }
//       if (errorWithModified.modified) {
//         // Handle cache modification conflicts
//       }

//       // Hono middleware logs queue error details

//       message.retry()
//     }
//   }
// }

// async function refreshPackageFromQueue(
//   packageName: string,
//   upstream: string,
//   _options: Record<string, unknown>,
//   _env: Environment,
//   db: ReturnType<typeof createDatabaseOperations>,
//   _ctx: unknown,
// ) {
//   // Hono middleware logs package refresh start

//   const upstreamConfig = getUpstreamConfig(upstream)
//   if (!upstreamConfig) {
//     throw new Error(`Unknown upstream: ${upstream}`)
//   }

//   const upstreamUrl = buildUpstreamUrl(upstreamConfig, packageName)
//   const response = await fetch(upstreamUrl, {
//     headers: {
//       Accept: 'application/json',
//       'User-Agent': 'vlt-serverless-registry',
//     },
//   })

//   if (!response.ok) {
//     if (response.status === 404) {
//       throw new Error(`Package not found: ${packageName}`)
//     }
//     throw new Error(`Upstream returned ${response.status}`)
//   }

//   const upstreamData: _UpstreamPackageData = await response.json()

//   // Store the package data

//   await db.upsertCachedPackage(
//     packageName,
//     upstreamData['dist-tags'] ?? { latest: '' },
//     upstream,
//     new Date().toISOString(),
//   )

//   // Hono middleware logs package refresh success
// }

// async function refreshVersionFromQueue(
//   spec: string,
//   upstream: string,
//   _options: Record<string, unknown>,
//   _env: Environment,
//   db: ReturnType<typeof createDatabaseOperations>,
//   _ctx: unknown,
// ) {
//   // Hono middleware logs version refresh start

//   const [packageName, version] = spec.split('@')
//   if (!packageName || !version) {
//     throw new Error(`Invalid spec format: ${spec}`)
//   }

//   const upstreamConfig = getUpstreamConfig(upstream)
//   if (!upstreamConfig) {
//     throw new Error(`Unknown upstream: ${upstream}`)
//   }

//   const upstreamUrl = buildUpstreamUrl(upstreamConfig, packageName)
//   const response = await fetch(upstreamUrl, {
//     headers: {
//       Accept: 'application/json',
//       'User-Agent': 'vlt-serverless-registry',
//     },
//   })

//   if (!response.ok) {
//     if (response.status === 404) {
//       throw new Error(`Package not found: ${packageName}`)
//     }
//     throw new Error(`Upstream returned ${response.status}`)
//   }

//   const upstreamData: _UpstreamPackageData = await response.json()

//   const versionManifest = upstreamData.versions?.[version]

//   if (versionManifest) {
//     await db.upsertCachedVersion(
//       spec,
//       versionManifest as Record<string, unknown>,
//       upstream,

//       upstreamData.time?.[version] ?? new Date().toISOString(),
//     )
//   }

//   // Hono middleware logs version refresh success
// }

export default app
