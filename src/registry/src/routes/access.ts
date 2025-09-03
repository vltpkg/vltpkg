import { getAuthedUser } from '../utils/auth.ts'
import { createRoute, z } from '@hono/zod-openapi'
import type {
  HonoContext,
  AccessResponse,
  AuthUser,
} from '../../types.ts'

interface PackageAccessEntry {
  name: string
  collaborators: Record<string, 'read-only' | 'read-write'>
}

interface PackageListResponse {
  packages: PackageAccessEntry[]
  total: number
}

// Define interfaces for request bodies to ensure type safety
interface SetAccessRequestBody {
  collaborators?: Record<string, 'read-only' | 'read-write'>
}

interface GrantAccessRequestBody {
  permission: 'read-only' | 'read-write'
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
      total: 0,
    }

    return c.json(response)
  } catch (_error) {
    // Hono middleware will log access errors
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
        [user.uuid]: 'read-write', // Default the owner to read-write
      },
    }

    return c.json(response)
  } catch (_error) {
    // Hono middleware will log package access errors
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

    const body =
      (await c.req.json()) as unknown as SetAccessRequestBody

    // Check if user has admin access to this package
    const hasAdminAccess = await checkPackageAdminAccess(
      c,
      packageName,
      user,
    )

    if (!hasAdminAccess) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    // Update package access (this would need to be implemented in your database)
    // For now, just return the requested access
    const response: AccessResponse = {
      name: packageName,
      collaborators: body.collaborators ?? {},
    }

    return c.json(response)
  } catch (_error) {
    // Hono middleware will log package access setting errors
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
      return c.json(
        { error: 'Package name and username required' },
        400,
      )
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const body =
      (await c.req.json()) as unknown as GrantAccessRequestBody

    // Check if user has admin access to this package
    const hasAdminAccess = await checkPackageAdminAccess(
      c,
      packageName,
      user,
    )

    if (!hasAdminAccess) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    // Grant access (this would need to be implemented in your database)
    // For now, just return success
    const response: AccessResponse = {
      name: packageName,
      collaborators: {
        [user.uuid]: 'read-write',
        [username]: body.permission,
      },
    }

    return c.json(response)
  } catch (_error) {
    // Hono middleware will log package access granting errors
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
      return c.json(
        { error: 'Package name and username required' },
        400,
      )
    }

    const user = await getAuthedUser({ c })
    if (!user?.uuid) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // Check if user has admin access to this package
    const hasAdminAccess = await checkPackageAdminAccess(
      c,
      packageName,
      user,
    )

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
        [user.uuid]: 'read-write',
        // username removed from collaborators
      },
    }

    return c.json(response)
  } catch (_error) {
    // Hono middleware will log package access revocation errors
    return c.json({ error: 'Failed to revoke package access' }, 500)
  }
}

/**
 * Helper function to check if user has access to a package
 */
async function checkPackageAccess(
  _c: HonoContext,
  packageName: string,
  user: AuthUser,
): Promise<boolean> {
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
      if (
        scope.values.includes(packageName) &&
        scope.types.pkg.read
      ) {
        return true
      }
    }
  }

  return false
}

/**
 * Helper function to check if user has admin access to a package
 */
async function checkPackageAdminAccess(
  _c: HonoContext,
  packageName: string,
  user: AuthUser,
): Promise<boolean> {
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
      if (
        scope.values.includes(packageName) &&
        scope.types.pkg.write
      ) {
        return true
      }
    }
  }

  return false
}

// Route definitions for OpenAPI documentation
export const getPackageAccessRoute = createRoute({
  method: 'get',
  path: '/-/package/{pkg}/access',
  tags: ['Access Control'],
  summary: 'Get Package Access',
  description: `Get access control information for a package`,
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
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Package access information',
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

export const setPackageAccessRoute = createRoute({
  method: 'post',
  path: '/-/package/{pkg}/access',
  tags: ['Access Control'],
  summary: 'Set Package Access',
  description: `Set access control information for a package`,
  request: {
    params: z.object({
      pkg: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            collaborators: z
              .record(z.enum(['read-only', 'read-write']))
              .optional(),
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
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Package access updated successfully',
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

export const getScopedPackageAccessRoute = createRoute({
  method: 'get',
  path: '/-/package/{scope}%2f{pkg}/access',
  tags: ['Access Control'],
  summary: 'Get Scoped Package Access',
  description: `Get access control information for a scoped package`,
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
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Package access information',
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

export const setScopedPackageAccessRoute = createRoute({
  method: 'post',
  path: '/-/package/{scope}%2f{pkg}/access',
  tags: ['Access Control'],
  summary: 'Set Scoped Package Access',
  description: `Set access control information for a scoped package`,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            collaborators: z
              .record(z.enum(['read-only', 'read-write']))
              .optional(),
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
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Package access updated successfully',
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

export const listPackagesAccessRoute = createRoute({
  method: 'get',
  path: '/-/package/list',
  tags: ['Access Control'],
  summary: 'List Package Access',
  description: `List all packages the authenticated user has access to`,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            packages: z.array(
              z.object({
                name: z.string(),
                collaborators: z.record(
                  z.enum(['read-only', 'read-write']),
                ),
              }),
            ),
            total: z.number(),
          }),
        },
      },
      description: 'List of packages with access information',
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
  },
})

export const grantPackageAccessRoute = createRoute({
  method: 'put',
  path: '/-/package/{pkg}/collaborators/{username}',
  tags: ['Access Control'],
  summary: 'Grant Package Access',
  description: `Grant access to a package for a specific user`,
  request: {
    params: z.object({
      pkg: z.string(),
      username: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            permission: z.enum(['read-only', 'read-write']),
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
            name: z.string(),
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Access granted successfully',
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

export const revokePackageAccessRoute = createRoute({
  method: 'delete',
  path: '/-/package/{pkg}/collaborators/{username}',
  tags: ['Access Control'],
  summary: 'Revoke Package Access',
  description: `Revoke access to a package for a specific user`,
  request: {
    params: z.object({
      pkg: z.string(),
      username: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Access revoked successfully',
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

export const grantScopedPackageAccessRoute = createRoute({
  method: 'put',
  path: '/-/package/{scope}%2f{pkg}/collaborators/{username}',
  tags: ['Access Control'],
  summary: 'Grant Scoped Package Access',
  description: `Grant access to a scoped package for a specific user`,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
      username: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            permission: z.enum(['read-only', 'read-write']),
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
            name: z.string(),
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Access granted successfully',
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

export const revokeScopedPackageAccessRoute = createRoute({
  method: 'delete',
  path: '/-/package/{scope}%2f{pkg}/collaborators/{username}',
  tags: ['Access Control'],
  summary: 'Revoke Scoped Package Access',
  description: `Revoke access to a scoped package for a specific user`,
  request: {
    params: z.object({
      scope: z.string(),
      pkg: z.string(),
      username: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            collaborators: z.record(
              z.enum(['read-only', 'read-write']),
            ),
          }),
        },
      },
      description: 'Access revoked successfully',
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
