import { Readable } from 'node:stream'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  retryErrorCodes,
  retryMethods,
  retryStatusCodes,
} from './transport-retry.ts'
import type {
  Transport,
  TransportOptions,
  TransportRequestOptions,
  TransportResponse,
} from './transport.ts'

/**
 * The compiled runtime's transport. `fetch` is the only working HTTP client
 * at the pin: undici cannot link (wasm llhttp) and node:http's client never
 * fires its response callback.
 *
 * Known deviations from the undici backend, all runtime limitations rather
 * than choices:
 *  - redirects are followed by the runtime, so maxRedirections/redirections
 *    are the runtime's policy, not this package's. Cross-origin credential
 *    stripping, cycle rejection and 303 method rewriting were verified to
 *    match Node's fetch.
 *  - `signal` is passed through but the compiled runtime ignores it; an
 *    in-flight request runs to completion and the abort is observed at the
 *    next `throwIfAborted`.
 *  - no proxy support: neither Node's nor the compiled runtime's fetch reads
 *    `http_proxy`/`https_proxy`, and there is no dispatcher to swap in.
 *  - no connection-pool tuning: the pool belongs to the runtime.
 */

/** the loose header shapes addHeader produces, flattened for fetch */
const toHeaders = (
  h: TransportRequestOptions['headers'],
): Record<string, string> => {
  const out: Record<string, string> = {}
  const add = (k: unknown, v: string | string[] | undefined) => {
    if (typeof k !== 'string' || v === undefined) return
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v
  }
  if (!h) return out
  if (Array.isArray(h)) {
    if (Array.isArray(h[0])) {
      for (const [k, v] of h as unknown as [string, string][])
        add(k, v)
    } else {
      for (let i = 0; i < h.length; i += 2) add(h[i], h[i + 1])
    }
  } else if (Symbol.iterator in h) {
    for (const [k, v] of h as Iterable<[string, string]>) add(k, v)
  } else {
    for (const [k, v] of Object.entries(h)) add(k, v)
  }
  return out
}

/** set-cookie stays an array; everything else is a string */
const fromHeaders = (h: Headers): TransportResponse['headers'] => {
  const out: TransportResponse['headers'] = {}
  for (const [k, v] of h) {
    if (k !== 'set-cookie') out[k] = v
  }
  const sc = h.getSetCookie()
  if (sc.length) out['set-cookie'] = sc
  return out
}

const asResponse = (res: Response): TransportResponse => {
  const body = (
    res.body ?
      Readable.fromWeb(
        res.body as Parameters<typeof Readable.fromWeb>[0],
      )
    : Readable.from([])) as TransportResponse['body']
  // the mixins the package reads off undici's BodyReadable. They drain the
  // stream rather than the Response, which fromWeb has already locked, and
  // like undici's they consume the body exactly once.
  const collect = async () => {
    const chunks: Buffer[] = []
    for await (const c of body)
      chunks.push(Buffer.from(c as Uint8Array))
    return Buffer.concat(chunks)
  }
  body.text = async () => (await collect()).toString()
  body.json = async () =>
    JSON.parse((await collect()).toString()) as unknown
  body.arrayBuffer = async () => {
    const b = await collect()
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  }
  return {
    statusCode: res.status,
    headers: fromHeaders(res.headers),
    body,
  }
}

const errorCode = (er: unknown): string | undefined =>
  (er as { cause?: { code?: string } } | undefined)?.cause?.code

const isAbort = (er: unknown): boolean =>
  (er as Error | undefined)?.name === 'AbortError' ||
  (er as Error | undefined)?.name === 'TimeoutError'

export const fetchTransport = (
  options: TransportOptions,
): Transport => {
  const { maxRetries, timeoutFactor, minTimeout, maxTimeout } =
    options
  return {
    async request(o: TransportRequestOptions) {
      const url = String(new URL(o.path, String(o.origin)))
      const method = o.method.toUpperCase()
      const headers = toHeaders(o.headers)
      const signal = o.signal as AbortSignal | undefined
      const body =
        o.body === undefined || o.body === null ?
          undefined
        : (o.body as BodyInit)
      const replayable = retryMethods.includes(method)
      // undici's RetryHandler schedule, without its jitter
      const backoff = (attempt: number) =>
        Math.min(minTimeout * timeoutFactor ** attempt, maxTimeout)

      for (let attempt = 0; ; attempt++) {
        const last = attempt >= maxRetries || !replayable
        // No `continue` after the `await` in a catch block: compiled, that
        // combination abandons the loop and resolves the whole call as
        // undefined, so nothing was ever retried. The result is carried out
        // of the try instead.
        let res: Response | undefined
        let failure: unknown
        try {
          // the init MUST be an object literal at the call site with
          // every property spelled `key: value`: compiled, an options
          // VARIABLE or a shorthand property is silently ignored and
          // the headers never hit the wire (notes F51)
          res = await fetch(url, {
            method: method,
            headers: headers,
            signal: signal,
            body: body,
          })
        } catch (er) {
          failure = er
        }

        if (!res) {
          // the compiled runtime reports a bare Error with no cause.code, so
          // anything that is not an abort counts as transient
          const code = errorCode(failure)
          const transient =
            !isAbort(failure) &&
            (!code || retryErrorCodes.includes(code))
          if (last || !transient) throw failure
          await sleep(backoff(attempt))
        } else if (last || !retryStatusCodes.includes(res.status)) {
          return asResponse(res)
        } else {
          const after = Number(res.headers.get('retry-after'))
          await res.body?.cancel().catch(() => {})
          await sleep(
            Number.isFinite(after) && after > 0 ?
              Math.min(after * 1000, maxTimeout)
            : backoff(attempt),
          )
        }
      }
    },
  }
}
