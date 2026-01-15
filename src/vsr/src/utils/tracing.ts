/**
 * Simple tracing utility for debugging and monitoring
 */

/**
 * Logs a trace message with timestamp
 * @param {string} _message - The message to log
 * @param {any} _data - Optional additional data to log
 */
export function trace(_message: string, _data?: any): void {
  // Tracing disabled for production
}

/**
 * Measures execution time of a function
 * @param {string} name - Name of the operation being measured
 * @param {() => Promise<any>} fn - Function to measure
 * @returns {Promise<any>} Result of the function
 */
export async function measureTime<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
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
 * Session monitoring middleware for tracking requests
 * @param {any} _c - The Hono context
 * @param {() => Promise<void>} next - The next middleware function
 * @returns {Promise<void>} Result of next middleware
 */
export function sessionMonitor(
  _c: any,
  next: () => Promise<void>,
): Promise<void> {
  // Session monitoring is currently disabled
  // This middleware can be extended to add session tracking functionality
  trace('Session monitoring middleware called')

  return next()
}
