import type { Hono } from 'hono'
import type { Environment } from '../../types.ts'

// Import all route handlers
import { getUsername, getUserProfile } from './users.ts'
import { searchPackages } from './search.ts'
import {
  handleStaticAssets,
  handleFavicon,
  handleRobots,
  handleManifest,
} from './static.ts'
import {
  getToken,
  postToken,
  putToken,
  deleteToken,
} from './tokens.ts'
import { requiresAuth, handleLogin, handleCallback } from './auth.ts'
import {
  listPackagesAccess,
  getPackageAccessStatus,
  setPackageAccessStatus,
  grantPackageAccess,
  revokePackageAccess,
} from './access.ts'
import { getPackageTarball, getPackagePackument } from './packages.ts'

type HonoApp = Hono<{ Bindings: Environment }>

/**
 * Add user-related routes to the app
 */
export function addUserRoutes(app: HonoApp) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/-/whoami', getUsername as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/-/user', getUserProfile as any)
}

/**
 * Add search routes to the app
 */
export function addSearchRoutes(app: HonoApp) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/-/search', searchPackages as any)
}

/**
 * Add static asset routes to the app
 */
export function addStaticRoutes(app: HonoApp) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/public/*', handleStaticAssets as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/favicon.ico', handleFavicon as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/robots.txt', handleRobots as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/manifest.json', handleManifest as any)
}

/**
 * Add token management routes to the app
 */
export function addTokenRoutes(app: HonoApp) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/-/tokens/:token', getToken as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.post('/-/tokens', postToken as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.put('/-/tokens/:token', putToken as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.delete('/-/tokens/:token', deleteToken as any)
}

/**
 * Add authentication routes to the app
 */
export function addAuthRoutes(app: HonoApp) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/-/auth/login', handleLogin as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/-/auth/callback', handleCallback as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.use('/-/auth/user', requiresAuth as any)
}

/**
 * Add package access management routes to the app
 */
export function addAccessRoutes(app: HonoApp) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/-/package/list', listPackagesAccess as any)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/-/package/:pkg/access', getPackageAccessStatus as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.put('/-/package/:pkg/access', setPackageAccessStatus as any)

  app.get(
    '/-/package/:scope%2f:pkg/access',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    getPackageAccessStatus as any,
  )
  app.put(
    '/-/package/:scope%2f:pkg/access',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setPackageAccessStatus as any,
  )

  app.put(
    '/-/package/:pkg/collaborators/:username',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    grantPackageAccess as any,
  )
  app.delete(
    '/-/package/:pkg/collaborators/:username',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    revokePackageAccess as any,
  )

  app.put(
    '/-/package/:scope%2f:pkg/collaborators/:username',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    grantPackageAccess as any,
  )
  app.delete(
    '/-/package/:scope%2f:pkg/collaborators/:username',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    revokePackageAccess as any,
  )
}

/**
 * Add package routes to the app
 */
export function addPackageRoutes(app: HonoApp) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/:scope/:pkg/-/:tarball', getPackageTarball as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/:pkg/-/:tarball', getPackageTarball as any)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/:scope/:pkg', getPackagePackument as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.get('/:pkg', getPackagePackument as any)

  // Note: Additional package routes (manifest, publishing, dist-tags) would be added here
  // They are partially converted in packages.ts but need to be completed

  // Placeholder for remaining package functionality
  app.all(
    '/*',
    c =>
      c.json(
        {
          error: 'Package route not fully implemented',
          message:
            'Some package routes are converted but not all functions are exported yet',
        },
        501,
      ),
  )
}

// Re-export all route handlers for direct use
export {
  getUsername,
  getUserProfile,
  searchPackages,
  handleStaticAssets,
  handleFavicon,
  handleRobots,
  handleManifest,
  getToken,
  postToken,
  putToken,
  deleteToken,
  requiresAuth,
  handleLogin,
  handleCallback,
  listPackagesAccess,
  getPackageAccessStatus,
  setPackageAccessStatus,
  grantPackageAccess,
  revokePackageAccess,
}
