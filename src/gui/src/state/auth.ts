import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Decoded JWT payload structure from Clerk
 */
interface JWTPayload {
  azp: string // Authorized party
  exp: number // Expiration time
  iat: number // Issued at
  iss: string // Issuer
  nbf: number // Not before
  sid: string // Session ID
  sts: string // Session status
  sub: string // Subject (user ID)
  fva?: [number, number] // Feature vector array
  // Custom claims from Clerk JWT template
  id?: string
  username?: string
  firstName?: string
  lastName?: string
  primaryEmail?: string
  verifiedEmail?: boolean
  avatarUrl?: string
}

/**
 * User information extracted from session
 */
export interface User {
  id: string // user_xxx
  sessionId: string // sess_xxx
  sessionToken?: string // JWT token
  firstName?: string
  lastName?: string
  fullName?: string
  username?: string
  email?: string
  imageUrl?: string
}

export type AuthState = {
  user: User | null
  isSignedIn: boolean
  isLoading: boolean
}

export type AuthAction = {
  setUser: (user: User) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
  initFromUrlParams: () => void
}

/**
 * Decode a JWT token payload (doesn't verify signature)
 */
const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    if (!payload) return null

    return JSON.parse(atob(payload)) as JWTPayload | null
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Extract user profile data from JWT custom claims
 */
const extractUserFromJWT = (decoded: JWTPayload): Partial<User> => {
  const firstName = decoded.firstName || ''
  const lastName = decoded.lastName || ''
  const fullName = `${firstName} ${lastName}`.trim() || undefined

  return {
    firstName: decoded.firstName,
    lastName: decoded.lastName,
    fullName,
    username: decoded.username,
    email: decoded.primaryEmail,
    imageUrl: decoded.avatarUrl,
  }
}

const initialState: AuthState = {
  user: null,
  isSignedIn: false,
  isLoading: true,
}

/**
 * Auth store for managing user session without Clerk React
 */
export const useAuthStore = create<AuthState & AuthAction>()(
  persist(
    set => ({
      ...initialState,

      setUser: (user: User) => {
        set({ user, isSignedIn: true, isLoading: false })
      },

      clearUser: () => {
        set({ user: null, isSignedIn: false, isLoading: false })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      /**
       * Initialize auth from URL parameters (from auth bridge redirect)
       */
      initFromUrlParams: () => {
        const params = new URLSearchParams(window.location.search)

        // Check if this is an auth bridge callback
        if (params.get('auth_bridge') !== 'true') {
          set({ isLoading: false })
          return
        }

        const sessionToken = params.get('session_token')
        const sessionId = params.get('session_id')
        const userId = params.get('user_id')

        if (sessionToken && sessionId && userId) {
          // Decode the JWT to get user profile from custom claims
          const decoded = decodeJWT(sessionToken)

          // Extract user profile data from JWT custom claims
          const profileData =
            decoded ? extractUserFromJWT(decoded) : {}

          const user: User = {
            id: userId,
            sessionId: sessionId,
            sessionToken: sessionToken,
            ...profileData, // Merge in the profile data from JWT
          }

          set({ user, isSignedIn: true, isLoading: false })

          // Clean up URL parameters (remove sensitive data from browser history)
          const cleanUrl = new URL(window.location.href)
          cleanUrl.searchParams.delete('session_token')
          cleanUrl.searchParams.delete('session_id')
          cleanUrl.searchParams.delete('user_id')
          cleanUrl.searchParams.delete('auth_bridge')
          window.history.replaceState({}, '', cleanUrl.toString())
        } else {
          console.warn(
            '⚠️  Auth bridge callback missing required parameters',
          )
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'vlt-auth-storage',
      // Only persist user data, not the token (for security)
      partialize: state => ({
        user:
          state.user ?
            {
              id: state.user.id,
              sessionId: state.user.sessionId,
              // Don't persist the JWT token
              firstName: state.user.firstName,
              lastName: state.user.lastName,
              fullName: state.user.fullName,
              username: state.user.username,
              email: state.user.email,
              imageUrl: state.user.imageUrl,
            }
          : null,
        isSignedIn: state.isSignedIn,
      }),
    },
  ),
)
