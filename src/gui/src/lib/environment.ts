/**
 * Determines if the app is running in a hosted environment (e.g., Vercel)
 * vs locally with a GUI server endpoint.
 *
 * Detection strategy:
 * 1. Check for explicit environment variable (if set during build)
 * 2. Check if hostname is localhost/127.0.0.1
 * 3. Check if running on standard local dev ports
 */

export const isHostedEnvironment = (): boolean => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return false
  }

  const hostname = window.location.hostname
  const port = window.location.port

  // Explicit check for local development
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')

  // Check for common local development ports (7018 is the GUI server port)
  const isLocalPort =
    port === '7018' ||
    port === '3000' ||
    port === '5173' ||
    port === '8080' ||
    port === '4200'

  // If it's localhost or local port, it's NOT hosted
  if (isLocalhost || isLocalPort) {
    return false
  }

  // If we're on a production domain or no port is specified (typical for hosted)
  // then we're in a hosted environment
  return true
}

/**
 * Check if local GUI server features are available
 * (file system operations, config management, etc.)
 */
export const hasLocalServerFeatures = (): boolean => {
  return !isHostedEnvironment()
}

/**
 * Get a display-friendly environment name
 */
export const getEnvironmentName = (): 'local' | 'hosted' => {
  return isHostedEnvironment() ? 'hosted' : 'local'
}
