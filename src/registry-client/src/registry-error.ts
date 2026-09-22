import { error } from '@vltpkg/error-cause'
import { asError, isObject } from '@vltpkg/types'
import { STATUS_CODES } from 'node:http'
import { normalizeRegistryKey } from './registry-key.ts'

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

const parseBody = (
  text: string,
): Record<string, unknown> | undefined => {
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    // A non-JSON body is itself the most useful detail.
    return undefined
  }
  return !body || typeof body !== 'object' ?
      undefined
    : (body as Record<string, unknown>)
}

// npm writes `{"error":"..."}`; the `-/npm/v1/*` endpoints and several
// third-party registries write `{"message":"..."}`; a few nest it under
// `error.message`.
const detailFromJSON = (text: string): string | undefined => {
  const rec = parseBody(text)
  if (!rec) return undefined
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

/**
 * What a vlt registry calls the two 401s a client can resolve on its own.
 * Nothing else tells them apart from a rejected credential.
 */
const refusalCodes: Record<string, TokenRefusal['condition']> = {
  TokenExpiredError: 'expired',
  TokenRevokedError: 'revoked',
}

/** vlt.io account and organization slugs, as the registry mints them. */
const accountSlug = /^(?=.{3,63}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

// Registries that send no `code` -- third parties, and any vlt origin that
// predates the codes -- say it in the message.
const saysExpired = /\btokens? (?:has |have )?expired\b/i
const saysRevoked =
  /\btokens? (?:was |were |has been |have been )?revoked\b/i

/** How `VLT_TOKEN_*` variables spell a registry key. */
const mangleKey = (key: string) => key.replace(/[^a-zA-Z0-9]+/g, '_')

const underKey = (key: string, registryKey: string) =>
  key === registryKey || key.startsWith(registryKey + '/')

/**
 * The environment variable that supplied the token for `url`, if one did,
 * mirroring the env-var half of `getToken()` in `./auth.ts`.
 *
 * A variable names its registry in a mangled key, and mangling is lossy, so the
 * name is compared against the mangled URL; that also matches a request under a
 * registry the variable names.
 */
const envTokenVar = (url: URL): string | undefined => {
  const key = normalizeRegistryKey(url.href)
  const envRegistry = process.env.VLT_REGISTRY
  try {
    if (
      process.env.VLT_TOKEN &&
      envRegistry &&
      underKey(key, normalizeRegistryKey(envRegistry))
    ) {
      return 'VLT_TOKEN'
    }
  } catch {
    // a VLT_REGISTRY that is not a url supplies no token, and must not
    // replace the error being reported with a parse failure
  }
  const mangled = mangleKey(key)
  const prefix = 'VLT_TOKEN_'
  for (const [name, value] of Object.entries(process.env)) {
    if (!value || !name.startsWith(prefix)) continue
    if (mangled.startsWith(mangleKey(name.slice(prefix.length)))) {
      return name
    }
  }
  return undefined
}

/**
 * The parts of a response {@link tokenRefusalAdvice} reads. Looser than
 * {@link ErrorResponse}, which a `node:http` message off an error's cause bag
 * does not satisfy: that type leaves `statusCode` optional.
 */
export type RefusalCandidate = {
  statusCode?: number
  text?: () => string
}

/** A token the registry says is dead, and whether a vlt registry said so. */
export type TokenRefusal = {
  condition: 'expired' | 'revoked'
  vlt: boolean
}

const tokenRefusal = (
  response?: RefusalCandidate,
): TokenRefusal | undefined => {
  if (response?.statusCode !== 401) return undefined
  let text: string
  try {
    text = response.text?.().trim() ?? ''
  } catch {
    // an undecodable body (bad gzip) says nothing either way
    return undefined
  }
  if (!text) return undefined
  const code = parseBody(text)?.code
  const named =
    typeof code === 'string' ? refusalCodes[code] : undefined
  if (named) return { condition: named, vlt: true }
  const detail = detailFromJSON(text) ?? text
  if (saysExpired.test(detail))
    return { condition: 'expired', vlt: false }
  if (saysRevoked.test(detail))
    return { condition: 'revoked', vlt: false }
  return undefined
}

/** Whether a response says the credential it refused is expired or revoked. */
export const isTokenRefusal = (
  response?: RefusalCandidate,
): boolean => tokenRefusal(response) !== undefined

/**
 * What to do about a 401 whose body says the token is expired or revoked, or
 * `undefined` for every other response. Which command fixes it depends on where
 * the token came from: an environment variable, a vlt.io account registry, or
 * anything else.
 */
export const tokenRefusalAdvice = (
  response?: RefusalCandidate,
  url?: URL | string,
): string | undefined => {
  const refusal = tokenRefusal(response)
  if (!refusal || url === undefined) return undefined
  const gone =
    refusal.condition === 'expired' ? 'has expired' : 'was revoked'
  let u: URL
  try {
    u = new URL(String(url))
  } catch {
    return undefined
  }

  const env = envTokenVar(u)
  if (env) {
    return (
      `The token for ${u.origin} comes from $${env}, and it ${gone}. ` +
      `Create a new token${refusal.vlt ? ' in the vlt.io dashboard' : ''} ` +
      `and set $${env} to it.`
    )
  }

  // `/<account>/<registry>/...` on a vlt registry, which only `code` identifies:
  // the host varies by environment.
  const [account, registry] = u.pathname.slice(1).split('/')
  if (
    refusal.vlt &&
    registry &&
    account &&
    accountSlug.test(account)
  ) {
    return (
      `Your token for the "${account}" account ${gone}. Run ` +
      `\`vlt setup ${account}\` to log in again — one token covers every ` +
      `registry on the account.`
    )
  }

  return (
    `Your token for ${u.origin} ${gone}. Run ` +
    `\`vlt login --registry=${u.origin}/\` to log in again.`
  )
}

export type AssertOkOptions = {
  /** what we were trying to do, eg `'Failed to list dist-tags'` */
  message: string
  /** the url that was requested */
  url: URL | string
  /** the method used; defaults to GET */
  method?: string
  /**
   * Status-specific guidance appended to the message, one `⚠️` line
   * per entry. Only consulted when the response is an error.
   */
  advice?: (
    statusCode: number,
  ) => string | (string | undefined)[] | undefined
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
const registryError = (
  response: ErrorResponse,
  { message, url, method = 'GET', advice }: AssertOkOptions,
  from: (...a: never[]) => unknown,
  cause?: unknown,
): Error => {
  const { statusCode } = response
  const denied = statusCode === 401 || statusCode === 403
  // A diagnosis off the response stands in for the caller's generic 401 line.
  const refused = tokenRefusalAdvice(response, url)
  const extra = refused ?? advice?.(statusCode)
  const tips = (Array.isArray(extra) ? extra : [extra]).filter(
    (t): t is string => !!t,
  )
  const warn = tips.map(t => `\n⚠️ ${t}`).join('')
  return error(
    `${message}: ${registryErrorMessage(response)}${warn}`,
    {
      code: denied ? 'ENEEDAUTH' : 'EREQUEST',
      url,
      method,
      status: statusCode,
      response,
      ...(cause === undefined ? {} : { cause: asError(cause) }),
    },
    from,
  )
}

export const assertOk = (
  response: ErrorResponse,
  options: AssertOkOptions,
): void => {
  const { statusCode } = response
  // NOT `statusCode >= 200 && statusCode < 300`: duck-typed responses
  // that omit statusCode must stay non-errors, and this matches every
  // hand-rolled check it replaces.
  if (!(statusCode < 200 || statusCode >= 300)) return
  throw registryError(response, options, assertOk)
}

const isTextFn = (v: unknown): v is () => unknown =>
  typeof v === 'function'

export type RequestErrorOptions = AssertOkOptions

/**
 * Wrap an error thrown *by* `RegistryClient.request()` -- as opposed to a
 * non-2xx response it returned, which is {@link assertOk}'s job.
 *
 * A command that catches such an error and rethrows a flat
 * `error(message, { code: 'EREQUEST' })` throws away the only part the
 * user needed: an expired token arrives here as "Missing or invalid
 * authentication token...", and the rethrow reduces that to "Failed to
 * publish package" with the real reason buried in an error log.
 *
 * The auth challenges in `otplease` throw rather than return, but they
 * still carry the response that provoked them. Where there is a status
 * to be had, this builds the error through the same path a returned
 * response takes, so a thrown 401 and a refused 401 read identically.
 * The thrown message is the *reason* and is never dropped: it is the
 * detail after the status, unless the registry's own words are readable,
 * in which case those are the detail and the reason becomes a `⚠️` line
 * ahead of whatever advice the caller adds.
 *
 * With no status at all -- a genuine transport failure -- the inner
 * cause's message is appended so a redirect loop or a refused socket
 * names itself, and that cause is carried through for `printErr` to
 * show as Code/Syscall.
 */
export const requestError = (
  err: unknown,
  { message, url, method = 'GET', advice }: RequestErrorOptions,
): Error => {
  const e = asError(err)
  const reason = e.message
  // `error()` hangs its options bag off `.cause`
  const bag = isObject(e.cause) ? e.cause : undefined
  const res = isObject(bag?.response) ? bag.response : undefined
  const statusCode =
    typeof bag?.status === 'number' ? bag.status
    : typeof res?.statusCode === 'number' ? res.statusCode
    : undefined

  if (statusCode !== undefined) {
    // what the registry said, when the thrower kept a readable body.
    // a raw undici response has none; a CacheEntry does.
    let body = ''
    try {
      const text = res?.text
      if (isTextFn(text)) body = String(text()).trim()
    } catch {
      // an undecodable body is no worse than an absent one
    }
    return registryError(
      { ...res, statusCode, text: () => body || reason },
      {
        message,
        url,
        method,
        advice: sc => [
          // the reason only moves here when the body took its place
          ...(body ? [reason] : []),
          ...[advice?.(sc)].flat(),
        ],
      },
      requestError,
      e,
    )
  }

  const inner =
    bag?.cause === undefined ? undefined : asError(bag.cause)
  const detail =
    inner?.message && inner.message !== reason ?
      `${reason}: ${inner.message}`
    : reason
  return error(
    `${message}: ${detail}`,
    {
      code: 'EREQUEST',
      url,
      method,
      cause: inner ?? e,
    },
    requestError,
  )
}
