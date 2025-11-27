import { createHash } from 'node:crypto'
import { inspect } from 'node:util'
import { gzipSync } from 'node:zlib'
import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import { toRawHeaders } from './fixtures/to-raw-headers.ts'

const toLenBuf = (b: Uint8Array): Uint8Array => {
  const bl = b.byteLength + 4
  const blBuf = new Uint8Array(4)
  blBuf.set(
    [
      (bl >> 24) & 0xff,
      (bl >> 16) & 0xff,
      (bl >> 8) & 0xff,
      bl & 0xff,
    ],
    0,
  )
  const res = new Uint8Array(blBuf.byteLength + b.byteLength)
  res.set(blBuf, 0)
  res.set(b, blBuf.byteLength)
  return res
}

const concatUint8Arrays = (arr: Uint8Array[]): Uint8Array =>
  arr.reduce((acc, i) => {
    const next = new Uint8Array(acc.byteLength + i.byteLength)
    next.set(acc, 0)
    next.set(i, acc.byteLength)
    return next
  }, new Uint8Array(0))

const toRawEntry = (
  status: number,
  headers: Record<string, string>,
  body: Uint8Array,
): Uint8Array => {
  const headerChunks: Uint8Array[] = [Buffer.from(String(status))]
  const rawh = toRawHeaders(headers)
  for (const h of rawh) {
    headerChunks.push(toLenBuf(h))
  }
  const chunks: Uint8Array[] = [
    toLenBuf(concatUint8Arrays(headerChunks)),
  ]
  chunks.push(toLenBuf(body))
  return concatUint8Arrays(chunks)
}

const z = gzipSync(Buffer.from('{"hello":"world"}'))
// make this portable by removing the OS indicator that zlib inserts
z[9] = 255
const ce = new CacheEntry(
  200,
  toRawHeaders({
    key: 'value',
    x: 'y',
  }),
  {
    integrity: `sha512-${createHash('sha512').update(z).digest('base64')}`,
    trustIntegrity: true,
  },
)

t.matchSnapshot(
  inspect(ce, { colors: true, depth: Infinity }),
  'inspect value (should include color codes for displayed object)',
)

const ceBinary = new CacheEntry(200, [])
ceBinary.addBody(Buffer.from([0, 0, 0, 0, 0, 0]))
t.matchSnapshot(
  inspect(ceBinary, { colors: false, depth: Infinity }),
  'inspect value should not dump noisy binary data',
)

const ceBigBody = new CacheEntry(200, [])
ceBigBody.addBody(Buffer.allocUnsafe(1024).fill('a'))
t.matchSnapshot(
  inspect(ceBigBody, { colors: false, depth: Infinity }),
  'inspect value should not dump excessively large body text',
)

t.equal(ce.statusCode, 200)
t.equal(ce.getHeaderString('x'), 'y')
t.equal(ce.getHeaderString('key'), 'value')
t.equal(ce.isGzip, false, 'not gzip without content')
t.equal(
  CacheEntry.isGzipEntry(Buffer.alloc(1)),
  false,
  'too short to be gzip',
)
t.equal(
  CacheEntry.isGzipEntry(ce.encode()),
  false,
  'not gzip without content',
)
ce.addBody(z.subarray(0, z.length / 2))
ce.addBody(z.subarray(z.length / 2))
t.doesNotThrow(() => ce.checkIntegrity())
const badIntegrity = new CacheEntry(
  200,
  toRawHeaders({ key: 'value' }),
  { integrity: ce.integrityActual },
)
badIntegrity.addBody(ce.buffer())
badIntegrity.addBody(Buffer.from('some noise'))
t.throws(() => badIntegrity.checkIntegrity())

t.equal(
  ce.integrity,
  `sha512-${createHash('sha512').update(z).digest('base64')}`,
)
t.equal(ce.integrity, ce.integrityActual)
t.strictSame(ce.buffer(), z)
t.equal(ce.isGzip, true, 'has gzipped body')

const enc = ce.encode()
// encoding turned it into a serialized object
t.strictSame(ce.buffer(), Buffer.from(JSON.stringify(ce.json())))
t.equal(ce.isGzip, false, 'no longer gzipped after encode')

t.equal(ce.text(), '{"hello":"world"}')
t.equal(ce.isGzip, false, 'unzipped to read json')
t.strictSame(ce.json(), { hello: 'world' })
t.strictSame(
  new CacheEntry(200, []).json(),
  {},
  'empty entry has empty json body, but does not throw',
)
t.strictSame(ce.body, { hello: 'world' })
t.strictSame(
  ce.buffer(),
  Buffer.from(JSON.stringify({ hello: 'world' })),
)
t.strictSame(ce.headers, [
  Buffer.from('key'),
  Buffer.from('value'),
  Buffer.from('x'),
  Buffer.from('y'),
  Buffer.from('integrity'),
  Buffer.from(ce.integrityActual),
  Buffer.from('content-encoding'),
  Buffer.from('identity'),
  Buffer.from('content-length'),
  Buffer.from(String(ce.buffer().byteLength)),
  Buffer.from('content-type'),
  Buffer.from('text/json'),
])

t.strictSame(CacheEntry.decode(enc), ce)
t.strictSame(CacheEntry.decode(enc).encode(), enc)
t.strictSame(CacheEntry.decode(enc).json(), ce.json())

t.equal(ce.isJSON, true)
const json = new CacheEntry(200, [
  Buffer.from('content-tyPe'),
  Buffer.from('application/json'),
])
t.equal(json.isJSON, true)
t.equal(json.contentType, 'application/json', 'content-type header')
t.equal(json.contentType, 'application/json', 'memoized')
t.equal(
  new CacheEntry(200, [
    Buffer.from('CONTENT-TYPE'),
    Buffer.from('application/vnd.npm.install-v1+json'),
  ]).isJSON,
  true,
)
t.equal(
  new CacheEntry(200, [
    Buffer.from('content-encoding'),
    Buffer.from('identity'),
  ]).isGzip,
  false,
)

const headLen = enc.readUint32BE()
t.equal(
  headLen,
  // header length number
  4 +
    // status code
    '200'.length +
    // headers
    4 +
    'key'.length +
    4 +
    'value'.length +
    4 +
    'x'.length +
    4 +
    'y'.length +
    4 +
    'integrity'.length +
    4 +
    ce.integrityActual.length +
    4 +
    'content-encoding'.length +
    4 +
    'identity'.length +
    4 +
    'content-type'.length +
    4 +
    'text/json'.length +
    4 +
    'content-length'.length +
    4 +
    String(ce.buffer().byteLength).length,
)

t.strictSame(enc.subarray(headLen), ce.buffer())

// read from a cached encoded buffer
const d = CacheEntry.decode(enc)
t.strictSame(d, ce)

// ok if the response is NOT gzipped, as well
const unzipped = new CacheEntry(200, toRawHeaders({ hello: 'world' }))
t.test('body reads before any body exists', t => {
  t.strictSame(unzipped.buffer(), Buffer.alloc(0))
  t.equal(unzipped.text(), '')
  t.strictSame(unzipped.body, Buffer.alloc(0))
  t.strictSame(unzipped.isJSON, false)
  t.end()
})
unzipped.addBody(Buffer.from('{"json":"wut"}'))
t.equal(unzipped.text(), '{"json":"wut"}')
t.strictSame(unzipped.buffer(), Buffer.from('{"json":"wut"}'))
t.strictSame(unzipped.json(), { json: 'wut' })
t.strictSame(unzipped.body, { json: 'wut' })
t.equal(unzipped.valid, false)
t.equal(unzipped.isJSON, true)

// test if it's a valid cache entry
const imm = new CacheEntry(
  200,
  toRawHeaders({
    date: new Date('2020-01-20').toUTCString(),
    'cache-control': 'immutable',
  }),
)
t.equal(imm.valid, true)
t.equal(imm.valid, true, 'memoized')

t.doesNotThrow(
  () =>
    new CacheEntry(
      200,
      toRawHeaders({
        date: new Date('2020-01-20').toUTCString(),
        'cache-control': 'immutable',
      }),
    ).checkIntegrity(),
  'no integrity to check, so pass',
)

t.equal(
  new CacheEntry(
    200,
    toRawHeaders({
      date: new Date('2020-01-20').toUTCString(),
      'content-type': 'application/octet-stream',
      // ignored, it's an octet-stream, that means immutable tarball
      'cache-control': 'max-age=300',
    }),
  ).valid,
  true,
)

t.equal(
  new CacheEntry(
    200,
    toRawHeaders({
      date: new Date().toUTCString(),
      'content-type': 'application/json',
      'cache-control': 'max-age=300',
    }),
  ).valid,
  true,
)

// these need to be revalidated
t.equal(
  new CacheEntry(
    200,
    toRawHeaders({
      date: new Date('2020-01-20').toUTCString(),
      'content-type': 'application/json',
      'cache-control': 'max-age=300',
    }),
  ).valid,
  false,
)

// lacks Date header, so we can't know what the max-age refers to
t.equal(
  new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/json',
      'cache-control': 'max-age=300',
    }),
  ).valid,
  false,
)

t.test('isGzip', t => {
  const c = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/octet-stream',
      'content-encoding': 'gzip',
    }),
  )
  const zipped = gzipSync(Buffer.from('hello, world'))
  c.addBody(zipped)
  t.equal(c.isGzip, true)
  t.equal(CacheEntry.isGzipEntry(c.encode()), true)
  t.end()
})

t.test('decoding a partial buffer should not blow up', t => {
  const totesEmpty = CacheEntry.decode(Buffer.alloc(0))
  t.match(totesEmpty, {
    statusCode: 0,
    headers: [],
    body: Buffer.alloc(0),
  })
  const headTooShort = CacheEntry.decode(
    Buffer.from([100, 100, 100, 100, ...Buffer.from('hello, world')]),
  )
  t.match(headTooShort, {
    statusCode: 0,
    headers: [],
    body: Buffer.alloc(0),
  })
  t.end()
})

t.test('treat bad json as cache miss', t => {
  const trash = Buffer.from('\u0001\u0002\u0003\u0004\u0005\u0099')
  const body = Buffer.from(`{"hello":"world"\u0054}`)
  const headers = { 'content-type': 'application/json' }
  const enc = toRawEntry(200, headers, Buffer.concat([body, trash]))
  const dec = CacheEntry.decode(enc)
  t.equal(dec.isJSON, false)
  t.match(dec, {
    headers: [],
    body: Buffer.allocUnsafe(0),
  })
  t.end()
})

t.test('stale while revalidate', async t => {
  t.equal(
    new CacheEntry(
      200,
      toRawHeaders({
        date: new Date('2020-01-20').toUTCString(),
        'cache-control': 'immutable',
      }),
    ).staleWhileRevalidate,
    true,
    'stale entry is valid, because cache entry is still valid',
  )

  t.equal(
    new CacheEntry(
      200,
      toRawHeaders({
        'cache-control': 'max-age=300',
      }),
    ).staleWhileRevalidate,
    true,
    'valid to use stale and revalidate, because no date header',
  )

  t.equal(
    new CacheEntry(
      200,
      toRawHeaders({
        'cache-control': 'max-age=300',
        date: new Date(
          new Date().getTime() - 10 * 300 * 1000,
        ).toUTCString(),
      }),
    ).staleWhileRevalidate,
    true,
    'valid to revalidate, because younger than max-age * 60',
  )

  const tooStale = new CacheEntry(
    200,
    toRawHeaders({
      'cache-control': 'max-age=300',
      date: new Date(
        new Date().getTime() - 100 * 300 * 1000,
      ).toUTCString(),
    }),
  )

  t.equal(
    tooStale.staleWhileRevalidate,
    false,
    'cannot use stale entry, because older than max-age * 60',
  )
  t.equal(
    tooStale.staleWhileRevalidate,
    false,
    'memoized, still false',
  )
})

t.test('maxAge', async t => {
  const ma = new CacheEntry(
    200,
    toRawHeaders({
      'cache-control': 'max-age=100',
    }),
  )
  t.equal(ma.maxAge, 100)
  t.equal(ma.maxAge, 100, 'memoized')

  const sma = new CacheEntry(
    200,
    toRawHeaders({
      'cache-control': 's-maxage=100',
    }),
  )
  t.equal(sma.maxAge, 100)
  t.equal(sma.maxAge, 100, 'memoized')

  const nma = new CacheEntry(200, toRawHeaders({}))
  t.equal(nma.maxAge, 300)
  t.equal(nma.maxAge, 300, 'memoized')
})

t.test('zeroCopy option', async t => {
  const originalBody = Buffer.from('hello, world')
  const bodyArray = new Uint8Array(
    originalBody.buffer,
    originalBody.byteOffset,
    originalBody.byteLength,
  )

  // With zeroCopy: false (default), body should be copied
  const copied = new CacheEntry(200, toRawHeaders({}), {
    body: bodyArray,
    contentLength: bodyArray.byteLength,
    zeroCopy: false,
  })
  // Modifying original should not affect the copy
  const copiedBuffer = copied.buffer()
  t.strictSame(copiedBuffer.toString(), 'hello, world')

  // With zeroCopy: true, body is used directly
  const zeroCopied = new CacheEntry(200, toRawHeaders({}), {
    body: bodyArray,
    contentLength: bodyArray.byteLength,
    zeroCopy: true,
  })
  t.strictSame(zeroCopied.buffer().toString(), 'hello, world')
})

t.test('decode with mixed case integrity header', async t => {
  // Test that byte-level integrity detection works with mixed case INTEGRITY header
  const body = Buffer.from('{"test":"data"}')
  const integrity =
    `sha512-${createHash('sha512').update(body).digest('base64')}` as const
  // Create entry with mixed case "Integrity" header
  const ce = new CacheEntry(
    200,
    [
      Buffer.from('content-type'),
      Buffer.from('application/json'),
      Buffer.from('Integrity'), // Mixed case
      Buffer.from(integrity),
    ],
    { integrity, trustIntegrity: true },
  )
  ce.addBody(body)
  const enc = ce.encode()
  const dec = CacheEntry.decode(enc)
  t.equal(dec.integrity, integrity)
  t.strictSame(dec.json(), { test: 'data' })
})

t.test('decode tarball skips JSON parsing', async t => {
  // Tarballs with application/octet-stream should skip JSON validation
  const tarballBody = gzipSync(Buffer.from('fake tarball content'))
  const ce = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/octet-stream',
      'content-encoding': 'gzip',
    }),
  )
  ce.addBody(tarballBody)
  const enc = ce.encode()
  const dec = CacheEntry.decode(enc)
  // Should decode successfully without trying to parse as JSON
  t.equal(dec.statusCode, 200)
  t.equal(dec.isJSON, false)
  // Body is gzipped
  t.strictSame(dec.buffer(), tarballBody)
})
