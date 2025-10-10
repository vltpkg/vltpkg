import {
  eventHandler,
  getQuery,
  getRouterParam,
  HTTPError,
  setResponseStatus,
  sendRedirect,
} from 'h3'
import type { EventHandler } from 'h3'
import { randomBytes } from 'node:crypto'
import * as Schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/libsql.ts'
import {
  verifyClerkJWT,
  getUserScopes,
  generateScopeString,
} from '../utils/clerk-integration.ts'

const SESSION_EXPIRY = 1000 * 60 * 10 // 10 minutes
const TOKEN_EXPIRY = 1000 * 60 * 60 * 24 * 365 // 1 year

/**
 * Generate a cryptographically secure random token
 */
const generateToken = (): string => {
  return randomBytes(32).toString('hex')
}

/**
 * Generate a session ID
 */
const generateSessionId = (): string => {
  return randomBytes(16).toString('hex')
}

// Database instance is imported from ../db/libsql.ts

/**
 * Initiate login flow
 * POST /-/v1/login
 * Body: { hostname?: string }
 * Query: { doneUrl?: string }
 *
 * Returns: { loginUrl: string, doneUrl: string }
 */
export const loginInitHandler: EventHandler = eventHandler(
  async event => {
    const query = getQuery(event)
    const doneUrl = query.doneUrl as string | undefined

    // Generate a unique session ID
    const sessionId = generateSessionId()
    const now = Date.now()

    // Store the session in database
    const db = getDb()
    await db.insert(Schema.loginSessions).values({
      sessionId,
      token: null,
      clerkUserId: null,
      doneUrl: doneUrl || null,
      created: now,
      expires: now + SESSION_EXPIRY,
    })

    // Get the base URL for callbacks
    const protocol =
      event.node?.req.headers['x-forwarded-proto'] || 'http'
    const host = event.node?.req.headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    // Build Clerk OAuth URL
    const authUrl = new URL(`${baseUrl}/-/v1/login/callback`)
    authUrl.searchParams.set('sessionId', sessionId)

    // Return the URL the CLI should open
    return {
      loginUrl: authUrl.toString(),
      doneUrl:
        doneUrl ||
        `${baseUrl}/-/v1/login/done?sessionId=${sessionId}`,
    }
  },
)

/**
 * Clerk callback handler - User completes auth via Clerk
 * GET /-/v1/login/callback?sessionId=xxx
 *
 * This endpoint presents the Clerk login UI and processes the auth
 */
export const loginCallbackHandler: EventHandler = eventHandler(
  async event => {
    const query = getQuery(event)
    const sessionId = query.sessionId as string

    if (!sessionId) {
      throw new HTTPError('Missing sessionId', { status: 400 })
    }

    // Get the session from database
    const db = getDb()
    const [session] = await db
      .select()
      .from(Schema.loginSessions)
      .where(eq(Schema.loginSessions.sessionId, sessionId))
      .limit(1)

    if (!session) {
      throw new HTTPError('Invalid or expired session', {
        status: 404,
      })
    }

    // Check if session is expired
    if (Date.now() > Number(session.expires)) {
      throw new HTTPError('Session expired', { status: 401 })
    }

    // Check if we have a Clerk session token (after authentication)
    const clerkSessionToken = query.clerk_token as string | undefined

    if (!clerkSessionToken) {
      // No token yet - redirect directly to Clerk authentication
      const protocol =
        event.node?.req.headers['x-forwarded-proto'] || 'http'
      const host = event.node?.req.headers.host || 'localhost:3000'
      const callbackUrl = `${protocol}://${host}/-/v1/login/callback?sessionId=${sessionId}`

      // Build Clerk login URL with redirect back to our callback
      const clerkLoginUrl = new URL('https://accounts.vlt.io/sign-in')
      clerkLoginUrl.searchParams.set('redirect_url', callbackUrl)

      // Redirect directly to Clerk
      return sendRedirect(event, clerkLoginUrl.toString())
    }

    // Verify the Clerk session token
    try {
      // Verify the token with Clerk and get user info
      const clerkUser = await verifyClerkJWT(clerkSessionToken)

      // Get user scopes based on Clerk user data
      const scopes = await getUserScopes({
        id: clerkUser.sub,
        emailAddresses:
          clerkUser.email ? [{ emailAddress: clerkUser.email }] : [],
      })

      // Generate a registry token
      const token = generateToken()
      const now = Date.now()

      // Store the token with scopes
      await db.insert(Schema.tokens).values({
        token,
        uuid: clerkUser.sub, // Clerk user ID
        scope: generateScopeString(scopes),
        created: now,
        expires: now + TOKEN_EXPIRY,
      })

      // Update the session with the token
      await db
        .update(Schema.loginSessions)
        .set({
          token,
          clerkUserId: clerkUser.sub,
        })
        .where(eq(Schema.loginSessions.sessionId, sessionId))

      // Redirect to done URL if provided, otherwise show success page
      if (session.doneUrl) {
        return sendRedirect(event, session.doneUrl)
      }

      return `
<!DOCTYPE html>
<html>
<head>
  <title>Login Successful</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
    }
    .success { color: #22c55e; font-size: 3rem; }
    h1 { margin: 0 0 1rem 0; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓</div>
    <h1>Login Successful</h1>
    <p>You can now close this window and return to the CLI.</p>
  </div>
</body>
</html>
      `
    } catch (error) {
      throw new HTTPError('Invalid authentication token', {
        status: 401,
        cause: error,
      })
    }
  },
)

/**
 * Poll for login completion
 * GET /-/v1/login/poll/:sessionId
 *
 * Returns: { token: string } when ready, or 404 if not ready yet
 */
export const loginPollHandler: EventHandler = eventHandler(
  async event => {
    const sessionId = getRouterParam(event, 'sessionId')

    if (!sessionId) {
      throw new HTTPError('Missing sessionId', { status: 400 })
    }

    // Get the session from database
    const db = getDb()
    const [session] = await db
      .select()
      .from(Schema.loginSessions)
      .where(eq(Schema.loginSessions.sessionId, sessionId))
      .limit(1)

    if (!session) {
      throw new HTTPError('Invalid or expired session', {
        status: 404,
      })
    }

    // Check if session is expired
    if (Date.now() > Number(session.expires)) {
      throw new HTTPError('Session expired', { status: 401 })
    }

    // If token is not ready yet, return 404 (CLI will keep polling)
    if (!session.token) {
      setResponseStatus(event, 404)
      return { error: 'Login not complete yet' }
    }

    // Return the token
    return {
      token: session.token,
      userId: session.clerkUserId,
    }
  },
)

/**
 * Login completion endpoint
 * GET /-/v1/login/done?sessionId=xxx
 *
 * Returns JSON response for npm client after authentication
 */
export const loginDoneHandler: EventHandler = eventHandler(
  async event => {
    const query = getQuery(event)
    const sessionId = query.sessionId as string

    if (!sessionId) {
      throw new HTTPError('Missing sessionId', { status: 400 })
    }

    // Check if the session exists and has a token
    const db = getDb()
    const [session] = await db
      .select()
      .from(Schema.loginSessions)
      .where(eq(Schema.loginSessions.sessionId, sessionId))
      .limit(1)

    if (!session) {
      throw new HTTPError('Invalid or expired session', {
        status: 404,
      })
    }

    // Check if session is expired
    if (Date.now() > Number(session.expires)) {
      throw new HTTPError('Session expired', { status: 401 })
    }

    // If token is not ready yet, return pending status
    if (!session.token) {
      setResponseStatus(event, 202) // Accepted but not complete
      return {
        message: 'Authentication in progress',
        status: 'pending',
      }
    }

    // Return success with token info
    return {
      message: 'Authentication successful',
      status: 'complete',
      token: session.token,
      userId: session.clerkUserId,
    }
  },
)
