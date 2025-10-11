import { useEffect } from 'react'
import { useAuth } from '@/components/hooks/use-auth.tsx'
import { useNavigate } from 'react-router'

export const SignIn = () => {
  const { signIn, isSignedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // If already signed in, redirect to home
    if (isSignedIn) {
      void navigate('/', { replace: true })
    } else {
      // Otherwise, redirect to Clerk via auth bridge
      signIn()
    }
  }, [isSignedIn, signIn, navigate])

  return (
    <section className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">
          Redirecting to sign in...
        </h2>
        <div className="mx-auto mt-4 h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white" />
      </div>
    </section>
  )
}
