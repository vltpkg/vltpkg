import { HTTPError } from 'h3'
import type { H3Event, EventHandler } from 'h3'
import * as Schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/libsql.ts'

/**
 * Extract bearer token from Authorization header
 */
const extractToken = (event: H3Event): string | null => {
  const authHeader = event.res.headers.get('authorization')

  if (!authHeader) {
    return null
  }

  // Support "Bearer <token>" format
  const match = /^Bearer\s+(.+)$/i.exec(authHeader)
  if (match) {
    return match[1]!
  }

  // Also support plain token for backwards compatibility
  return authHeader
}

/**
 * Verify authentication token
 * Used by middleware to check if a request is authenticated
 */
const verifyToken = async (
  token: string,
): Promise<Schema.Token | null> => {
  const db = getDb()
  const [tokenRecord] = await db
    .select()
    .from(Schema.tokens)
    .where(eq(Schema.tokens.token, token))
    .limit(1)

  if (!tokenRecord) {
    return null
  }

  // Check if token is expired
  if (
    tokenRecord.expires &&
    Date.now() > Number(tokenRecord.expires)
  ) {
    return null
  }

  return tokenRecord
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
