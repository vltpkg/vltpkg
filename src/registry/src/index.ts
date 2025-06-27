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
import { getApp } from './utils/spa.ts'
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

// Re-export queue handler from dedicated module
export { queue } from './queue/index.ts'

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
app.use('*', configMiddleware)
app.use('*', telemetryMiddleware)
app.use('*', secureHeaders())
app.use('*', jsonResponseHandler())
app.use('*', mountDatabase)
app.use('*', sessionMonitor)

// ---------------------------------------------------------
// Home
// (Single Page Application or API Docs)
// ---------------------------------------------------------

app.get('/', async c => {
  if (c.env.API_DOCS_ENABLED && !c.env.DAEMON_ENABLED) {
    return c.redirect('/-/docs', 302)
  } else {
    return c.html(await getApp(c.env.ASSETS))
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
app.openapi(pingRoute, handlePing)

// ---------------------------------------------------------
// Authorization Verification Middleware
// ---------------------------------------------------------

app.use('*', except(requiresToken, bearerAuth({ verifyToken })))

// ---------------------------------------------------------
// User Routes
// ---------------------------------------------------------

// Pattern: /-/whoami
app.openapi(whoamiRoute, getUsername)
// Pattern: /-/user
app.openapi(userProfileRoute, getUserProfile)

// ---------------------------------------------------------
// Daemon Project Routes - only local use
// ---------------------------------------------------------

// Pattern: /dashboard.json
app.openapi(dashboardDataRoute, async (c: Context) => {
  if (!c.env.DAEMON_ENABLED) {
    return c.json({ error: 'Daemon routes are disabled' }, 404)
  }

  return handleDashboardData(c)
})

// Pattern: /app-data.json
app.openapi(appDataRoute, async (c: Context) => {
  if (!c.env.DAEMON_ENABLED) {
    return c.json({ error: 'Daemon routes are disabled' }, 404)
  }

  return handleAppData(c)
})

// ---------------------------------------------------------
// Token Routes
// ---------------------------------------------------------

// Pattern: /-/tokens
app.openapi(getTokensRoute, getToken)
// Pattern: /-/tokens
app.openapi(createTokenRoute, postToken)
// Pattern: /-/tokens
app.openapi(updateTokenRoute, putToken)
// Pattern: /-/tokens/{token}
app.openapi(deleteTokenRoute, deleteToken)

// ---------------------------------------------------------
// Dist-tag Routes
// ---------------------------------------------------------

// Pattern: /-/package/{pkg}/dist-tags
app.openapi(getPackageDistTagsRoute, getPackageDistTags)
// Pattern: /-/package/{pkg}/dist-tags/{tag}
app.openapi(putPackageDistTagRoute, putPackageDistTag)
// Pattern: /-/package/{pkg}/dist-tags/{tag}
app.openapi(deletePackageDistTagRoute, deletePackageDistTag)

// ---------------------------------------------------------
// Access Control Routes
// ---------------------------------------------------------

// Pattern: /-/package/{pkg}/access (unscoped packages)
app.openapi(getPackageAccessRoute, getPackageAccessStatus)
app.openapi(setPackageAccessRoute, setPackageAccessStatus)

// Pattern: /-/package/{scope}%2f{pkg}/access (scoped packages)
app.openapi(getScopedPackageAccessRoute, getPackageAccessStatus)
app.openapi(setScopedPackageAccessRoute, setPackageAccessStatus)

// Pattern: /-/package/list
app.openapi(listPackagesAccessRoute, listPackagesAccess)

// Pattern: /-/package/{pkg}/collaborators/{username} (unscoped packages)
app.openapi(grantPackageAccessRoute, grantPackageAccess)
app.openapi(revokePackageAccessRoute, revokePackageAccess)

// Pattern: /-/package/{scope}%2f{pkg}/collaborators/{username} (scoped packages)
app.openapi(grantScopedPackageAccessRoute, grantPackageAccess)
app.openapi(revokeScopedPackageAccessRoute, revokePackageAccess)

// ---------------------------------------------------------
// Search Packages
// ---------------------------------------------------------

// Pattern: /-/search
app.openapi(searchPackagesRoute, searchPackages)

// ---------------------------------------------------------
// Handle Audit Requests
// ---------------------------------------------------------

// Pattern: /-/npm/audit (security audit - not implemented)
app.openapi(auditRoute, handleSecurityAudit)

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
// Upstream Package Routes
// (must come before catch-all package routes)
// ---------------------------------------------------------

// Pattern: /{upstream}/@{scope}/{pkg}/-/{tarball} (scoped package tarball)
app.openapi(
  getUpstreamScopedPackageTarballRoute,
  handleUpstreamScopedTarball,
)
// Pattern: /{upstream}/@{scope}/{pkg}/{version} (scoped package version)
app.openapi(
  getUpstreamScopedPackageVersionRoute,
  handleUpstreamScopedVersion,
)
// Pattern: /{upstream}/{pkg}/-/{tarball} (unscoped package tarball)
app.openapi(getUpstreamPackageTarballRoute, handleUpstreamTarball)
// Pattern: /{upstream}/@{scope}%2f{pkg} (URL-encoded scoped package)
app.openapi(
  getUpstreamEncodedScopedPackageRoute,
  handleUpstreamEncodedScoped,
)
// Pattern: /{upstream}/{param2}/{param3} (unified handler for ambiguous 3-segment paths)
app.openapi(getUpstreamUnifiedRoute, handleUpstreamUnified)
// Pattern: /{upstream}/{pkg} (unscoped package manifest)
app.openapi(getUpstreamPackageRoute, handleUpstreamPackage)

// Pattern: /-/npm/v1/security/advisories/bulk → /-/npm/audit
app.openapi(advisoriesBulkRoute, async (c: Context) => {
  return c.redirect('/-/npm/audit', 308)
})

// ---------------------------------------------------------
// Local Package Routes
// (catch-all patterns, must come after upstream routes)
// ---------------------------------------------------------

// Pattern: /{pkg} (package publishing via PUT)
app.openapi(publishPackageRoute, handlePackagePublish)
// Pattern: /{pkg}/-/{tarball} (package tarball download)
app.openapi(getPackageTarballRoute, handlePackageTarball)
// Pattern: /{pkg}/{version} (specific package version)
app.openapi(getPackageVersionRoute, handlePackageVersion)
// Pattern: /{pkg} (package manifest/packument)
app.openapi(getPackageRoute, handleRootPackageRoute)

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

export default app
