import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/state/auth.ts'

/**
 * Hook for auth state and actions
 * Automatically initializes auth from URL params on mount
 */
export const useAuth = () => {
  const user = useAuthStore(state => state.user)
  const isSignedIn = useAuthStore(state => state.isSignedIn)
  const isLoading = useAuthStore(state => state.isLoading)
  const setUser = useAuthStore(state => state.setUser)
  const clearUser = useAuthStore(state => state.clearUser)
  const initFromUrlParams = useAuthStore(
    state => state.initFromUrlParams,
  )

  // Use ref to ensure initialization only happens once
  const hasInitialized = useRef(false)

  // Initialize auth from URL params on mount (only once)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      initFromUrlParams()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    clearUser()
    // Redirect to home page
    window.location.href = '/'
  }

  const signIn = () => {
    // Redirect to Clerk via auth bridge
    const origin = window.location.origin
    const clerkUrl = `https://accounts.vlt.io/sign-in?redirect_uri=${encodeURIComponent(`https://auth.vlt.io/exchange?return_to=${encodeURIComponent(window.location.hostname)}?redirect_uri=${encodeURIComponent(origin)}`)}`
    window.location.href = clerkUrl
  }

  return {
    user,
    isSignedIn,
    isLoggedIn: isSignedIn, // Alias for convenience
    isLoading,
    signIn,
    signOut,
    setUser,
    clearUser,
  }
}
