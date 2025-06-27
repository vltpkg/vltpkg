import type { HonoContext, ApiError } from '../../types.ts'

/**
 * JSON response handler middleware that formats JSON based on Accept headers
 * @returns {Function} Hono middleware function
 */
export function jsonResponseHandler() {
  return async (c: any, next: any) => {
    // Override the json method to handle formatting
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const originalJson = c.json.bind(c)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    c.json = (data: any, status?: number) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const acceptHeader = c.req.header('accept') || ''

      // If the client accepts the npm install format, return minimal JSON

      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        acceptHeader.includes('application/vnd.npm.install-v1+json')
      ) {
        // Use original json method for minimal output
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return originalJson(data, status)
      }

      // For other requests, return pretty-printed JSON
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      c.res = new Response(JSON.stringify(data, null, 2), {
        status: status || 200,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return c.res
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await next()
  }
}

/**
 * Creates a standardized JSON error response
 * @param {HonoContext} c - The Hono context
 * @param {string | ApiError} error - Error message or object
 * @param {number} [status] - HTTP status code
 * @returns {any} JSON error response
 */
export function jsonError(
  c: HonoContext,
  error: string | ApiError,
  status = 400,
) {
  const errorObj: ApiError =
    typeof error === 'string' ? { error } : error

  return c.json(errorObj, status as any)
}

/**
 * Creates a standardized JSON success response
 * @param {HonoContext} c - The Hono context
 * @param {any} data - Response data
 * @param {number} [status] - HTTP status code
 * @returns {any} JSON success response
 */
export function jsonSuccess(c: HonoContext, data: any, status = 200) {
  return c.json(data, status as any)
}

/**
 * Creates a 404 Not Found response
 * @param {HonoContext} c - The Hono context
 * @param {string} [message] - Optional custom message
 * @returns {any} 404 JSON response
 */
export function notFound(c: HonoContext, message = 'Not Found') {
  return jsonError(c, { error: message }, 404)
}

/**
 * Creates a 401 Unauthorized response
 * @param {HonoContext} c - The Hono context
 * @param {string} [message] - Optional custom message
 * @returns {any} 401 JSON response
 */
export function unauthorized(
  c: HonoContext,
  message = 'Unauthorized',
) {
  return jsonError(c, { error: message }, 401)
}

/**
 * Creates a 403 Forbidden response
 * @param {HonoContext} c - The Hono context
 * @param {string} [message] - Optional custom message
 * @returns {any} 403 JSON response
 */
export function forbidden(c: HonoContext, message = 'Forbidden') {
  return jsonError(c, { error: message }, 403)
}

/**
 * Creates a 500 Internal Server Error response
 * @param {HonoContext} c - The Hono context
 * @param {string} [message] - Optional custom message
 * @returns {any} 500 JSON response
 */
export function internalServerError(
  c: HonoContext,
  message = 'Internal Server Error',
) {
  return jsonError(c, { error: message }, 500)
}
