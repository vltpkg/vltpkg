import { setTimeout } from 'node:timers/promises'
import type { RetryHandler } from 'undici'

type RetryError = Error & {
  code?: string
  statusCode?: number
  headers?: Record<string, string | string[] | undefined>
}

/**
 * undici's default retry policy, but aborting the request ends the wait
 * between attempts, so a long Retry-After can't keep the process alive
 */
export const retry: RetryHandler.RetryCallback = (
  err,
  { state: { counter }, opts },
  cb,
) => {
  const { code, statusCode, headers } = err as RetryError
  const { method } = opts
  // request options, which the dispatch options type leaves out
  const { signal } = opts as { signal?: unknown }
  // undici fills in every default
  const {
    maxRetries,
    minTimeout,
    maxTimeout,
    timeoutFactor,
    methods,
    statusCodes,
    errorCodes,
  } = opts.retryOptions as Required<RetryHandler.RetryOptions>
  if (
    (code &&
      code !== 'UND_ERR_REQ_RETRY' &&
      !errorCodes.includes(code)) ||
    !methods.includes(method) ||
    (typeof statusCode === 'number' &&
      !statusCodes.includes(statusCode)) ||
    counter > maxRetries
  ) {
    cb(err)
    return
  }
  const ra = String(headers?.['retry-after'] ?? '')
  const secs = Number(ra)
  const after =
    Number.isNaN(secs) ? Date.parse(ra) - Date.now() : secs * 1000
  const wait = Math.min(
    after > 0 ? after : minTimeout * timeoutFactor ** (counter - 1),
    maxTimeout,
  )
  setTimeout(wait, null, {
    signal: signal instanceof AbortSignal ? signal : undefined,
  }).then(
    () => cb(null),
    (er: unknown) => cb(er as Error),
  )
}
