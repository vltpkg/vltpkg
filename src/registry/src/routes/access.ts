import { getAuthedUser } from '../utils/auth.ts'
import { parsePackageSpec } from '../utils/upstream.ts'
import type {
  HonoContext,
  AccessRequest,
  AccessResponse,
  TokenScope,
  AuthUser
} from '../../types.ts'

interface PackageAccessEntry {
  name: string
  collaborators: Record<string, 'read-only' | 'read-write'>
}

interface PackageListResponse {
  packages: PackageAccessEntry[]
  total: number
}

/**
 * Lists all packages the authenticated user has access to
 */
export async function listPackagesAccess(c: HonoContext) {
  try {
    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // For now, return empty list - this would need to be implemented
    // based on your specific access control requirements
    const response: PackageListResponse = {
      packages: [],
      total: 0
    }

    return c.json(response)
  } catch (error) {
    console.error('[ACCESS ERROR] Failed to list packages:', error)
    return c.json({ error: 'Failed to list packages' }, 500)
  }
}

/**
 * Gets the access status for a specific package
 */
export async function getPackageAccessStatus(c: HonoContext) {
  try {
    const { scope, pkg } = c.req.param()
    const packageName = scope && pkg ? `${scope}/${pkg}` : scope

    if (!packageName) {
      return c.json({ error: 'Package name required' }, 400)
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // Check if user has access to this package
    const hasAccess = await checkPackageAccess(c, packageName, user)

    if (!hasAccess) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Return package access information
    const response: AccessResponse = {
      name: packageName,
      collaborators: {
        [user.uuid]: 'read-write' // Default the owner to read-write
      }
    }

    return c.json(response)
  } catch (error) {
    console.error('[ACCESS ERROR] Failed to get package access:', error)
    return c.json({ error: 'Failed to get package access' }, 500)
  }
}

/**
 * Sets the access status for a specific package
 */
export async function setPackageAccessStatus(c: HonoContext) {
  try {
    const { scope, pkg } = c.req.param()
    const packageName = scope && pkg ? `${scope}/${pkg}` : scope

    if (!packageName) {
      return c.json({ error: 'Package name required' }, 400)
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const body = await c.req.json() as { collaborators: Record<string, 'read-only' | 'read-write'> }

    // Check if user has admin access to this package
    const hasAdminAccess = await checkPackageAdminAccess(c, packageName, user)

    if (!hasAdminAccess) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    // Update package access (this would need to be implemented in your database)
    // For now, just return the requested access
    const response: AccessResponse = {
      name: packageName,
      collaborators: body.collaborators || {}
    }

    return c.json(response)
  } catch (error) {
    console.error('[ACCESS ERROR] Failed to set package access:', error)
    return c.json({ error: 'Failed to set package access' }, 500)
  }
}

/**
 * Grants access to a user for a specific package
 */
export async function grantPackageAccess(c: HonoContext) {
  try {
    const { scope, pkg, username } = c.req.param()
    const packageName = scope && pkg ? `${scope}/${pkg}` : scope

    if (!packageName || !username) {
      return c.json({ error: 'Package name and username required' }, 400)
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const body = await c.req.json() as AccessRequest

    // Check if user has admin access to this package
    const hasAdminAccess = await checkPackageAdminAccess(c, packageName, user)

    if (!hasAdminAccess) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    // Grant access (this would need to be implemented in your database)
    // For now, just return success
    const response: AccessResponse = {
      name: packageName,
      collaborators: {
        [user.uuid]: 'read-write',
        [username]: body.permission
      }
    }

    return c.json(response)
  } catch (error) {
    console.error('[ACCESS ERROR] Failed to grant package access:', error)
    return c.json({ error: 'Failed to grant package access' }, 500)
  }
}

/**
 * Revokes access from a user for a specific package
 */
export async function revokePackageAccess(c: HonoContext) {
  try {
    const { scope, pkg, username } = c.req.param()
    const packageName = scope && pkg ? `${scope}/${pkg}` : scope

    if (!packageName || !username) {
      return c.json({ error: 'Package name and username required' }, 400)
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // Check if user has admin access to this package
    const hasAdminAccess = await checkPackageAdminAccess(c, packageName, user)

    if (!hasAdminAccess) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    // Prevent users from revoking their own access
    if (username === user.uuid) {
      return c.json({ error: 'Cannot revoke your own access' }, 400)
    }

    // Revoke access (this would need to be implemented in your database)
    // For now, just return success
    const response: AccessResponse = {
      name: packageName,
      collaborators: {
        [user.uuid]: 'read-write'
        // username removed from collaborators
      }
    }

    return c.json(response)
  } catch (error) {
    console.error('[ACCESS ERROR] Failed to revoke package access:', error)
    return c.json({ error: 'Failed to revoke package access' }, 500)
  }
}

/**
 * Helper function to check if user has access to a package
 */
async function checkPackageAccess(c: HonoContext, packageName: string, user: AuthUser): Promise<boolean> {
  if (!user.scope || !user.uuid) {
    return false
  }

  // Check if user has global access or specific package access
  for (const scope of user.scope) {
    if (scope.types.pkg) {
      // Check for global access
      if (scope.values.includes('*') && scope.types.pkg.read) {
        return true
      }

      // Check for specific package access
      if (scope.values.includes(packageName) && scope.types.pkg.read) {
        return true
      }
    }
  }

  return false
}

/**
 * Helper function to check if user has admin access to a package
 */
async function checkPackageAdminAccess(c: HonoContext, packageName: string, user: AuthUser): Promise<boolean> {
  if (!user.scope || !user.uuid) {
    return false
  }

  // Check if user has global write access or specific package write access
  for (const scope of user.scope) {
    if (scope.types.pkg) {
      // Check for global write access
      if (scope.values.includes('*') && scope.types.pkg.write) {
        return true
      }

      // Check for specific package write access
      if (scope.values.includes(packageName) && scope.types.pkg.write) {
        return true
      }
    }
  }

  return false
}
