import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFile, stat, utimes } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { gzipSync } from 'node:zlib'
import type { Test } from 'tap'
import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import { cacheKey, RegistryClient } from '../src/index.ts'
import { revalidateEntry } from '../src/revalidate-entry.ts'
import { toRawHeaders } from './fixtures/to-raw-headers.ts'

t.equal(cacheKey('GET', 'http://x.com/a'), 'http://x.com/a')
t.equal(cacheKey('HEAD', 'http://x.com/a'), 'HEAD http://x.com/a')

const jsonEntry = (
  headers: Record<string, string>,
  body = '{"ok":true}',
) => {
  const e = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/json',
      ...headers,
    }),
  )
  e.addBody(Buffer.from(body))
  return e
}

const listen = async (
  t: Test,
  handler: (req: IncomingMessage, res: ServerResponse) => void,
) => {
  const server = createServer(handler)
  await new Promise<void>(res => server.listen(0, '127.0.0.1', res))
  t.teardown(() => server.close())
  const { port } = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${port}` }
}

const seed = async (
  rc: RegistryClient,
  method: 'GET' | 'HEAD',
  url: string,
  entry: CacheEntry,
) => {
  rc.cache.set(cacheKey(method, url), entry.encode())
  await rc.cache.promise()
}

t.test('missing cache file is a no-op', async t => {
  let hits = 0
  const { url } = await listen(t, (_req, res) => {
    hits++
    res.end('nope')
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  await revalidateEntry(rc, 'GET', `${url}/pkg`)
  t.equal(hits, 0)
})

t.test('truncated cache file is a no-op', async t => {
  let hits = 0
  const { url } = await listen(t, (_req, res) => {
    hits++
    res.end('nope')
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const key = cacheKey('GET', target)
  rc.cache.set(key, Buffer.from('xx'))
  await rc.cache.promise()
  await revalidateEntry(rc, 'GET', target)
  t.equal(hits, 0)
})

t.test('declared head shorter than 7 is a no-op', async t => {
  let hits = 0
  const { url } = await listen(t, (_req, res) => {
    hits++
    res.end('nope')
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const key = cacheKey('GET', target)
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(3, 0)
  rc.cache.set(key, buf)
  await rc.cache.promise()
  await revalidateEntry(rc, 'GET', target)
  t.equal(hits, 0)
})

t.test('incomplete head read is a no-op', async t => {
  let hits = 0
  const { url } = await listen(t, (_req, res) => {
    hits++
    res.end('nope')
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const key = cacheKey('GET', target)
  const buf = Buffer.alloc(10)
  buf.writeUInt32BE(100, 0)
  rc.cache.set(key, buf)
  await rc.cache.promise()
  await revalidateEntry(rc, 'GET', target)
  t.equal(hits, 0)
})

t.test('status 0 head is a no-op', async t => {
  let hits = 0
  const { url } = await listen(t, (_req, res) => {
    hits++
    res.end('nope')
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const key = cacheKey('GET', target)
  const buf = Buffer.alloc(7)
  buf.writeUInt32BE(7, 0)
  buf[4] = 0x30
  buf[5] = 0x30
  buf[6] = 0x30
  rc.cache.set(key, buf)
  await rc.cache.promise()
  await revalidateEntry(rc, 'GET', target)
  t.equal(hits, 0)
})

t.test('304 patches the head in place', async t => {
  const newDate = new Date('2024-06-01T00:00:00.000Z').toUTCString()
  const { url } = await listen(t, (req, res) => {
    t.equal(req.headers['if-none-match'], '"abc"')
    res.statusCode = 304
    res.setHeader('date', newDate)
    res.end()
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const oldDate = new Date('2020-01-01T00:00:00.000Z').toUTCString()
  const entry = jsonEntry({
    date: oldDate,
    etag: '"abc"',
    'cache-control': 'max-age=0',
  })
  await seed(rc, 'GET', target, entry)
  const file = rc.cache.path(cacheKey('GET', target))
  const keyFile = file + '.key'
  const before = await readFile(file)
  const oldMtime = new Date('2021-01-01T00:00:00.000Z')
  await utimes(keyFile, oldMtime, oldMtime)

  await revalidateEntry(rc, 'GET', new URL(target))

  const after = await readFile(file)
  t.equal(after.length, before.length, 'file size unchanged')
  t.strictSame(
    after.subarray(before.readUInt32BE(0)),
    before.subarray(before.readUInt32BE(0)),
    'body bytes unchanged',
  )
  const dec = CacheEntry.decode(after)
  t.equal(dec.getHeaderString('date'), newDate)
  t.strictSame(dec.json(), { ok: true })
  const st = await stat(keyFile)
  t.equal(st.mtimeMs, oldMtime.getTime(), '.key not rewritten')
})

t.test(
  '304 with changed head length falls back to full rewrite',
  async t => {
    const newDate = new Date('2024-06-01T00:00:00.000Z').toUTCString()
    const { url } = await listen(t, (_req, res) => {
      res.statusCode = 304
      res.setHeader('date', newDate)
      res.end()
    })
    const rc = new RegistryClient({ cache: t.testdir() })
    const target = `${url}/pkg`
    const entry = jsonEntry({
      etag: '"abc"',
      'cache-control': 'max-age=0',
    })
    await seed(rc, 'GET', target, entry)
    const file = rc.cache.path(cacheKey('GET', target))
    const keyFile = file + '.key'
    const oldMtime = new Date('2021-01-01T00:00:00.000Z')
    await utimes(keyFile, oldMtime, oldMtime)

    await revalidateEntry(rc, 'GET', target)
    await rc.cache.promise()

    const dec = CacheEntry.decode(await readFile(file))
    t.equal(dec.getHeaderString('date'), newDate)
    t.strictSame(dec.json(), { ok: true })
    const st = await stat(keyFile)
    t.ok(st.mtimeMs > oldMtime.getTime(), '.key rewritten')
  },
)

t.test('304 fallback no-ops if full decode fails', async t => {
  const { url } = await listen(t, (_req, res) => {
    res.statusCode = 304
    res.setHeader('date', new Date().toUTCString())
    res.end()
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const entry = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/json',
      etag: '"abc"',
      'cache-control': 'max-age=0',
    }),
  )
  entry.addBody(Buffer.from('{"a":'))
  rc.cache.set(
    cacheKey('GET', target),
    Buffer.concat([entry.encodeHead(), entry.buffer()]),
  )
  await rc.cache.promise()
  const file = rc.cache.path(cacheKey('GET', target))
  const before = await readFile(file)
  await revalidateEntry(rc, 'GET', target)
  await rc.cache.promise()
  t.strictSame(await readFile(file), before)
})

t.test('200 stores the new unzipped body', async t => {
  const body = Buffer.from('{"hello":"revalidated"}')
  const gz = gzipSync(body)
  const { url } = await listen(t, (_req, res) => {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.setHeader('content-encoding', 'gzip')
    res.setHeader('content-length', String(gz.length))
    res.setHeader('date', new Date().toUTCString())
    res.end(gz)
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  await seed(
    rc,
    'GET',
    target,
    jsonEntry({
      date: new Date('2020-01-01').toUTCString(),
      etag: '"old"',
    }),
  )
  await revalidateEntry(rc, 'GET', target)
  await rc.cache.promise()
  const buf = await rc.cache.fetch(cacheKey('GET', target))
  t.ok(buf)
  t.equal(CacheEntry.isGzipEntry(buf!), false)
  const dec = CacheEntry.decode(buf!)
  t.strictSame(dec.json(), { hello: 'revalidated' })
})

t.test('HEAD 200 leaves the entry untouched', async t => {
  const { url } = await listen(t, (_req, res) => {
    res.statusCode = 200
    res.end('ignored')
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const entry = jsonEntry({
    date: new Date('2020-01-01').toUTCString(),
    etag: '"abc"',
  })
  await seed(rc, 'HEAD', target, entry)
  const file = rc.cache.path(cacheKey('HEAD', target))
  const before = await readFile(file)
  await revalidateEntry(rc, 'HEAD', target)
  t.strictSame(await readFile(file), before)
})

t.test('non-2xx/304 leaves the entry untouched', async t => {
  const { url } = await listen(t, (_req, res) => {
    res.statusCode = 500
    res.end('err')
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  await seed(
    rc,
    'GET',
    target,
    jsonEntry({
      date: new Date('2020-01-01').toUTCString(),
      etag: '"abc"',
    }),
  )
  const file = rc.cache.path(cacheKey('GET', target))
  const before = await readFile(file)
  await revalidateEntry(rc, 'GET', target)
  t.strictSame(await readFile(file), before)
})

t.test('412 patches like 304', async t => {
  const newDate = new Date('2025-06-01T00:00:00.000Z').toUTCString()
  const { url } = await listen(t, (_req, res) => {
    res.statusCode = 412
    res.setHeader('date', newDate)
    res.end()
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const oldDate = new Date('2020-01-01T00:00:00.000Z').toUTCString()
  await seed(
    rc,
    'GET',
    target,
    jsonEntry({ date: oldDate, etag: '"abc"' }),
  )
  await revalidateEntry(rc, 'GET', target)
  const dec = CacheEntry.decode(
    await readFile(rc.cache.path(cacheKey('GET', target))),
  )
  t.equal(dec.getHeaderString('date'), newDate)
})

t.test('200 identity body without content-length', async t => {
  const { url } = await listen(t, (_req, res) => {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.write('{"n":1}')
    res.end()
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  await seed(
    rc,
    'GET',
    target,
    jsonEntry({
      date: new Date('2020-01-01').toUTCString(),
      etag: '"old"',
    }),
  )
  await revalidateEntry(rc, 'GET', target)
  await rc.cache.promise()
  const buf = await rc.cache.fetch(cacheKey('GET', target))
  t.strictSame(CacheEntry.decode(buf!).json(), { n: 1 })
})

t.test('200 unzip failure leaves the entry', async t => {
  const { url } = await listen(t, (_req, res) => {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.setHeader('content-encoding', 'gzip')
    res.end(Buffer.from([0x1f, 0x8b, 0xff, 0xff]))
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  await seed(
    rc,
    'GET',
    target,
    jsonEntry({
      date: new Date('2020-01-01').toUTCString(),
      etag: '"old"',
    }),
  )
  const file = rc.cache.path(cacheKey('GET', target))
  const before = await readFile(file)
  await revalidateEntry(rc, 'GET', target)
  t.strictSame(await readFile(file), before)
})

t.test('network errors are swallowed', async t => {
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = 'http://127.0.0.1:1/pkg'
  await seed(rc, 'GET', target, jsonEntry({ etag: '"abc"' }))
  await revalidateEntry(rc, 'GET', target)
  t.pass('did not throw')
})

t.test('304 without date header uses now', async t => {
  const { url } = await listen(t, (_req, res) => {
    res.statusCode = 304
    res.end()
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const target = `${url}/pkg`
  const oldDate = new Date('2020-01-01T00:00:00.000Z').toUTCString()
  await seed(
    rc,
    'GET',
    target,
    jsonEntry({ date: oldDate, etag: '"abc"' }),
  )
  const before = Date.now()
  await revalidateEntry(rc, 'GET', target)
  const dec = CacheEntry.decode(
    await readFile(rc.cache.path(cacheKey('GET', target))),
  )
  const d = new Date(dec.getHeaderString('date') ?? 0).getTime()
  t.ok(d >= before - 1000, 'date bumped to now')
})
