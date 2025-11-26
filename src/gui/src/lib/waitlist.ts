export type JoinWaitlistState = {
  state: 'error' | 'success'
  message: string
} | null

export type JoinWaitlistData = {
  email: string
  subscribe?: boolean
}

/**
 * Basic email validation
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Submits a waitlist form to the vlt signup endpoint
 */
export const joinWaitlist = async (
  data: JoinWaitlistData,
): Promise<JoinWaitlistState> => {
  // Basic validation
  if (!data.email || !isValidEmail(data.email)) {
    return {
      state: 'error' as const,
      message: 'Please enter a valid email address',
    }
  }

  try {
    const response = await fetch('https://signup.vlt.sh', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        subscribe: data.subscribe,
      }),
    })

    if (!response.ok) {
      return {
        state: 'error' as const,
        message: 'Failed to join waitlist. Please try again.',
      }
    }

    return {
      state: 'success' as const,
      message: 'Successfully joined the waitlist!',
    }
  } catch (error) {
    // Check if it's a CORS error (common in development)
    if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      return {
        state: 'error' as const,
        message:
          'Connection failed. This may be due to CORS restrictions when running locally.',
      }
    }

    return {
      state: 'error' as const,
      message: 'Network error. Please try again.',
    }
  }
}
