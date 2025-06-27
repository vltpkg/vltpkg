import type { Hono } from 'hono'
import type { Environment } from '../../types.ts'

// Import all route handlers
import { getUsername, getUserProfile } from './users.ts'
import { searchPackages } from './search.ts'
import { handleStaticAssets, handleFavicon, handleRobots, handleManifest } from './static.ts'
import { getToken, postToken, putToken, deleteToken } from './tokens.ts'
import { requiresAuth, handleLogin, handleCallback } from './auth.ts'
import {
  listPackagesAccess,
  getPackageAccessStatus,
  setPackageAccessStatus,
  grantPackageAccess,
  revokePackageAccess
} from './access.ts'
import {
  getPackageTarball,
  getPackagePackument
} from './packages.ts'

type HonoApp = Hono<{ Bindings: Environment }>

/**
 * Add user-related routes to the app
 */
export function addUserRoutes(app: HonoApp) {
  app.get('/-/whoami', getUsername as any)
  app.get('/-/user', getUserProfile as any)
}

/**
 * Add search routes to the app
 */
export function addSearchRoutes(app: HonoApp) {
  app.get('/-/search', searchPackages as any)
}

/**
 * Add static asset routes to the app
 */
export function addStaticRoutes(app: HonoApp) {
  app.get('/public/*', handleStaticAssets as any)
  app.get('/favicon.ico', handleFavicon as any)
  app.get('/robots.txt', handleRobots as any)
  app.get('/manifest.json', handleManifest as any)
}

/**
 * Add token management routes to the app
 */
export function addTokenRoutes(app: HonoApp) {
  app.get('/-/tokens/:token', getToken as any)
  app.post('/-/tokens', postToken as any)
  app.put('/-/tokens/:token', putToken as any)
  app.delete('/-/tokens/:token', deleteToken as any)
}

/**
 * Add authentication routes to the app
 */
export function addAuthRoutes(app: HonoApp) {
  app.get('/-/auth/login', handleLogin as any)
  app.get('/-/auth/callback', handleCallback as any)
  app.use('/-/auth/user', requiresAuth as any)
}

/**
 * Add package access management routes to the app
 */
export function addAccessRoutes(app: HonoApp) {
  // Package access list
  app.get('/-/package/list', listPackagesAccess as any)

  // Package access status (unscoped)
  app.get('/-/package/:pkg/access', getPackageAccessStatus as any)
  app.put('/-/package/:pkg/access', setPackageAccessStatus as any)

  // Package access status (scoped)
  app.get('/-/package/:scope%2f:pkg/access', getPackageAccessStatus as any)
  app.put('/-/package/:scope%2f:pkg/access', setPackageAccessStatus as any)

  // Package collaborators (unscoped)
  app.put('/-/package/:pkg/collaborators/:username', grantPackageAccess as any)
  app.delete('/-/package/:pkg/collaborators/:username', revokePackageAccess as any)

  // Package collaborators (scoped)
  app.put('/-/package/:scope%2f:pkg/collaborators/:username', grantPackageAccess as any)
  app.delete('/-/package/:scope%2f:pkg/collaborators/:username', revokePackageAccess as any)
}

/**
 * Add package routes to the app
 */
export function addPackageRoutes(app: HonoApp) {
  // Package tarball routes
  app.get('/:scope/:pkg/-/:tarball', getPackageTarball as any)
  app.get('/:pkg/-/:tarball', getPackageTarball as any)

    // Package packument routes (full package metadata)
  app.get('/:scope/:pkg', getPackagePackument as any)
  app.get('/:pkg', getPackagePackument as any)

  // Note: Additional package routes (manifest, publishing, dist-tags) would be added here
  // They are partially converted in packages.ts but need to be completed

  // Placeholder for remaining package functionality
  app.all('/*', (c) => c.json({
    error: 'Package route not fully implemented',
    message: 'Some package routes are converted but not all functions are exported yet'
  }, 501) as any)
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
  revokePackageAccess
}
