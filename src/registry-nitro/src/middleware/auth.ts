import { getRequestHeader, HTTPError } from 'h3'
import type { H3Event, EventHandler } from 'h3'
import { verifyToken } from '../handlers/auth.ts'

/**
 * Extract bearer token from Authorization header
 */
const extractToken = (event: H3Event): string | null => {
  const authHeader = getRequestHeader(event, 'authorization')

  if (!authHeader) {
    return null
  }

  // Support "Bearer <token>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (match) {
    return match[1]
  }

  // Also support plain token for backwards compatibility
  return authHeader
}

/**
 * Authentication middleware for protected routes
 * Verifies the token and attaches user info to the event context
 */
export const requireAuth = (handler: EventHandler): EventHandler => {
  return async (event: H3Event) => {
    const token = extractToken(event)

    if (!token) {
      throw new HTTPError('Authentication required', { status: 401 })
    }

    const tokenRecord = await verifyToken(token)

    if (!tokenRecord) {
      throw new HTTPError('Invalid or expired token', { status: 401 })
    }

    // Attach user info to event context for use in handlers
    event.context.auth = {
      token: tokenRecord.token,
      userId: tokenRecord.uuid,
      scope: tokenRecord.scope,
    }

    return handler(event)
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuth = (handler: EventHandler): EventHandler => {
  return async (event: H3Event) => {
    const token = extractToken(event)

    if (token) {
      const tokenRecord = await verifyToken(token)
      if (tokenRecord) {
        event.context.auth = {
          token: tokenRecord.token,
          userId: tokenRecord.uuid,
          scope: tokenRecord.scope,
        }
      }
    }

    return handler(event)
  }
}
