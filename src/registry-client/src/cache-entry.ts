// A response object in the cache.
//
// The cache stores Buffer objects, and it's convenient to have headers/body
// together, so we have a simple data structure for this.
//
// The shape of it is:
//
// [head length]
// <status code in ascii>
// [headers]
// [body]
//
// The [UInt32BE head length] is 4 bytes specifying the full length of the
// status code plus all header keys and values.
//
// The [headers] section is key/value/key2/value2/... where each key and value
// is a 4-byte Uint32BE length, followed by that many bytes.
//
// From there, the body can be of any indeterminate length, and is the rest
// of the file.

import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import { error } from '@vltpkg/error-cause'
import type { Integrity, JSONField } from '@vltpkg/types'
import ccp from 'cache-control-parser'
import { createHash } from 'node:crypto'
import type { InspectOptions } from 'node:util'
import { inspect } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { getRawHeader, setRawHeader } from './raw-header.ts'
import {
  getDecodedValue,
  getEncondedValue,
} from './string-encoding.ts'

export type JSONObj = Record<string, JSONField>

// same bound as @vltpkg/tar unpack: reject decompression bombs
// rather than committing unbounded memory to gunzipSync.
const MAX_DECOMPRESSION_RATIO = 1000
const defaultMaxUnpackedBytes = 2 * 1024 * 1024 * 1024
const parseMaxUnpackedBytes = (raw: string | undefined): number => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ?
      Math.floor(n)
    : defaultMaxUnpackedBytes
}
const maxUnpackedBytes = parseMaxUnpackedBytes(
  process.env.VLT_TAR_MAX_UNPACKED_BYTES,
)

const readSize = (buf: Uint8Array, offset: number) => {
  const a = buf[offset]
  const b = buf[offset + 1]
  const c = buf[offset + 2]
  const d = buf[offset + 3]

  // not possible, we check the length
  /* c8 ignore start */
  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined
  ) {
    throw error('Invalid buffer, not long enough to readSize', {
      found: buf.length,
    })
  }
  /* c8 ignore stop */

  return (a << 24) | (b << 16) | (c << 8) | d
}

// `inspect.custom`, not `Symbol.for('nodejs.util.inspect.custom')`: only
// this spelling is honoured by the compiler (perry-notes F7). Same symbol
// under Node.
const kCustomInspect = inspect.custom

export type CacheEntryOptions = {
  /**
   * An optional body to use.
   *
   * Adopted as-is (no copy). The caller must not mutate or reuse it.
   * Used when decoding a cache entry from a buffer. Do not call
   * `addBody` after providing this. Worker-thread transfers must
   * copy or structuredClone first so the cache ArrayBuffer is not
   * detached.
   */
  body?: Uint8Array

  /**
   * An optional content length of the body to use, if undefined the
   * content-length header will be used.
   */
  contentLength?: number

  /**
   * The expected integrity value for this response body
   */
  integrity?: Integrity
  /**
   * Whether to trust the integrity, or calculate the actual value.
   *
   * This indicates that we just accept whatever the integrity is as the actual
   * integrity for saving back to the cache, because it's coming directly from
   * the registry that we fetched a packument from, and is an initial gzipped
   * artifact request.
   */
  trustIntegrity?: boolean

  /**
   * If the server does not serve a `stale-while-revalidate` value in the
   * `cache-control` header, then this multiplier is applied to the `max-age`
   * or `s-maxage` values.
   *
   * By default, this is `60`, so for example a response that is cacheable for
   * 5 minutes will allow a stale response while revalidating for up to 5
   * hours.
   *
   * If the server *does* provide a `stale-while-revalidate` value, then that
   * is always used.
   *
   * Set to 0 to prevent any `stale-while-revalidate` behavior unless
   * explicitly allowed by the server's `cache-control` header.
   */
  'stale-while-revalidate-factor'?: number
}

export class CacheEntry {
  #statusCode: number
  /** The raw headers as an array of buffers */
  #headers: Uint8Array[]
  /** The body buffer, used if the content length is known. */
  #body?: Uint8Array
  /**
   * If the content length is unknown we save the body in multiple parts
   * in order to only concatenate once at the end and save extra memory copies.
   */
  #bodyParts: Uint8Array[] = []
  /** Used to track the length of the body while reading chunks */
  #bodyLength = 0
  /** The total length of the body, if known */
  #contentLength?: number
  #integrity?: Integrity
  #integrityActual?: Integrity
  #json?: JSONObj
  #trustIntegrity
  #staleWhileRevalidateFactor
  #fromCache = false
  #headSize?: number

  constructor(
    statusCode: number,
    headers: Uint8Array[],
    {
      body,
      integrity,
      trustIntegrity = false,
      'stale-while-revalidate-factor':
        staleWhileRevalidateFactor = 60,
      contentLength,
    }: CacheEntryOptions = {},
  ) {
    this.#headers = headers
    this.#statusCode = statusCode
    this.#trustIntegrity = trustIntegrity
    this.#staleWhileRevalidateFactor = staleWhileRevalidateFactor
    if (integrity) this.integrity = integrity

    // if content-legnth is known then we'll only allocate that much memory
    // and we'll avoid copying memory around when adding new chunks.
    if (contentLength != null && typeof contentLength === 'number') {
      this.#contentLength = contentLength
    }

    // if a body is provided then adopt it; `addBody` must not be used.
    if (body) {
      this.#body = body
      this.#bodyLength = body.byteLength
      /* c8 ignore start */
    } else if (this.#contentLength) {
      const buffer = new ArrayBuffer(this.#contentLength)
      this.#body = new Uint8Array(buffer, 0, this.#contentLength)
      this.#bodyLength = 0
    }
    /* c8 ignore stop */
  }

  get #headersAsObject(): [string, string][] {
    const ret: [string, string][] = []
    for (let i = 0; i < this.#headers.length - 1; i += 2) {
      const key = getDecodedValue(this.#headers[i])
      const val = getDecodedValue(this.#headers[i + 1])
      ret.push([key, val])
    }
    return ret
  }

  toJSON() {
    const {
      statusCode,
      valid,
      staleWhileRevalidate,
      cacheControl,
      date,
      contentType,
      integrity,
      maxAge,
      isGzip,
      isJSON,
    } = this
    /* c8 ignore start */
    const age =
      date ?
        Math.floor((Date.now() - date.getTime()) / 1000)
      : undefined
    const expires =
      date ? new Date(date.getTime() + this.maxAge * 1000) : undefined
    /* c8 ignore end */
    return Object.fromEntries(
      Object.entries({
        statusCode,
        headers: this.#headersAsObject,
        contentType,
        integrity,
        date,
        expires,
        cacheControl,
        valid,
        staleWhileRevalidate,
        age,
        maxAge,
        isGzip,
        isJSON,
      }).filter(([_, v]) => v !== undefined),
    )
  }

  [kCustomInspect](depth: number, options: InspectOptions): string {
    const str = inspect(this.toJSON(), {
      depth,
      ...options,
    })
    return `@vltpkg/registry-client.CacheEntry ${str}`
  }

  #date?: Date
  get date(): Date | undefined {
    if (this.#date) return this.#date
    const dh = this.getHeaderString('date')
    if (dh) this.#date = new Date(dh)
    return this.#date
  }

  #maxAge?: number
  get maxAge(): number {
    if (this.#maxAge !== undefined) return this.#maxAge
    // see if the max-age has not yet been crossed
    // default to 5m if maxage is not set, as some registries
    // do not set a cache control header at all.
    const cc = this.cacheControl
    this.#maxAge = cc['max-age'] || cc['s-maxage'] || 300
    return this.#maxAge
  }

  #cacheControl?: ccp.CacheControl
  get cacheControl(): ccp.CacheControl {
    if (this.#cacheControl) return this.#cacheControl
    const cc = this.getHeaderString('cache-control')
    this.#cacheControl = cc ? ccp.parse(cc) : {}
    return this.#cacheControl
  }

  #staleUntil?: number
  get staleWhileRevalidate(): boolean {
    // memoize the deadline, not the answer, so an entry held for a
    // long time (decoded-entry memo, long-lived process) still expires
    if (this.#staleUntil !== undefined)
      return Date.now() < this.#staleUntil
    if (this.valid || !this.date) return true
    const swv =
      this.cacheControl['stale-while-revalidate'] ??
      this.maxAge * this.#staleWhileRevalidateFactor

    this.#staleUntil = this.date.getTime() + swv * 1000
    return Date.now() < this.#staleUntil
  }

  #contentType?: string
  get contentType() {
    if (this.#contentType !== undefined) return this.#contentType
    this.#contentType = this.getHeaderString('content-type') ?? ''
    return this.#contentType
  }

  /**
   * `true` if the entry represents a cached response that is still
   * valid to use.
   */
  #valid?: boolean
  #validUntil?: number
  get valid(): boolean {
    if (this.#valid !== undefined) return this.#valid
    // time-based validity memoizes the deadline, not the answer, so
    // an entry held for a long time (decoded-entry memo, long-lived
    // process) still expires and gets revalidated
    if (this.#validUntil !== undefined)
      return Date.now() < this.#validUntil

    // immutable = never changes
    if (this.cacheControl.immutable) return (this.#valid = true)

    // some registries do text/json, some do application/json,
    // some do application/vnd.npm.install-v1+json
    // If it's NOT json, it's an immutable tarball
    const ct = this.contentType
    if (ct && !/\bjson\b/.test(ct)) return (this.#valid = true)

    // see if the max-age has not yet been crossed
    // default to 5m if maxage is not set, as some registries
    // do not set a cache control header at all.
    if (!this.date) return (this.#valid = false)
    this.#validUntil = this.date.getTime() + this.maxAge * 1000
    return Date.now() < this.#validUntil
  }

  /**
   * Add contents to the entry body.
   */
  addBody(b: Uint8Array) {
    // when the content length is uknown we store each chunk in an array that
    // later on is concatenate into a single buffer, otherwise we just append
    // the new chunk of bytes to the already allocated buffer keeping track
    // of the current offset in the `this.#bodyLength` property.
    if (!this.#body) {
      this.#bodyParts.push(b)
      this.#bodyLength += b.byteLength
    } else {
      this.#body.set(b, this.#bodyLength)
      this.#bodyLength += b.byteLength
    }
  }

  /** True when this entry was decoded from the on-disk cache. */
  get fromCache(): boolean {
    return this.#fromCache
  }

  /**
   * Byte length of the encoded head (4-byte length prefix + status +
   * headers). Set when decoded from cache or after `encodeHead()`.
   */
  get headSize(): number | undefined {
    return this.#headSize
  }

  get statusCode() {
    return this.#statusCode
  }
  get headers(): Uint8Array[] {
    return this.#headers
  }

  /**
   * Returns the body as a single Uint8Array, concatenating parts if needed.
   */
  get _body(): Uint8Array {
    // if the body is known we'll just use that
    if (this.#body) return this.#body
    // otherwise we concatenate the body parts into a single buffer
    const buffer = new ArrayBuffer(this.#bodyLength)
    const b = new Uint8Array(buffer, 0, this.#bodyLength)
    let off = 0
    for (const part of this.#bodyParts) {
      b.set(part, off)
      off += part.byteLength
    }
    return b
  }

  /**
   * Check that the sri integrity string that was provided to the ctor
   * matches the body that we actually received. This should only be called
   * AFTER the entire body has been completely downloaded.
   *
   * This method **will throw** if the integrity values do not match.
   *
   * Note that this will *usually* not be true if the value is coming out of
   * the cache, because the cache entries are un-gzipped in place. It should
   * _only_ be called for artifacts that come from an actual http response.
   *
   * Returns true if anything was actually verified.
   */
  checkIntegrity(
    context: ErrorCauseOptions = {},
  ): this is CacheEntry & { integrity: Integrity } {
    if (!this.#integrity) return false
    if (this.integrityActual !== this.#integrity) {
      throw error('Integrity check failure', {
        code: 'EINTEGRITY',
        response: this,
        wanted: this.#integrity,
        found: this.integrityActual,
        ...context,
      })
    }
    return true
  }

  get integrityActual(): Integrity {
    if (this.#integrityActual) return this.#integrityActual
    const hash = createHash('sha512')
    hash.update(this._body)
    const i: Integrity = `sha512-${hash.digest('base64')}`
    this.integrityActual = i
    return i
  }

  set integrityActual(i: Integrity) {
    this.#integrityActual = i
    this.setHeader('integrity', i)
  }

  set integrity(i: Integrity | undefined) {
    if (!this.#integrity && i) {
      this.#integrity = i
      if (this.#trustIntegrity) this.integrityActual = i
    }
  }
  get integrity() {
    return this.#integrity
  }

  /**
   * Give it a key, and it'll return the buffer of that header value
   */
  getHeader(h: string): Uint8Array | undefined {
    return getRawHeader(this.#headers, h)
  }

  /**
   * Give it a key, and it'll return the decoded string of that header value
   */
  getHeaderString(h: string): string | undefined {
    const value = getRawHeader(this.#headers, h)
    if (value) {
      return getDecodedValue(value)
    }
  }

  /**
   * Set a header to a specific value
   */
  setHeader(h: string, value: Uint8Array | string) {
    this.#headers = setRawHeader(this.#headers, h, value)
  }

  /**
   * Return the body of the entry as a Buffer
   */
  buffer(): Buffer {
    return Buffer.from(
      this._body.buffer,
      this._body.byteOffset,
      this._body.byteLength,
    )
  }

  // return the buffer if it's a tarball, or the parsed
  // JSON if it's not.
  get body(): Uint8Array | Record<string, any> {
    return this.isJSON ? this.json() : this.buffer()
  }

  #isJSON?: boolean
  get isJSON(): boolean {
    if (this.#isJSON !== undefined) return this.#isJSON
    const ct = this.getHeaderString('content-type')
    // if it says it's json, assume json
    if (ct) return (this.#isJSON = /\bjson\b/.test(ct))
    // don't cache, because we might just not have it yet.
    if (!this._body.length) return false
    this.unzip()
    const buf = this._body
    if (!buf.length) return false
    // all registry json starts with {, and no tarball ever can.
    this.#isJSON = buf[0] === 0x7b
    if (this.#isJSON) this.setHeader('content-type', 'text/json')
    return this.#isJSON
  }

  #isGzip?: boolean
  get isGzip(): boolean {
    if (this.#isGzip !== undefined) return this.#isGzip
    const ce = this.getHeaderString('content-encoding')
    if (ce && !/\bgzip\b/.test(ce)) return (this.#isGzip = false)
    const buf = this._body
    if (buf.length < 2) return false
    this.#isGzip = buf[0] === 0x1f && buf[1] === 0x8b
    if (this.#isGzip) {
      this.setHeader('content-encoding', 'gzip')
    } else {
      this.setHeader('content-encoding', 'identity')
      this.setHeader('content-length', String(this.#bodyLength))
    }
    return this.#isGzip
  }

  /**
   * Un-gzip encode the body.
   * Returns true if it was previously gzip (so something was done), otherwise
   * returns false.
   */
  unzip() {
    if (this.isGzip) {
      // we know that if we know it's gzip, that the body has been
      // flattened to a single buffer, so save the extra call.
      /* c8 ignore start */
      if (this._body.length === 0)
        throw error('Invalid buffer, cant unzip')
      /* c8 ignore stop */
      const max = Math.min(
        maxUnpackedBytes,
        this._body.length * MAX_DECOMPRESSION_RATIO,
      )
      let b: Buffer
      try {
        b = gunzipSync(this._body, { maxOutputLength: max })
      } catch (er) {
        throw (
            (er as NodeJS.ErrnoException).code ===
              'ERR_BUFFER_TOO_LARGE'
          ) ?
            error('cache entry exceeds maximum unpacked size', {
              found: this._body.length,
              max,
              cause: er,
            })
          : er
      }
      this.setHeader('content-encoding', 'identity')
      const u8 = new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
      this.#body = u8
      this.#bodyLength = u8.byteLength
      this.#contentLength = u8.byteLength
      this.setHeader('content-length', String(this.#contentLength))
      this.#isGzip = false
      return true
    }
    return false
  }

  /**
   * Return the body of the entry as utf8 text
   * Automatically unzips if the content is gzip encoded
   */
  text() {
    this.unzip()
    return getDecodedValue(this._body)
  }

  /**
   * Parse the entry body as JSON and return the result
   */
  json(): JSONObj {
    if (this.#json !== undefined) return this.#json
    const text = this.text()
    const obj = JSON.parse(text || '{}') as JSONObj
    this.#json = obj
    return obj
  }

  static #parseHead(buffer: Uint8Array):
    | {
        statusCode: number
        headers: Uint8Array[]
        integrity?: Integrity
        headSize: number
      }
    | undefined {
    if (buffer.length < 4) return undefined
    const headSize = readSize(buffer, 0)
    if (buffer.length < headSize) return undefined
    const statusCode = Number(getDecodedValue(buffer.subarray(4, 7)))
    const headersBuffer = buffer.subarray(7, headSize)
    const headers: Uint8Array[] = []
    let i = 0
    let integrity: Integrity | undefined = undefined
    while (i < headersBuffer.length - 4) {
      const size = readSize(headersBuffer, i)
      const val = headersBuffer.subarray(i + 4, i + size)
      if (headers.length % 2 === 1) {
        const k = getDecodedValue(
          headers[headers.length - 1],
        ).toLowerCase()
        if (k === 'integrity')
          integrity = getDecodedValue(val) as Integrity
      }
      headers.push(val)
      i += size
    }
    return { statusCode, headers, integrity, headSize }
  }

  /**
   * Decode only the status/headers from an encoded cache buffer.
   * The body is not read; `headSize` records how many bytes the head
   * occupies so a later `encodeHead()` can be patched in place.
   */
  static decodeHead(buffer: Uint8Array): CacheEntry {
    const parsed = CacheEntry.#parseHead(buffer)
    if (!parsed) return emptyCacheEntry
    const c = new CacheEntry(parsed.statusCode, parsed.headers, {
      body: new Uint8Array(0),
      integrity: parsed.integrity,
      trustIntegrity: true,
    })
    c.#fromCache = true
    c.#headSize = parsed.headSize
    return c
  }

  /**
   * Pass the contents of a @vltpkg/cache.Cache object as a buffer,
   * and this static method will decode it into a CacheEntry representing
   * the cached response.
   */
  static decode(
    buffer: Uint8Array,
    options: CacheEntryOptions = {},
  ): CacheEntry {
    const parsed = CacheEntry.#parseHead(buffer)
    if (!parsed) return emptyCacheEntry
    const body = buffer.subarray(parsed.headSize)

    const c = new CacheEntry(
      parsed.statusCode,
      setRawHeader(
        parsed.headers,
        'content-length',
        String(body.byteLength),
      ),
      {
        body,
        integrity: parsed.integrity,
        trustIntegrity: true,
        contentLength: body.byteLength,
        ...options,
      },
    )
    c.#fromCache = true
    c.#headSize = parsed.headSize

    try {
      if (c.isJSON) {
        c.unzip()
        if (!looksLikeJson(c._body)) return emptyCacheEntry
      }
    } catch {
      return emptyCacheEntry
    }
    return c
  }

  static isGzipEntry(buffer: Uint8Array): boolean {
    if (buffer.length < 4) return false
    const headSize = readSize(buffer, 0)
    const gzipBytes = buffer.subarray(headSize, headSize + 2)
    return gzipBytes[0] === 0x1f && gzipBytes[1] === 0x8b
  }

  /**
   * Encode status + headers (no body) as they appear at the start of
   * an on-disk cache file.
   */
  encodeHead(): Buffer {
    const statusStr = String(this.#statusCode)
    const statusBytes = getEncondedValue(statusStr)

    let headLength = 4 + statusBytes.byteLength
    for (const h of this.#headers) headLength += 4 + h.byteLength

    const out = Buffer.from(
      new ArrayBuffer(headLength),
      0,
      headLength,
    )
    let off = 0
    out[off++] = (headLength >> 24) & 0xff
    out[off++] = (headLength >> 16) & 0xff
    out[off++] = (headLength >> 8) & 0xff
    out[off++] = headLength & 0xff
    out.set(statusBytes, off)
    off += statusBytes.byteLength
    for (const h of this.#headers) {
      const l = 4 + h.byteLength
      out[off++] = (l >> 24) & 0xff
      out[off++] = (l >> 16) & 0xff
      out[off++] = (l >> 8) & 0xff
      out[off++] = l & 0xff
      out.set(h, off)
      off += h.byteLength
    }
    this.#headSize = headLength
    return out
  }

  /**
   * Encode the entry as a single Buffer for writing to the cache
   */
  encode(): Buffer {
    if (this.isJSON) this.json()
    const head = this.encodeHead()
    const body = this._body
    const total = head.byteLength + body.byteLength
    const out = Buffer.from(new ArrayBuffer(total), 0, total)
    out.set(head, 0)
    out.set(body, head.byteLength)
    return out
  }
}

const isJsonWs = (c: number) =>
  c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d

const looksLikeJson = (buf: Uint8Array): boolean => {
  // skip a UTF-8 BOM; TextDecoder strips it when the body is parsed
  const bom =
    buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? 3 : 0
  // an empty body is parsed as '{}' by json()
  if (buf.byteLength === bom) return true
  let first: number | undefined
  let start = bom
  for (let i = bom; i < buf.byteLength; i++) {
    const c = buf[i]
    /* c8 ignore start */
    if (c === undefined) break
    /* c8 ignore stop */
    if (!isJsonWs(c)) {
      first = c
      break
    }
    start++
  }
  if (first === undefined) return false
  let last = first
  for (let j = buf.byteLength - 1; j > start; j--) {
    const c = buf[j]
    /* c8 ignore start */
    if (c === undefined) break
    /* c8 ignore stop */
    if (!isJsonWs(c)) {
      last = c
      break
    }
  }
  return (
    (first === 0x7b && last === 0x7d) ||
    (first === 0x5b && last === 0x5d)
  )
}

const emptyCacheEntry = new CacheEntry(0, [], { contentLength: 0 })
