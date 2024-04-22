import t from 'tap'
import { gzipSync } from 'zlib'
import { CacheEntry } from '../src/cache-entry.js'

const toRawHeaders = (h: Record<string, string>): Buffer[] => {
  const r: Buffer[] = []
  for (const [k, v] of Object.entries(h)) {
    r.push(Buffer.from(k), Buffer.from(v))
  }
  return r
}

const ce = new CacheEntry(200, toRawHeaders({
  key: 'value',
  x : 'y'
}))

t.equal(ce.statusCode, 200)
t.equal(ce.getHeader('x')?.toString(), 'y')
t.equal(ce.getHeader('key')?.toString(), 'value')
const z = gzipSync(Buffer.from('{"hello":"world"}'))
ce.addBody(z.subarray(0, z.length / 2))
ce.addBody(z.subarray(z.length / 2))

const enc = ce.encode()
t.equal(ce.text(), '{"hello":"world"}')
t.strictSame(ce.json(), { hello: 'world' })
t.strictSame(ce.body, { hello: 'world' })
t.strictSame(ce.buffer(), z)
t.strictSame(ce.headers, [
  Buffer.from('key'),
  Buffer.from('value'),
  Buffer.from('x'),
  Buffer.from('y'),
])

t.strictSame(CacheEntry.decode(enc), ce)
t.strictSame(CacheEntry.decode(enc).encode(), enc)

t.equal(ce.isJSON, true)
t.equal(new CacheEntry(200, [ Buffer.from('content-tyPe'), Buffer.from('application/json')]).isJSON, true)
t.equal(new CacheEntry(200, [ Buffer.from('CONTENT-TYPE'), Buffer.from('application/vnd.npm.install-v1+json')]).isJSON, true)

const headLen = enc.readUint32BE()
t.equal(headLen,
  // header length number
  4 +
  // status code
  '200'.length +
  // headers
  4 + 'key'.length +
  4 + 'value'.length +
  4 + 'x'.length +
  4 + 'y'.length
)

t.strictSame(enc.subarray(headLen), z)

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
t.equal(new CacheEntry(200, toRawHeaders({
  date: new Date('2020-01-20').toUTCString(),
  'cache-control': 'immutable',
})).valid, true)

t.equal(new CacheEntry(200, toRawHeaders({
  date: new Date('2020-01-20').toUTCString(),
  'content-type': 'application/octet-stream',
  // ignored, it's an octet-stream, that means immutable tarball
  'cache-control': 'max-age=300',
})).valid, true)

t.equal(new CacheEntry(200, toRawHeaders({
  date: new Date().toUTCString(),
  'content-type': 'application/json',
  'cache-control': 'max-age=300',
})).valid, true)

// these need to be revalidated
t.equal(new CacheEntry(200, toRawHeaders({
  date: new Date('2020-01-20').toUTCString(),
  'content-type': 'application/json',
  'cache-control': 'max-age=300',
})).valid, false)

// lacks Date header, so we can't know what the max-age refers to
t.equal(new CacheEntry(200, toRawHeaders({
  'content-type': 'application/json',
  'cache-control': 'max-age=300',
})).valid, false)
