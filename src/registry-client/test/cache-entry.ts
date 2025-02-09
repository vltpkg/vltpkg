import { createHash } from 'crypto'
import t from 'tap'
import { inspect } from 'util'
import { gzipSync } from 'zlib'
import { CacheEntry } from '../src/cache-entry.ts'

const toRawHeaders = (h: Record<string, string>): Buffer[] => {
  const r: Buffer[] = []
  for (const [k, v] of Object.entries(h)) {
    r.push(Buffer.from(k), Buffer.from(v))
  }
  return r
}

const toLenBuf = (b: Buffer): Buffer => {
  const bl = b.byteLength + 4
  const blBuf = Buffer.allocUnsafe(4)
  blBuf.set(
    [
      (bl >> 24) & 0xff,
      (bl >> 16) & 0xff,
      (bl >> 8) & 0xff,
      bl & 0xff,
    ],
    0,
  )
  return Buffer.concat([blBuf, b])
}

const toRawEntry = (
  status: number,
  headers: Record<string, string>,
  body: Buffer,
): Buffer => {
  const headerChunks: Buffer[] = [Buffer.from(String(status))]
  const rawh = toRawHeaders(headers)
  for (const h of rawh) {
    headerChunks.push(toLenBuf(h))
  }
  const chunks: Buffer[] = [toLenBuf(Buffer.concat(headerChunks))]
  chunks.push(toLenBuf(body))
  return Buffer.concat(chunks)
}

const z = gzipSync(Buffer.from('{"hello":"world"}'))
const ce = new CacheEntry(
  200,
  toRawHeaders({
    key: 'value',
    x: 'y',
  }),
  `sha512-${createHash('sha512').update(z).digest('base64')}`,
)

t.matchSnapshot(
  inspect(ce, { colors: true, depth: Infinity }),
  'inspect value (should include color codes for displayed object)',
)

t.equal(ce.statusCode, 200)
t.equal(ce.getHeader('x')?.toString(), 'y')
t.equal(ce.getHeader('key')?.toString(), 'value')
t.equal(ce.isGzip, false, 'not gzip without content')
ce.addBody(z.subarray(0, z.length / 2))
ce.addBody(z.subarray(z.length / 2))
t.equal(ce.checkIntegrity(), true)
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
t.equal(
  new CacheEntry(200, [
    Buffer.from('content-tyPe'),
    Buffer.from('application/json'),
  ]).isJSON,
  true,
)
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
t.equal(
  new CacheEntry(
    200,
    toRawHeaders({
      date: new Date('2020-01-20').toUTCString(),
      'cache-control': 'immutable',
    }),
  ).valid,
  true,
)

t.equal(
  new CacheEntry(
    200,
    toRawHeaders({
      date: new Date('2020-01-20').toUTCString(),
      'cache-control': 'immutable',
    }),
  ).checkIntegrity(),
  false,
  'no integrity to check, so it must be false',
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
