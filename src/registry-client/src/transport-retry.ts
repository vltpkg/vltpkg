/**
 * Retry policy shared by both transports. A leaf module on purpose: when
 * these lived in `transport.ts` — which imports the fetch backend, which
 * imports them back — the compiled binary evaluated the cycle in an order
 * that left the arrays empty, so nothing was ever retried and the first
 * dropped connection surfaced as a hard failure.
 */

/** transient failures worth another attempt */
export const retryErrorCodes = [
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTDOWN',
  'ENETDOWN',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'UND_ERR_SOCKET',
]

/** status codes undici's RetryAgent retries by default */
export const retryStatusCodes = [500, 502, 503, 504, 429]

/** methods safe to replay */
export const retryMethods = [
  'GET',
  'HEAD',
  'OPTIONS',
  'PUT',
  'DELETE',
  'TRACE',
]
