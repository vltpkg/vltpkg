import { redirect } from 'react-router'
import { useAuthStore } from '@/state/auth.ts'
import { userContext } from '@/context/user.ts'
import { isHostedEnvironment } from '@/lib/environment.ts'

import type { MiddlewareFunction } from 'react-router'

/**
 * Auth middleware for protected routes
 * Only enforces authentication in hosted environments
 * In local mode, authentication is optional
 * Redirects to sign-in if not authenticated (hosted mode only)
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

  // Only require authentication in hosted mode
  // Local mode doesn't require auth
  if (isHostedEnvironment()) {
    if (!user || !isSignedIn) {
      throw redirect('/auth/sign-in') // eslint-disable-line @typescript-eslint/only-throw-error
    }
  }

  // Set user in context if available (optional in local mode)
  if (user && isSignedIn) {
    context.set(userContext, user)
  }
}
