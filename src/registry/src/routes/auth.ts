import { setSignedCookie, getSignedCookie } from 'hono/cookie'
import { WorkOS } from '@workos-inc/node'
import type {
  HonoContext,
  WorkOSAuthResponse,
  WorkOSAuthResult,
} from '../../types.ts'

// Define interfaces for WorkOS session data
interface WorkOSSession {
  authenticate(): Promise<WorkOSAuthResponse>
}

export async function requiresAuth(
  c: HonoContext,
  next: () => Promise<void>,
) {
  const workosApiKey = c.env.WORKOS_API_KEY as string
  const workosClientId = c.env.WORKOS_CLIENT_ID as string
  const workos = new WorkOS(workosApiKey, {
    clientId: workosClientId,
  })

  try {
    const sessionData = await getSignedCookie(
      c,
      c.env.WORKOS_COOKIE_PASSWORD as string,
      'wos',
    )
    if (!sessionData) {
      return c.redirect('/?error=no_session')
    }

    const session = workos.userManagement.loadSealedSession({
      sessionData,
      cookiePassword: c.env.WORKOS_COOKIE_PASSWORD as string,
    }) as WorkOSSession

    const authResponse = await session.authenticate()

    if (authResponse.authenticated) {
      // User is authenticated and session data can be used
      const { sessionId: _sessionId, organizationId: _organizationId, role: _role, permissions: _permissions, user } =
        authResponse
      c.set('user', user)
      // Hono middleware will log user authentication
    } else {
      if (authResponse.reason === 'no_session_cookie_provided') {
        // Redirect the user to the login page
        return c.redirect('/?error=unauthorized')
      }
      return c.redirect('/?error=authentication_failed')
    }
  } catch (_error) {
    // Hono middleware will log authentication errors
    return c.redirect('/?error=auth_error')
  }

  await next()
}

export async function handleLogin(c: HonoContext) {
  const workosApiKey = c.env.WORKOS_API_KEY as string
  const workosClientId = c.env.WORKOS_CLIENT_ID as string
  const workos = new WorkOS(workosApiKey, {
    clientId: workosClientId,
  })

  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: c.env.WORKOS_PROVIDER as string,
    redirectUri: c.env.WORKOS_REDIRECT_URI as string,
    clientId: workosClientId,
  })

  return c.redirect(authorizationUrl)
}

export async function handleCallback(c: HonoContext) {
  const workosApiKey = c.env.WORKOS_API_KEY as string
  const workosClientId = c.env.WORKOS_CLIENT_ID as string
  const workos = new WorkOS(workosApiKey, {
    clientId: workosClientId,
  })

  const code = c.req.query('code')
  // Hono middleware will log callback code information

  if (!code) {
    return c.redirect('/?error=no_code')
  }

  try {
    const res = await workos.userManagement.authenticateWithCode({
      code,
      clientId: workosClientId,
      session: {
        sealSession: true,
        cookiePassword: c.env.WORKOS_COOKIE_PASSWORD as string,
      },
    })

    // Hono middleware will log authentication result

    // Validate response has required properties
    const authResult = res as WorkOSAuthResult
    
    // Hono middleware will log sealed session information
    await setSignedCookie(
      c,
      'wos',
      authResult.sealedSession,
      c.env.WORKOS_COOKIE_PASSWORD as string,
    )

    return c.json({ user: authResult.user })
  } catch (_error) {
    // Hono middleware will log callback errors
    return c.redirect('/?error=code_error')
  }
}
