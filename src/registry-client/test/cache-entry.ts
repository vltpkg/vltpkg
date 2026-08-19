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
  chunks.push(body)
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

t.test('fromCache', t => {
  const entry = new CacheEntry(
    200,
    toRawHeaders({ 'content-type': 'application/octet-stream' }),
  )
  entry.addBody(Buffer.from('hello'))
  t.equal(
    entry.fromCache,
    false,
    'constructed entries are not from cache',
  )
  t.equal(
    CacheEntry.decode(entry.encode()).fromCache,
    true,
    'decoded entries are from cache',
  )
  t.end()
})

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

t.test('decode adopts body without copying', t => {
  const src = new CacheEntry(
    200,
    toRawHeaders({ 'content-type': 'application/octet-stream' }),
  )
  src.addBody(Buffer.from('hello'))
  const enc = src.encode()
  const dec = CacheEntry.decode(enc)
  const headSize = enc.readUInt32BE(0)
  enc[headSize] = 0x41
  t.equal(dec.buffer()[0], 0x41)
  t.end()
})

t.test('decode does not eagerly parse json', t => {
  const orig = JSON.parse
  let calls = 0
  JSON.parse = ((...args: Parameters<typeof JSON.parse>) => {
    calls++
    return orig(...args)
  }) as typeof JSON.parse
  t.teardown(() => {
    JSON.parse = orig
  })
  const enc = toRawEntry(
    200,
    { 'content-type': 'application/json' },
    Buffer.from('{"a":1}'),
  )
  const dec = CacheEntry.decode(enc)
  t.equal(calls, 0)
  t.strictSame(dec.json(), { a: 1 })
  t.equal(calls, 1)
  t.strictSame(dec.json(), { a: 1 })
  t.equal(calls, 1, 'json() memoizes')
  t.end()
})

t.test('isJSON without content-type uses first byte', t => {
  const json = new CacheEntry(200, [])
  json.addBody(Buffer.from('{"x":1}'))
  t.equal(json.isJSON, true)

  const notJson = new CacheEntry(200, [])
  notJson.addBody(Buffer.from('hello'))
  t.equal(notJson.isJSON, false)

  const spaced = new CacheEntry(200, [])
  spaced.addBody(Buffer.from(' {"x":1}'))
  t.equal(spaced.isJSON, false, 'matches text().startsWith("{")')

  const gzJson = new CacheEntry(200, [])
  gzJson.addBody(gzipSync(Buffer.from('{"x":1}')))
  t.equal(gzJson.isJSON, true)

  const gzNot = new CacheEntry(200, [])
  gzNot.addBody(gzipSync(Buffer.from('hello')))
  t.equal(gzNot.isJSON, false)

  const emptyGz = new CacheEntry(200, [])
  emptyGz.addBody(gzipSync(Buffer.alloc(0)))
  t.equal(emptyGz.isJSON, false)
  t.end()
})

t.test('json shape-check vs parse', t => {
  const isEmpty = (
    body: Uint8Array,
    headers = { 'content-type': 'application/json' },
  ) => {
    const dec = CacheEntry.decode(toRawEntry(200, headers, body))
    return dec.statusCode === 0
  }
  const parseOk = (body: Uint8Array) => {
    try {
      // mirror json(): TextDecoder strips a BOM, empty parses as {}
      const text = new TextDecoder().decode(body)
      JSON.parse(text || '{}')
      return true
    } catch {
      return false
    }
  }

  const corpus: [string, Uint8Array][] = [
    ['object', Buffer.from('{"a":1}')],
    ['array', Buffer.from('[1,2]')],
    ['whitespace object', Buffer.from('  {"a":1}\n')],
    ['truncated', Buffer.from('{"a":')],
    ['bracket mismatch', Buffer.from('{"a":1]')],
    ['trailing garbage', Buffer.from('{"a":1}nope')],
    ['deep corrupt', Buffer.from('{not json}')],
    ['empty', Buffer.from('')],
    ['leading slash', Buffer.from('/{"a":1}')],
    ['whitespace only', Buffer.from('   \n')],
    ['whitespace array', Buffer.from('  [1]  ')],
    ['bom object', Buffer.from('\uFEFF{"a":1}')],
    ['bom only', Buffer.from('\uFEFF')],
    ['bom truncated', Buffer.from('\uFEFF{"a":')],
  ]

  for (const [name, body] of corpus) {
    const empty = isEmpty(body)
    const ok = parseOk(body)
    if (ok) t.equal(empty, false, `${name}: parse ok => decoded`)
    else if (empty) t.ok(true, `${name}: rejected by shape check`)
    else
      t.throws(
        () =>
          CacheEntry.decode(
            toRawEntry(
              200,
              { 'content-type': 'application/json' },
              body,
            ),
          ).json(),
        `${name}: deferred to json()`,
      )
  }

  t.equal(
    isEmpty(gzipSync(Buffer.from('{"a":1}'))),
    false,
    'gzipped json object',
  )
  t.equal(
    isEmpty(Buffer.from([0x1f, 0x8b, 0x00, 0x00])),
    true,
    'invalid gzip json is a miss',
  )
  t.equal(
    isEmpty(Buffer.from('true')),
    true,
    'top-level true is a miss',
  )
  t.end()
})

t.test('decode/encode round-trip parity', t => {
  // decode() injects content-length; encode() of JSON also unzips.
  // The hard gate is that decode∘encode is a projection: applying it
  // twice is identity, matching what the previous eager-json decode
  // produced. Identity JSON already goes through json() on encode(),
  // so the first encode is already canonical.
  const roundTrip = (
    name: string,
    entry: CacheEntry,
    canonical = false,
  ) => {
    const enc = entry.encode()
    const once = CacheEntry.decode(enc).encode()
    if (canonical) {
      t.strictSame(once, enc, `${name}: first encode is canonical`)
    }
    t.strictSame(
      CacheEntry.decode(once).encode(),
      once,
      `${name}: decode(buf).encode() is idempotent`,
    )
    t.strictSame(
      CacheEntry.decode(enc).buffer(),
      entry.buffer(),
      `${name}: body bytes preserved`,
    )
  }

  const json = new CacheEntry(
    200,
    toRawHeaders({ 'content-type': 'application/json' }),
  )
  json.addBody(Buffer.from('{"a":1}'))
  roundTrip('identity json', json, true)

  const arr = new CacheEntry(
    200,
    toRawHeaders({ 'content-type': 'application/json' }),
  )
  arr.addBody(Buffer.from('  [1,2,3]\n'))
  roundTrip('identity json array', arr, true)

  const tar = new CacheEntry(
    200,
    toRawHeaders({ 'content-type': 'application/octet-stream' }),
  )
  tar.addBody(Buffer.from('this is a tarball lets pretend'))
  roundTrip('identity tarball', tar)

  const gzTar = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/octet-stream',
      'content-encoding': 'gzip',
    }),
  )
  gzTar.addBody(
    gzipSync(Buffer.from('this is a tarball lets pretend')),
  )
  roundTrip('gzip tarball', gzTar)

  const gzJson = new CacheEntry(
    200,
    toRawHeaders({ 'content-type': 'application/json' }),
  )
  gzJson.addBody(gzipSync(Buffer.from('{"hello":"world"}')))
  roundTrip('gzip json (unzipped by encode)', gzJson, true)

  roundTrip('existing gzip json fixture', ce, true)
  t.end()
})

t.test('decode accepts BOM and empty json bodies', t => {
  const bom = CacheEntry.decode(
    toRawEntry(
      200,
      { 'content-type': 'application/json' },
      Buffer.from('\uFEFF{"a":1}'),
    ),
  )
  t.equal(bom.statusCode, 200, 'BOM json is not a miss')
  t.strictSame(bom.json(), { a: 1 }, 'TextDecoder strips the BOM')

  const empty = CacheEntry.decode(
    toRawEntry(
      200,
      { 'content-type': 'application/json' },
      Buffer.from(''),
    ),
  )
  t.equal(empty.statusCode, 200, 'empty json body is not a miss')
  t.strictSame(empty.json(), {}, 'json() parses empty as {}')
  t.end()
})

t.test('validity deadlines are re-evaluated over time', async t => {
  const fresh = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/json',
      date: new Date().toUTCString(),
      'cache-control': 'max-age=2',
    }),
  )
  fresh.addBody(Buffer.from('{"a":1}'))
  t.equal(fresh.valid, true)
  t.equal(fresh.valid, true, 'deadline memoized, still valid')

  const stale = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/json',
      date: new Date(Date.now() - 10_000).toUTCString(),
      'cache-control': 'max-age=1, stale-while-revalidate=12',
    }),
  )
  stale.addBody(Buffer.from('{"a":1}'))
  t.equal(stale.valid, false)
  t.equal(stale.staleWhileRevalidate, true)
  t.equal(stale.staleWhileRevalidate, true, 'deadline memoized')

  // entries held in memory (e.g. by the decoded-entry memo in a
  // long-lived process) must still expire once their deadline passes
  await new Promise(res => setTimeout(res, 2600))
  t.equal(fresh.valid, false, 'expires after max-age passes')
  t.equal(
    stale.staleWhileRevalidate,
    false,
    'swr window closes after its deadline passes',
  )
})

t.test('gunzip bomb rejected', t => {
  const c = new CacheEntry(
    200,
    toRawHeaders({ 'content-encoding': 'gzip' }),
  )
  c.addBody(gzipSync(Buffer.alloc(2 * 1024 * 1024)))
  t.throws(() => c.unzip(), {
    message: 'cache entry exceeds maximum unpacked size',
  })
  t.end()
})

t.test('non-bomb gunzip errors pass through', t => {
  const c = new CacheEntry(
    200,
    toRawHeaders({ 'content-encoding': 'gzip' }),
  )
  c.addBody(Buffer.from([0x1f, 0x8b, 0xff, 0xff, 0xff, 0xff]))
  t.throws(() => c.unzip(), {
    message: 'unknown compression method',
  })
  t.end()
})

t.test('VLT_TAR_MAX_UNPACKED_BYTES caps unzip', async t => {
  process.env.VLT_TAR_MAX_UNPACKED_BYTES = '4'
  t.teardown(() => delete process.env.VLT_TAR_MAX_UNPACKED_BYTES)
  const { CacheEntry } = await t.mockImport<
    typeof import('../src/cache-entry.ts')
  >('../src/cache-entry.ts')
  const c = new CacheEntry(
    200,
    toRawHeaders({ 'content-encoding': 'gzip' }),
  )
  c.addBody(gzipSync(Buffer.from('hello, world')))
  t.throws(() => c.unzip(), {
    message: 'cache entry exceeds maximum unpacked size',
  })
})
