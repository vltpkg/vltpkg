import { setSignedCookie, getSignedCookie } from 'hono/cookie'
import { WorkOS } from '@workos-inc/node'
import type { HonoContext, WorkOSUser, WorkOSAuthResponse, WorkOSAuthResult } from '../../types.ts'

export async function requiresAuth(c: HonoContext, next: () => Promise<void>) {
  const workos = new WorkOS(c.env.WORKOS_API_KEY, {
    clientId: c.env.WORKOS_CLIENT_ID
  })

  try {
    const sessionData = await getSignedCookie(c, c.env.WORKOS_COOKIE_PASSWORD, 'wos')
    if (!sessionData) {
      return c.redirect('/?error=no_session')
    }

    const session = await workos.userManagement.loadSealedSession({
      sessionData,
      cookiePassword: c.env.WORKOS_COOKIE_PASSWORD,
    })

    const authResponse = await session.authenticate() as WorkOSAuthResponse

    if (authResponse.authenticated) {
      // User is authenticated and session data can be used
      const { sessionId, organizationId, role, permissions, user } = authResponse
      c.set('user', user)
      console.log('logged in user', user)
    } else {
      if (authResponse.reason === 'no_session_cookie_provided') {
        // Redirect the user to the login page
        return c.redirect('/?error=unauthorized')
      }
      return c.redirect('/?error=authentication_failed')
    }
  } catch (error) {
    console.error('Auth error:', error)
    return c.redirect('/?error=auth_error')
  }

  await next()
}

export async function handleLogin(c: HonoContext) {
  const workos = new WorkOS(c.env.WORKOS_API_KEY, {
    clientId: c.env.WORKOS_CLIENT_ID,
  })

  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: c.env.WORKOS_PROVIDER,
    redirectUri: c.env.WORKOS_REDIRECT_URI,
    clientId: c.env.WORKOS_CLIENT_ID,
  })

  return c.redirect(authorizationUrl)
}

export async function handleCallback(c: HonoContext) {
  const workos = new WorkOS(c.env.WORKOS_API_KEY, {
    clientId: c.env.WORKOS_CLIENT_ID,
  })

  const code = c.req.query('code')
  console.log('code', code)

  if (!code) {
    return c.redirect('/?error=no_code')
  }

  try {
    const res = await workos.userManagement.authenticateWithCode({
      code,
      clientId: c.env.WORKOS_CLIENT_ID,
      session: {
        sealSession: true,
        cookiePassword: c.env.WORKOS_COOKIE_PASSWORD
      }
    }) as WorkOSAuthResult

    console.log('res', res)

    if (!res.user) {
      return c.redirect('/?error=user_not_found')
    }

    console.log('user code', res.sealedSession)
    await setSignedCookie(c, 'wos', res.sealedSession, c.env.WORKOS_COOKIE_PASSWORD)

    return c.json({ user: res.user })
  } catch (error) {
    console.error('Callback error:', error)
    return c.redirect('/?error=code_error')
  }
}
