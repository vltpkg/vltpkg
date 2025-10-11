import { redirect } from 'react-router'
import { useAuthStore } from '@/state/auth.ts'
import { userContext } from '@/context/user.ts'

import type { MiddlewareFunction } from 'react-router'

/**
 * Auth middleware for protected routes
 * Checks if user is authenticated and sets user in context
 * Redirects to sign-in if not authenticated
 */
export const authMiddleware: MiddlewareFunction = async ({
  context,
}) => {
  /**
   * prefer to use the `getState` method for the auth store,
   * since React Router middleware execution is outside of React's component
   * lifecycle, and inside the Routers own context.
   */
  const { user, isSignedIn } = useAuthStore.getState()

  if (!user || !isSignedIn) {
    throw redirect('/auth/sign-in') // eslint-disable-line @typescript-eslint/only-throw-error
  }

  context.set(userContext, user)
}
