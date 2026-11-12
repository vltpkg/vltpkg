import { defaultRegistries } from '@vltpkg/spec'

export const mirrorLimitMessage =
  "vlt's public npm mirror is a shared service with usage limits, and " +
  'this request went over them. Run `vlt setup` to use your vlt.io ' +
  "account's npm mirror (no usage limits), or set another registry " +
  'with `vlt config set registries.npm=<url>`.'

/**
 * Advice when a request to vlt's built-in public npm mirror went over
 * its usage limits (HTTP 429), otherwise `undefined`.
 *
 * After the retries, a 429 surfaces as a thrown error whose cause chain
 * holds the status code (undici's `RequestRetryError`) and the request
 * URL, so the chain is walked (a bounded number of hops).
 */
export const mirrorLimitAdvice = (
  err: unknown,
): string | undefined => {
  let limited = false
  let mirror = false
  try {
    let link: unknown = err
    for (let hop = 0; hop < 10 && isLink(link); hop++) {
      const { statusCode, status, response, url } = link
      if (
        statusCode === 429 ||
        status === 429 ||
        (isLink(response) && response.statusCode === 429)
      ) {
        limited = true
      }
      if (
        (typeof url === 'string' || url instanceof URL) &&
        String(url).startsWith(defaultRegistries.npm)
      ) {
        mirror = true
      }
      link = link.cause
    }
  } catch {
    return undefined
  }
  return limited && mirror ? mirrorLimitMessage : undefined
}

const isLink = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
