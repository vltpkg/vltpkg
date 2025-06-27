import type { HonoContext, ApiError } from '../../types.ts'

/**
 * JSON response handler middleware that formats JSON based on Accept headers
 * @returns Hono middleware function
 */
export function jsonResponseHandler() {
  return async (c: any, next: any) => {
    // Override the json method to handle formatting
    const originalJson = c.json.bind(c)

    c.json = (data: any, status?: number) => {
      const acceptHeader = c.req.header('accept') || ''

      // If the client accepts the npm install format, return minimal JSON
      if (acceptHeader.includes('application/vnd.npm.install-v1+json')) {
        // Use original json method for minimal output
        return originalJson(data, status)
      }

      // For other requests, return pretty-printed JSON
      const prettyJson = JSON.stringify(data, null, 2)
      c.res = new Response(prettyJson, {
        status: status || 200,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
      })
      return c.res
    }

    await next()
  }
}

/**
 * Creates a standardized JSON error response
 * @param c - The Hono context
 * @param error - Error message or object
 * @param status - HTTP status code
 * @returns JSON error response
 */
export function jsonError(c: HonoContext, error: string | ApiError, status: number = 400) {
  const errorObj: ApiError = typeof error === 'string'
    ? { error }
    : error

  return c.json(errorObj, status as any)
}

/**
 * Creates a standardized JSON success response
 * @param c - The Hono context
 * @param data - Response data
 * @param status - HTTP status code
 * @returns JSON success response
 */
export function jsonSuccess(c: HonoContext, data: any, status: number = 200) {
  return c.json(data, status as any)
}

/**
 * Creates a 404 Not Found response
 * @param c - The Hono context
 * @param message - Optional custom message
 * @returns 404 JSON response
 */
export function notFound(c: HonoContext, message: string = 'Not Found') {
  return jsonError(c, { error: message }, 404)
}

/**
 * Creates a 401 Unauthorized response
 * @param c - The Hono context
 * @param message - Optional custom message
 * @returns 401 JSON response
 */
export function unauthorized(c: HonoContext, message: string = 'Unauthorized') {
  return jsonError(c, { error: message }, 401)
}

/**
 * Creates a 403 Forbidden response
 * @param c - The Hono context
 * @param message - Optional custom message
 * @returns 403 JSON response
 */
export function forbidden(c: HonoContext, message: string = 'Forbidden') {
  return jsonError(c, { error: message }, 403)
}

/**
 * Creates a 500 Internal Server Error response
 * @param c - The Hono context
 * @param message - Optional custom message
 * @returns 500 JSON response
 */
export function internalServerError(c: HonoContext, message: string = 'Internal Server Error') {
  return jsonError(c, { error: message }, 500)
}
