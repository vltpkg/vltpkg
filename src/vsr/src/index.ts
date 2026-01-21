/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { OPEN_API_CONFIG } from '../config.ts'
import { OpenAPIHono } from '@hono/zod-openapi'
import { requestId } from 'hono/request-id'
import { bearerAuth } from 'hono/bearer-auth'
import { except } from 'hono/combine'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { telemetryMiddleware } from './middleware/telemetry.ts'
import { configMiddleware } from './middleware/config.ts'
import { verifyToken } from './utils/auth.ts'
import { mountDatabase } from './utils/database.ts'
import { jsonResponseHandler } from './utils/response.ts'
import { requiresToken } from './utils/routes.ts'
import {
  getUsername,
  getUserProfile,
  userProfileRoute,
  whoamiRoute,
} from './routes/users.ts'
import { pingRoute, handlePing } from './routes/ping.ts'
import { getDocs } from './routes/docs.ts'
import {
  getToken,
  putToken,
  postToken,
  deleteToken,
  getTokensRoute,
  createTokenRoute,
  updateTokenRoute,
  deleteTokenRoute,
} from './routes/tokens.ts'
import {
  getPackageDistTags,
  putPackageDistTag,
  deletePackageDistTag,
  handleRootPackageRoute,
  handlePackagePublish,
  handlePackageVersion,
  handlePackageTarball,
  handleUpstreamPackage,
  handleUpstreamScopedTarball,
  handleUpstreamScopedVersion,
  handleUpstreamEncodedScoped,
  handleUpstreamUnified,
  handleUpstreamTarball,
  // Local package route definitions
  getPackageRoute,
  getPackageVersionRoute,
  getPackageTarballRoute,
  publishPackageRoute,
  getPackageDistTagsRoute,
  putPackageDistTagRoute,
  deletePackageDistTagRoute,
  // Upstream package route definitions
  getUpstreamPackageRoute,
  getUpstreamScopedPackageVersionRoute,
  getUpstreamPackageTarballRoute,
  getUpstreamScopedPackageTarballRoute,
  getUpstreamEncodedScopedPackageRoute,
  getUpstreamUnifiedRoute,
} from './routes/packages.ts'
import {
  listPackagesAccess,
  getPackageAccessStatus,
  setPackageAccessStatus,
  grantPackageAccess,
  revokePackageAccess,
  // OpenAPI route definitions
  getPackageAccessRoute,
  setPackageAccessRoute,
  getScopedPackageAccessRoute,
  setScopedPackageAccessRoute,
  listPackagesAccessRoute,
  grantPackageAccessRoute,
  revokePackageAccessRoute,
  grantScopedPackageAccessRoute,
  revokeScopedPackageAccessRoute,
} from './routes/access.ts'
import {
  searchPackages,
  searchPackagesRoute,
} from './routes/search.ts'
import {
  auditRoute,
  auditQuickRoute,
  advisoriesBulkRoute,
  dashboardDataRoute,
  appDataRoute,
  handleDashboardData,
  handleAppData,
  handleSecurityAudit,
  // Compatibility redirect routes
  searchRedirectRoute,
  userRedirectRoute,
  tokensRedirectRoute,
  createTokenRedirectRoute,
  updateTokenRedirectRoute,
  deleteTokenRedirectRoute,
} from './routes/misc.ts'

import { sessionMonitor } from './utils/tracing.ts'
import type { createDatabaseOperations } from './db/client.ts'
import {
  handleStaticAssets,
  handleFavicon,
  handleRobots,
  handleManifest,
} from './routes/static.ts'
import type { Environment } from '../types.ts'
import type { Context } from 'hono'

// Import queue handler from dedicated module
import { queue } from './queue/index.ts'

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
    noUpstreamRedirect?: boolean
    upstream?: string
  }
}>({ strict: false })

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

app.use(trimTrailingSlash())
app.use('*', requestId())
app.use('*', logger())
app.use('*', configMiddleware)
app.use('*', telemetryMiddleware)
app.use('*', secureHeaders())
app.use('*', jsonResponseHandler())
app.use('*', except(['/-/ping', '/-/docs'], mountDatabase as any))
app.use('*', sessionMonitor)

// ---------------------------------------------------------
// Home
// (Single Page Application or API Docs)
// ---------------------------------------------------------

app.get('/', async c => {
  if (c.env.API_DOCS_ENABLED) {
    return c.redirect('/-/docs', 302)
  } else {
    c.text('vlt serverless registry is alive.\n')
  }
})

// ---------------------------------------------------------
// Documentation
// ---------------------------------------------------------

// Mount API documentation routes
app.doc('/-/api', OPEN_API_CONFIG)
app.get('/-/docs', getDocs)

// ---------------------------------------------------------
// Health Check
// ---------------------------------------------------------

// Pattern: /-/ping
app.openapi(pingRoute, handlePing as any)

// ---------------------------------------------------------
// Authorization Verification Middleware
// ---------------------------------------------------------

// Custom auth middleware that checks if token is required
app.use('*', async (c, next) => {
  if (requiresToken(c)) {
    // Token is required, apply bearer auth
    return bearerAuth({ verifyToken: verifyToken as any })(c, next)
  } else {
    // Token not required, skip auth
    await next()
  }
})

// ---------------------------------------------------------
// User Routes
// ---------------------------------------------------------

// Pattern: /-/whoami
app.openapi(whoamiRoute, getUsername)
// Pattern: /-/user
app.openapi(userProfileRoute, getUserProfile)

// Pattern: /dashboard.json
app.openapi(dashboardDataRoute, handleDashboardData as any)

// Pattern: /app-data.json
app.openapi(appDataRoute, handleAppData as any)

// ---------------------------------------------------------
// Token Routes
// ---------------------------------------------------------

// Pattern: /-/tokens
app.openapi(getTokensRoute, getToken as any)
// Pattern: /-/tokens
app.openapi(createTokenRoute, postToken as any)
// Pattern: /-/tokens
app.openapi(updateTokenRoute, putToken as any)
// Pattern: /-/tokens/{token}
app.openapi(deleteTokenRoute, deleteToken as any)

// ---------------------------------------------------------
// Dist-tag Routes
// ---------------------------------------------------------

// Pattern: /-/package/{pkg}/dist-tags
app.openapi(getPackageDistTagsRoute, getPackageDistTags as any)
// Pattern: /-/package/{pkg}/dist-tags/{tag}
app.openapi(putPackageDistTagRoute, putPackageDistTag as any)
// Pattern: /-/package/{pkg}/dist-tags/{tag}
app.openapi(deletePackageDistTagRoute, deletePackageDistTag as any)

// ---------------------------------------------------------
// Access Control Routes
// ---------------------------------------------------------

// Pattern: /-/package/{pkg}/access (unscoped packages)
app.openapi(getPackageAccessRoute, getPackageAccessStatus as any)
app.openapi(setPackageAccessRoute, setPackageAccessStatus as any)

// Pattern: /-/package/{scope}%2f{pkg}/access (scoped packages)
app.openapi(
  getScopedPackageAccessRoute,
  getPackageAccessStatus as any,
)
app.openapi(
  setScopedPackageAccessRoute,
  setPackageAccessStatus as any,
)

// Pattern: /-/package/list
app.openapi(listPackagesAccessRoute, listPackagesAccess as any)

// Pattern: /-/package/{pkg}/collaborators/{username} (unscoped packages)
app.openapi(grantPackageAccessRoute, grantPackageAccess as any)
app.openapi(revokePackageAccessRoute, revokePackageAccess as any)

// Pattern: /-/package/{scope}%2f{pkg}/collaborators/{username} (scoped packages)
app.openapi(grantScopedPackageAccessRoute, grantPackageAccess as any)
app.openapi(
  revokeScopedPackageAccessRoute,
  revokePackageAccess as any,
)

// ---------------------------------------------------------
// Search Packages
// ---------------------------------------------------------

// Pattern: /-/search
app.openapi(searchPackagesRoute, searchPackages as any)

// ---------------------------------------------------------
// Handle Audit Requests
// ---------------------------------------------------------

// Pattern: /-/npm/audit (security audit - not implemented)
app.openapi(auditRoute, handleSecurityAudit as any)

// ---------------------------------------------------------
// NPM Compatibility Routes (Legacy API Redirects)
// (maximizes backwards compatibility with npm clients)
// ---------------------------------------------------------

// Pattern: /-/v1/search → /-/search
app.openapi(searchRedirectRoute, (c: Context) =>
  c.redirect('/-/search', 308),
)

// Pattern: /-/npm/v1/user → /-/user
app.openapi(userRedirectRoute, (c: Context) =>
  c.redirect('/-/user', 308),
)

// Pattern: /-/npm/v1/tokens → /-/tokens (GET)
app.openapi(tokensRedirectRoute, (c: Context) =>
  c.redirect('/-/tokens', 308),
)

// Pattern: /-/npm/v1/tokens → /-/tokens (POST)
app.openapi(createTokenRedirectRoute, (c: Context) =>
  c.redirect('/-/tokens', 308),
)

// Pattern: /-/npm/v1/tokens → /-/tokens (PUT)
app.openapi(updateTokenRedirectRoute, (c: Context) =>
  c.redirect('/-/tokens', 308),
)

// Pattern: /-/npm/v1/tokens/token/{token} → /-/tokens/{token} (DELETE)
app.openapi(deleteTokenRedirectRoute, (c: Context) => {
  return c.redirect(`/-/tokens/${c.req.param('token')}`, 308)
})

// Pattern: /-/npm/v1/security/audits/quick → /-/npm/audit
app.openapi(auditQuickRoute, (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// Pattern: /-/npm/v1/security/advisories/bulk → /-/npm/audit
app.openapi(advisoriesBulkRoute, (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// ---------------------------------------------------------
// Upstream Utility Routes
// (Registry utility endpoints for upstream registries)
// (MUST come before upstream package routes to avoid conflicts)
// ---------------------------------------------------------

// Pattern: /{upstream}/-/ping (upstream registry ping)
app.get('/:upstream/-/ping', handlePing)

// Pattern: /{upstream}/-/docs (upstream registry docs)
app.get('/:upstream/-/docs', getDocs)

// Pattern: /{upstream}/-/whoami (upstream registry whoami)
app.get('/:upstream/-/whoami', getUsername)

// Pattern: /{upstream}/-/user (upstream registry user profile)
app.get('/:upstream/-/user', getUserProfile)

// Pattern: /{upstream}/-/tokens (upstream registry token management)
app.get('/:upstream/-/tokens', getToken)
app.post('/:upstream/-/tokens', postToken)
app.put('/:upstream/-/tokens', putToken)
app.delete('/:upstream/-/tokens/:token', deleteToken)

// Pattern: /{upstream}/-/search (upstream registry search)
app.get('/:upstream/-/search', searchPackages)

// Pattern: /{upstream}/-/npm/audit (upstream registry audit)
app.post('/:upstream/-/npm/audit', handleSecurityAudit)

// ---------------------------------------------------------
// Local Private Package Namespace Routes (/local/*)
// (packages in /local namespace are always stored locally, never proxied)
// (must come before upstream routes to take precedence)
// ---------------------------------------------------------

// Middleware to disable upstream redirects for /local namespace
app.use('/local/*', async (c, next) => {
  c.set('noUpstreamRedirect', true)
  await next()
})

// Pattern: /local/-/whoami (local namespace whoami)
app.get('/local/-/whoami', getUsername)
// Pattern: /local/-/user (local namespace user profile)
app.get('/local/-/user', getUserProfile)
// Pattern: /local/-/ping (local namespace ping)
app.get('/local/-/ping', handlePing)

// Pattern: /local/@{scope}/{pkg}/-/{tarball} (scoped package tarball - requires scoped package handler)
app.get('/local/:scope/:pkg/-/:tarball', handlePackageTarball as any)
// Pattern: /local/@{scope}/{pkg}/{version} (scoped package version)
app.get('/local/:scope/:pkg/:version', handlePackageVersion as any)
// Pattern: /local/@{scope}/{pkg} (scoped package manifest)
app.get('/local/:scope/:pkg', handleRootPackageRoute as any)
// Pattern: /local/{pkg}/-/{tarball} (package tarball)
app.get('/local/:pkg/-/:tarball', handlePackageTarball as any)
// Pattern: /local/{pkg}/{version} (package version)
app.get('/local/:pkg/:version', handlePackageVersion as any)
// Pattern: /local/{pkg} (package publishing via PUT - uses same handler as regular publishing)
app.put('/local/:pkg', handlePackagePublish as any)
// Pattern: /local/{pkg} (package manifest)
app.get('/local/:pkg', handleRootPackageRoute as any)

// ---------------------------------------------------------
// Upstream Package Routes
// (must come before catch-all package routes)
// ---------------------------------------------------------

// Pattern: /{upstream}/@{scope}/{pkg}/-/{tarball} (scoped package tarball)
app.openapi(
  getUpstreamScopedPackageTarballRoute,
  handleUpstreamScopedTarball as any,
)
// Pattern: /{upstream}/@{scope}/{pkg}/{version} (scoped package version)
app.openapi(
  getUpstreamScopedPackageVersionRoute,
  handleUpstreamScopedVersion as any,
)
// Pattern: /{upstream}/{pkg}/-/{tarball} (unscoped package tarball)
app.openapi(
  getUpstreamPackageTarballRoute,
  handleUpstreamTarball as any,
)
// Pattern: /{upstream}/@{scope}%2f{pkg} (URL-encoded scoped package)
app.openapi(
  getUpstreamEncodedScopedPackageRoute,
  handleUpstreamEncodedScoped as any,
)
// Pattern: /{upstream}/{param2}/{param3} (unified handler for ambiguous 3-segment paths)
app.openapi(getUpstreamUnifiedRoute, handleUpstreamUnified as any)
// Pattern: /{upstream}/{pkg} (unscoped package manifest)
app.openapi(getUpstreamPackageRoute, handleUpstreamPackage as any)

// Pattern: /-/npm/v1/security/advisories/bulk → /-/npm/audit
app.openapi(advisoriesBulkRoute, async (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// ---------------------------------------------------------
// Local Package Routes
// (catch-all patterns, must come after upstream routes)
// ---------------------------------------------------------

// Pattern: /{pkg} (package publishing via PUT)
app.openapi(publishPackageRoute, handlePackagePublish as any)
// Pattern: /{pkg}/-/{tarball} (package tarball download)
app.openapi(getPackageTarballRoute, handlePackageTarball as any)
// Pattern: /{pkg}/{version} (specific package version)
app.openapi(getPackageVersionRoute, handlePackageVersion as any)
// Pattern: /{pkg} (package manifest/packument)
app.openapi(getPackageRoute, handleRootPackageRoute as any)

// ---------------------------------------------------------
// Handle Static Assets
// ---------------------------------------------------------

// Pattern: /public/* (static assets from public directory)
app.get('/public/*', handleStaticAssets)
// Pattern: /favicon.ico (browser favicon)
app.get('/favicon.ico', handleFavicon)
// Pattern: /robots.txt (web crawler instructions)
app.get('/robots.txt', handleRobots)
// Pattern: /manifest.json (PWA web app manifest)
app.get('/manifest.json', handleManifest)
// Pattern: /* (catch-all for any other static assets)
app.get('/*', handleStaticAssets)

export { app }

export default {
  fetch: app.fetch,
  queue,
}
