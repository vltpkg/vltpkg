import {
  eventHandler,
  getQuery,
  getRouterParam,
  HTTPError,
  setResponseStatus,
  sendRedirect,
} from 'h3'
import { drizzle } from 'drizzle-orm/libsql'
import type { EventHandler } from 'h3'
import { useDatabase } from 'nitro/runtime'
import { randomBytes } from 'node:crypto'
import * as Schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
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

/**
 * Get database instance based on environment
 */
const getDb = (): LibSQLDatabase | DrizzleD1Database => {
  const db = useDatabase('default')
  console.log(db)
  return drizzle(db)
}

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

    // Check if we have a Clerk session token
    const clerkSessionToken = query.clerk_token as string | undefined

    if (!clerkSessionToken) {
      // Redirect to Clerk login
      // You'll need to set up Clerk with proper redirect URLs
      const protocol =
        event.node?.req.headers['x-forwarded-proto'] || 'http'
      const host = event.node?.req.headers.host || 'localhost:3000'
      const redirectUrl = `${protocol}://${host}/-/v1/login/callback?sessionId=${sessionId}`

      // For now, return HTML that redirects to Clerk
      // In production, you'd integrate Clerk's frontend components
      return `
<!DOCTYPE html>
<html>
<head>
  <title>Login to Registry</title>
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
    h1 { margin: 0 0 1rem 0; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Authenticate to Registry</h1>
    <p>You'll be redirected to complete authentication...</p>
    <p><small>Session ID: ${sessionId}</small></p>
  </div>
  <script>
    // TODO: Integrate Clerk's authentication flow here
    // For now, this is a placeholder
    console.log('Redirecting to Clerk authentication');
    console.log('Redirect URL:', '${redirectUrl}');
  </script>
</body>
</html>
      `
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
 * Verify authentication token
 * Used by middleware to check if a request is authenticated
 */
export const verifyToken = async (
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
