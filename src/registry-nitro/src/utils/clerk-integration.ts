/**
 * Clerk Integration Utilities
 * 
 * This file contains utilities for integrating with Clerk authentication.
 * It provides a proper implementation for token verification and user management.
 */

import { clerk } from '../auth.ts'
import type { User } from '@clerk/backend'

export interface ClerkUser {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  username?: string
  firstName?: string
  lastName?: string
}

/**
 * Verify a Clerk session token and return user information
 */
export const verifyClerkToken = async (
  token: string,
): Promise<ClerkUser> => {
  try {
    // Verify the session token with Clerk
    const session = await clerk.verifySession(token, {
      // Add any additional verification options here
    })

    if (!session) {
      throw new Error('Invalid session')
    }

    // Get the user associated with this session
    const user = await clerk.users.getUser(session.userId)

    return {
      id: user.id,
      emailAddresses: user.emailAddresses,
      username: user.username || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    }
  } catch (error) {
    throw new Error(`Clerk token verification failed: ${error}`)
  }
}

/**
 * Alternative: Verify a JWT token directly (if using Clerk JWTs)
 */
export const verifyClerkJWT = async (
  token: string,
): Promise<{ sub: string; email?: string }> => {
  try {
    // Use Clerk's JWT verification
    const payload = await clerk.verifyToken(token)

    return {
      sub: payload.sub,
      email: payload.email,
    }
  } catch (error) {
    throw new Error(`Clerk JWT verification failed: ${error}`)
  }
}

/**
 * Get user permissions/scopes based on Clerk user data
 * This is where you would implement your authorization logic
 */
export const getUserScopes = async (
  clerkUser: ClerkUser,
): Promise<string[]> => {
  // Example scope logic - customize based on your needs
  const scopes: string[] = []

  // All authenticated users can read
  scopes.push('read')

  // Check if user has write permissions
  // This could be based on organization membership, user metadata, etc.
  const hasWriteAccess = await checkWriteAccess(clerkUser)
  if (hasWriteAccess) {
    scopes.push('write')
  }

  // Check for admin permissions
  const isAdmin = await checkAdminAccess(clerkUser)
  if (isAdmin) {
    scopes.push('admin')
  }

  return scopes
}

/**
 * Check if user has write access to packages
 * Implement your business logic here
 */
const checkWriteAccess = async (user: ClerkUser): Promise<boolean> => {
  // Example: Check if user is in a specific organization
  // const orgs = await clerk.users.getOrganizationMemberships(user.id)
  // return orgs.some(org => org.organization.slug === 'your-org')

  // For now, grant write access to all authenticated users
  return true
}

/**
 * Check if user has admin access
 * Implement your business logic here
 */
const checkAdminAccess = async (user: ClerkUser): Promise<boolean> => {
  // Example: Check user metadata or organization role
  // const user = await clerk.users.getUser(user.id)
  // return user.publicMetadata?.role === 'admin'

  // For now, no admin access by default
  return false
}

/**
 * Generate a scope string for storage in the database
 */
export const generateScopeString = (scopes: string[]): string => {
  return JSON.stringify({
    scopes,
    createdAt: new Date().toISOString(),
  })
}

/**
 * Parse a scope string from the database
 */
export const parseScopeString = (
  scopeString: string | null,
): { scopes: string[]; createdAt?: string } => {
  if (!scopeString) {
    return { scopes: ['read'] } // Default scope
  }

  try {
    const parsed = JSON.parse(scopeString)
    return {
      scopes: Array.isArray(parsed.scopes) ? parsed.scopes : ['read'],
      createdAt: parsed.createdAt,
    }
  } catch {
    return { scopes: ['read'] } // Fallback to default
  }
}
