import { error } from '@vltpkg/error-cause'
import { STATUS_CODES } from 'node:http'

/**
 * The parts of a `CacheEntry` these helpers need.
 *
 * Deliberately narrow and structural rather than `CacheEntry` itself:
 * `RegistryClient.prototype.request` is duck-typed in a dozen tests, and a
 * helper that every command calls must not be the thing that makes those
 * mocks illegal. `text` is optional for the same reason.
 */
export type ErrorResponse = {
  statusCode: number
  text?: () => string
  [k: number | string | symbol]: any
}

/** longest registry-supplied detail spliced into an error message */
const MAX_DETAIL_LENGTH = 512

const truncate = (s: string) =>
  s.length <= MAX_DETAIL_LENGTH ?
    s
  : `${s.slice(0, MAX_DETAIL_LENGTH - 1)}…`

// A proxy or CDN standing in front of the registry answers with an HTML
// error page. The tags are noise; the text inside them occasionally is
// not, so strip rather than discard.
const isHTML = (s: string) =>
  /^\s*(<!doctype\s+html|<html\b)/i.test(s)

const stripTags = (s: string) =>
  s
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// npm writes `{"error":"..."}`; the `-/npm/v1/*` endpoints and several
// third-party registries write `{"message":"..."}`; a few nest it under
// `error.message`.
const detailFromJSON = (text: string): string | undefined => {
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    // A non-JSON body is itself the most useful detail.
    return undefined
  }
  if (!body || typeof body !== 'object') return undefined
  const rec = body as Record<string, unknown>
  const nested = rec.error as Record<string, unknown> | undefined
  for (const v of [rec.error, rec.message, nested?.message]) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

/**
 * Format a non-2xx registry response as `"403 Forbidden — <detail>"`,
 * where the detail is whatever the registry actually said.
 *
 * Falls back to the bare status when the body is empty or cannot be
 * decoded, and to the raw body text when it is not JSON.
 */
export const registryErrorMessage = (
  response: ErrorResponse,
): string => {
  const statusMessage = STATUS_CODES[response.statusCode]
  const status = `${response.statusCode}${statusMessage ? ` ${statusMessage}` : ''}`

  let text: string
  try {
    text = response.text?.().trim() ?? ''
  } catch {
    // an undecodable body (bad gzip) tells us nothing extra
    return status
  }
  if (!text) return status

  const detail =
    detailFromJSON(text) ?? (isHTML(text) ? stripTags(text) : text)
  return detail ? `${status} — ${truncate(detail)}` : status
}

export type AssertOkOptions = {
  /** what we were trying to do, eg `'Failed to list dist-tags'` */
  message: string
  /** the url that was requested */
  url: URL | string
  /** the method used; defaults to GET */
  method?: string
  /**
   * Status-specific guidance appended to the message. Only consulted
   * when the response is an error.
   */
  advice?: (statusCode: number) => string | undefined
}

/**
 * Throw a well-formed, user-facing error when a registry response is not
 * a 2xx.
 *
 * `RegistryClient.request()` resolves for every status the registry
 * answers with -- checking is the caller's job. This is that check.
 *
 * 401 and 403 become `ENEEDAUTH`, everything else `EREQUEST`. Both are
 * codes `printErr` renders as a short, actionable message; an error with
 * no code at all falls through to a full `util.inspect` dump and an "open
 * an issue" footer, which is how a routine 403 ends up reported to the
 * user as a vlt bug.
 */
export const assertOk = (
  response: ErrorResponse,
  { message, url, method = 'GET', advice }: AssertOkOptions,
): void => {
  const { statusCode } = response
  // NOT `statusCode >= 200 && statusCode < 300`: duck-typed responses
  // that omit statusCode must stay non-errors, and this matches every
  // hand-rolled check it replaces.
  if (!(statusCode < 200 || statusCode >= 300)) return

  const denied = statusCode === 401 || statusCode === 403
  const extra = advice?.(statusCode)
  throw error(
    `${message}: ${registryErrorMessage(response)}${extra ? `\n⚠️ ${extra}` : ''}`,
    {
      code: denied ? 'ENEEDAUTH' : 'EREQUEST',
      url,
      method,
      status: statusCode,
      response,
    },
    assertOk,
  )
}
