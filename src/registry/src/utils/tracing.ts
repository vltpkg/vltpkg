/**
 * Simple tracing utility for debugging and monitoring
 */

/**
 * Logs a trace message with timestamp
 * @param message - The message to log
 * @param data - Optional additional data to log
 */
export function trace(message: string, data?: any): void {
  const timestamp = new Date().toISOString()
  if (data) {
    console.log(`[TRACE ${timestamp}] ${message}`, data)
  } else {
    console.log(`[TRACE ${timestamp}] ${message}`)
  }
}

/**
 * Measures execution time of a function
 * @param name - Name of the operation being measured
 * @param fn - Function to measure
 * @returns Result of the function
 */
export async function measureTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    trace(`${name} completed in ${duration.toFixed(2)}ms`)
    return result
  } catch (error) {
    const duration = performance.now() - start
    trace(`${name} failed after ${duration.toFixed(2)}ms`, error)
    throw error
  }
}

/**
 * Session monitoring middleware for tracking requests with Sentry integration
 * @param c - The Hono context
 * @param next - The next middleware function
 */
export function sessionMonitor(c: any, next: any) {
  // Import Sentry dynamically to avoid issues if not available
  try {
    const Sentry = require('@sentry/cloudflare')

    if (c.session?.user) {
      Sentry.setUser({
        email: c.session.user.email,
      })
    }
    if (c.session?.projectId) {
      Sentry.setTag('project_id', c.session.projectId)
    }
  } catch (error) {
    // Sentry not available, continue without it
    trace('Sentry not available for session monitoring')
  }

  return next()
}
