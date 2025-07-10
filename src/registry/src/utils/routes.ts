import type { HonoContext } from '../../types.ts'

// Public / Static Assets
export function requiresToken(c: HonoContext): boolean {
  const { path } = c.req
  const publicRoutes = [
    '/images',
    '/styles',
    '/-/auth/*',
    '/-/ping',
    '/-/docs',
    '/',
  ]

  // Package routes should be public for downloads
  // This includes hash-based routes, upstream routes, and legacy redirects
  const isPackageRoute =
    path.startsWith('/*/') || // Hash-based routes (literal asterisk)
    /^\/[^-/][^/]*\/[^/]/.test(path) || // Upstream or package routes
    /^\/[^-/][^/]*$/.test(path) || // Root package routes
    /^\/@[^/]+\/[^/]+/.test(path) // Scoped packages

  // Exclude PUT requests (publishing) from being public
  const isPutRequest = c.req.method === 'PUT'
  const isPublicPackageRoute = isPackageRoute && !isPutRequest

  return (
    publicRoutes.some(route => {
      if (route.endsWith('/*')) {
        return path.startsWith(route.slice(0, -2))
      }
      return path === route || path.startsWith(route)
    }) || isPublicPackageRoute
  )
}

// Catch-all for non-GET methods
export function catchAll(c: HonoContext) {
  return c.json({ error: 'Method not allowed' }, 405)
}

export function notFound(c: HonoContext) {
  return c.json({ error: 'Not found' }, 404)
}

export function isOK(c: HonoContext) {
  return c.json({}, 200)
}
