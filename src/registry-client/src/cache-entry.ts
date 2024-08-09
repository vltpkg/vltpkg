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

import { error } from '@vltpkg/error-cause'
import { Integrity, JSONField } from '@vltpkg/types'
import ccp from 'cache-control-parser'
import { createHash } from 'crypto'
import { inspect } from 'util'
import { gunzipSync } from 'zlib'
import { getRawHeader, setRawHeader } from './raw-header.js'
import { deserialize, serialize, serializedHeader } from './serdes.js'

const readSize = (buf: Buffer, offset: number) => {
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

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')

export class CacheEntry {
  #statusCode: number
  #headers: Buffer[]
  #body: Buffer[] = []
  #bodyLength = 0
  #integrity?: Integrity
  #integrityActual?: Integrity
  #json?: Record<string, JSONField>

  constructor(
    statusCode: number,
    headers: Buffer[],
    integrity?: Integrity,
  ) {
    this.#integrity = integrity
    this.#statusCode = statusCode
    this.#headers = headers
  }

  get #headersAsObject(): [string, string][] {
    const ret: [string, string][] = []
    for (let i = 0; i < this.#headers.length - 1; i += 2) {
      const key = String(this.#headers[i])
      const val = String(this.#headers[i + 1])
      ret.push([key, val])
    }
    return ret
  }

  [kCustomInspect](...args: any[]): string {
    const str = inspect(
      {
        statusCode: this.statusCode,
        headers: this.#headersAsObject,
        text: this.text(),
      },
      ...args,
    )
    return `@vltpkg/registry-client.CacheEntry ${str}`
  }

  /**
   * `true` if the entry represents a cached response that is still
   * valid to use.
   */
  get valid(): boolean {
    const cc_ = this.getHeader('cache-control')?.toString()
    const cc = cc_ ? ccp.parse(cc_) : {}
    const ct = this.getHeader('content-type')?.toString() ?? ''
    const dh = this.getHeader('date')?.toString()

    // immutable = never changes
    if (cc.immutable) return true

    // some registries do text/json, some do application/json,
    // some do application/vnd.npm.install-v1+json
    // If it's NOT json, it's an immutable tarball
    if (ct !== '' && !/\bjson\b/.test(ct)) return true

    // see if the max-age has not yet been crossed
    // default to 5m if maxage is not set, as some registries
    // do not set a cache control header at all.
    const ma = cc['max-age'] || cc['s-maxage'] || 300
    if (ma && dh) {
      return Date.parse(dh) + ma * 1000 > Date.now()
    }
    return false
  }

  addBody(b: Buffer) {
    this.#body.push(b)
    this.#bodyLength += b.byteLength
  }

  get statusCode() {
    return this.#statusCode
  }
  get headers() {
    return this.#headers
  }

  /**
   * check that the sri integrity string that was provided to the ctor
   * matches the body that we actually received. This should only be called
   * AFTER the entire body has been completely downloaded.
   *
   * Note that this will *usually* not be true if the value is coming out of
   * the cache, because the cache entries are un-gzipped in place. It should
   * *only* be called for artifacts that come from an actual http response.
   */
  checkIntegrity(): boolean {
    if (!this.#integrity) return false
    return this.integrityActual === this.#integrity
  }
  get integrityActual(): Integrity {
    if (this.#integrityActual) return this.#integrityActual
    const hash = createHash('sha512')
    for (const buf of this.#body) hash.update(buf)
    this.#integrityActual = `sha512-${hash.digest('base64')}`
    return this.#integrityActual
  }
  get integrity() {
    return this.#integrity
  }

  /**
   * Give it a key, and it'll return the buffer of that header value
   */
  getHeader(h: string) {
    return getRawHeader(this.#headers, h)
  }

  /**
   * Set a header to a specific value
   */
  setHeader(h: string, value: Buffer | string) {
    this.#headers = setRawHeader(this.#headers, h, value)
  }

  /**
   * Return the body of the entry as a Buffer
   */
  buffer(): Buffer {
    const b = this.#body[0]
    if (!b) return Buffer.allocUnsafe(0)
    if (this.#body.length === 1) return b
    const cat = Buffer.concat(this.#body, this.#bodyLength)
    this.#body = [cat]
    return cat
  }

  // return the buffer if it's a tarball, or the parsed
  // JSON if it's not.
  get body(): Buffer | Record<string, any> {
    return this.isJSON ? this.json() : this.buffer()
  }

  #isJSON?: boolean
  get isJSON(): boolean {
    if (this.#isJSON !== undefined) return this.#isJSON
    const ser = serializedHeader && this.getHeader(serializedHeader)
    if (ser) return (this.#isJSON = true)
    const ct = this.getHeader('content-type')?.toString()
    // if it says it's json, assume json
    if (ct) return /\bjson\b/.test(ct)
    const text = this.text()
    // don't cache, because we might just not have it yet.
    if (!text) return false
    // all registry json starts with {, and no tarball ever can.
    this.#isJSON = text.startsWith('{')
    if (this.#isJSON) this.setHeader('content-type', 'text/json')
    return this.#isJSON
  }

  #isGzip?: boolean
  get isGzip(): boolean {
    if (this.#isGzip !== undefined) return this.#isGzip
    const ce = this.getHeader('content-encoding')?.toString()
    if (ce && !/\bgzip\b/.test(ce)) return (this.#isGzip = false)
    const buf = this.buffer()
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
      if (this.#body[0] == null)
        throw error('Invalid buffer, cant unzip')
      /* c8 ignore stop */
      const b = gunzipSync(this.#body[0])
      this.setHeader('content-encoding', 'identity')
      this.#body = [b]
      this.#bodyLength = b.byteLength
      this.setHeader('content-length', String(this.#bodyLength))
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
    return this.buffer().toString()
  }

  /**
   * Parse the entry body as JSON and return the result
   */
  json(): Record<string, JSONField> {
    if (this.#json !== undefined) return this.#json
    const ser = serializedHeader && this.getHeader(serializedHeader)
    if (ser) {
      return (this.#json = deserialize(ser))
    }
    const obj = JSON.parse(this.text())
    if (serializedHeader)
      this.setHeader(serializedHeader, serialize(obj))
    return obj
  }

  /**
   * Pass the contents of a @vltpkg/cache.Cache object as a buffer,
   * and this static method will decode it into a CacheEntry representing
   * the cached response.
   */
  static decode(buffer: Buffer): CacheEntry {
    if (buffer.length < 4) {
      return new CacheEntry(0, [])
    }
    const headSize = readSize(buffer, 0)
    if (buffer.length < headSize) {
      return new CacheEntry(0, [])
    }
    const statusCode = Number(buffer.subarray(4, 7).toString())
    const headersBuffer = buffer.subarray(7, headSize)
    // walk through the headers array, building up the rawHeaders Buffer[]
    const headers: Buffer[] = []
    let i = 0
    while (i < headersBuffer.length - 4) {
      const size = readSize(headersBuffer, i)
      headers.push(headersBuffer.subarray(i + 4, i + size))
      i += size
    }
    const c = new CacheEntry(statusCode, headers)
    const body = buffer.subarray(headSize)
    c.#body = [body]
    c.#bodyLength = body.byteLength
    c.setHeader('content-length', String(c.#bodyLength))
    return c
  }

  /**
   * Encode the entry as a single Buffer for writing to the cache
   */
  // TODO: should this maybe not concat, and just return Buffer[]?
  // Then we can writev it to the cache file and save the memory copy
  encode(): Buffer {
    // store json results as a serialized object.
    if (this.isJSON) this.json()
    const sb = Buffer.from(String(this.#statusCode))
    const chunks: Buffer[] = [sb]
    let headLength = sb.byteLength + 4
    for (const h of this.#headers) {
      const hlBuf = Buffer.allocUnsafe(4)
      const hl = h.byteLength + 4
      headLength += hl
      hlBuf.set(
        [
          (hl >> 24) & 0xff,
          (hl >> 16) & 0xff,
          (hl >> 8) & 0xff,
          hl & 0xff,
        ],
        0,
      )
      chunks.push(hlBuf, h)
    }

    const hlBuf = Buffer.allocUnsafe(4)
    hlBuf.set(
      [
        (headLength >> 24) & 0xff,
        (headLength >> 16) & 0xff,
        (headLength >> 8) & 0xff,
        headLength & 0xff,
      ],
      0,
    )
    chunks.unshift(hlBuf)
    chunks.push(...this.#body)
    return Buffer.concat(chunks, headLength + this.#bodyLength)
  }
}
