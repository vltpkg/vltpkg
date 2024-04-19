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

import ccp from 'cache-control-parser'
import { gunzipSync } from 'zlib'
import { getRawHeader } from './get-raw-header.js'

const unzip = (buffer: Buffer): Buffer =>
  buffer[0] === 0x1f && buffer[1] === 0x8b ?
    gunzipSync(buffer)
  : buffer

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
    throw new Error('Invalid buffer, not long enough to readSize')
  }
  /* c8 ignore stop */

  return (a << 24) | (b << 16) | (c << 8) | d
}

export class CacheEntry {
  #statusCode: number
  #headers: Buffer[]
  #body: Buffer[] = []
  #bodyLength: number = 0

  constructor(statusCode: number, headers: Buffer[]) {
    this.#statusCode = statusCode
    this.#headers = headers
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
    if (!/\bjson\b/.test(ct)) return true

    // see if the max-age has not yet been crossed
    const ma = cc['max-age'] || cc['s-maxage']
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
   * Give it a key, and it'll return the buffer of that header value
   */
  getHeader(h: string) {
    return getRawHeader(this.#headers, h)
  }

  /**
   * Return the body of the entry as a Buffer
   */
  buffer(): Buffer {
    const b = this.#body[0]
    if (!b) return Buffer.allocUnsafe(0)
    if (this.#body.length === 1) return b
    this.#body = [Buffer.concat(this.#body, this.#bodyLength)]
    const c = this.#body[0]
    /* c8 ignore next */
    if (!c) return Buffer.allocUnsafe(0)
    return c
  }

  // return the buffer if it's a tarball, or the parsed
  // JSON if it's not.
  get body(): Buffer | Record<string, any> {
    return this.isJSON ? this.json() : this.buffer()
  }

  get isJSON(): boolean {
    const ct = this.getHeader('content-type')?.toString()
    // if it says it's json, assume json
    if (ct) return /\bjson\b/.test(ct)
    // all registry json starts with {, and no tarball ever can.
    return this.#body[0]?.[0] === '{'.charCodeAt(0)
  }

  /**
   * Return the body of the entry as utf8 text
   */
  text() {
    return unzip(this.buffer()).toString()
  }

  /**
   * Parse the entry body as JSON and return the result
   */
  json() {
    return JSON.parse(this.text())
  }

  /**
   * Pass the contents of a @vltpkg/cache.Cache object as a buffer,
   * and this static method will decode it into a CacheEntry representing
   * the cached response.
   */
  static decode(buffer: Buffer): CacheEntry {
    const headSize = readSize(buffer, 0)
    const statusCode = Number(buffer.subarray(4, 7).toString())
    const headersBuffer = buffer.subarray(7, headSize)
    // walk through the headers array, building up the rawHeaders Buffer[]
    const headers: Buffer[] = []
    let i = 0
    while (i < headersBuffer.length) {
      const size = readSize(headersBuffer, i)
      headers.push(headersBuffer.subarray(i + 4, i + size))
      i += size
    }
    const c = new CacheEntry(statusCode, headers)
    const body = buffer.subarray(headSize)
    c.#body = [body]
    c.#bodyLength = body.byteLength
    return c
  }

  /**
   * Encode the entry as a single Buffer for writing to the cache
   */
  // TODO: should this maybe not concat, and just return Buffer[]?
  // Then we can writev it to the cache file that way, no need to copy.
  encode(): Buffer {
    const sb = Buffer.from(String(this.#statusCode))
    const chunks: Buffer[] = [sb]
    let headLength = sb.byteLength + 4
    for (const h of this.#headers) {
      const hlBuf = Buffer.allocUnsafe(4)
      const hl = h.byteLength
      headLength += hl + 4
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
