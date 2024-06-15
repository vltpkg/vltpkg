import { Cache } from '@vltpkg/cache'
import { Readable } from 'stream'
import t from 'tap'
import { Dispatcher } from 'undici'
import { CacheEntry } from '../src/cache-entry.js'
import { cacheInterceptor } from '../src/cache-interceptor.js'

const accept = 'application/vnd.npm.install-v1+json;q=1, *;q=0.5'

const toRawHeaders = (h: Record<string, string>): Buffer[] => {
  const r: Buffer[] = []
  for (const [k, v] of Object.entries(h)) {
    r.push(Buffer.from(k), Buffer.from(v))
  }
  return r
}

t.test('not get/head, just pass along', t => {
  let dispatchCalled = false
  const handler: Dispatcher.DispatchHandlers = {}
  const opts: Dispatcher.DispatchOptions & { cache: Cache } = {
    cache: new Cache({ path: t.testdir() }),
    origin: 'registry.npmjs.org',
    path: '/abbrev',
    method: 'PUT',
    body: Buffer.from('new abbrev packument so nice'),
    headers: [],
  }

  const d = cacheInterceptor(() => (dispatchCalled = true))
  d(opts, handler)
  t.equal(dispatchCalled, true)
  t.end()
})

t.test('GET request', t => {
  const cache = new Cache({ path: t.testdir() })
  const handler: Dispatcher.DispatchHandlers = {}
  const origin = 'registry.npmjs.org'
  const path = '/abbrev'
  const method = 'GET'
  const headers = { accept }

  const opts: Dispatcher.DispatchOptions & { cache: Cache } = {
    cache,
    origin,
    path,
    method,
    headers,
  }

  const d = cacheInterceptor((o, h) => {
    t.equal(o, opts)
    t.not(h, handler)
    t.end()
    return true
  })
  d(opts, handler)
})

t.test('GET request from cache, no etag, no date', async t => {
  const cache = new Cache({ path: t.testdir() })
  const handler: Dispatcher.DispatchHandlers = {}
  const origin = 'registry.npmjs.org'
  const path = '/abbrev'
  const method = 'GET'
  const headers = { accept }

  const key = JSON.stringify([origin, method, path, accept])
  const entry = new CacheEntry(200, toRawHeaders(headers))
  cache.set(key, entry.encode())
  await cache.promise()

  const opts: Dispatcher.DispatchOptions & { cache: Cache } = {
    cache,
    origin,
    path,
    method,
    headers,
  }

  return await new Promise<void>(res => {
    const d = cacheInterceptor((o, h) => {
      t.equal(o, opts)
      t.not(h, handler)
      res()
      return true
    })
    d(opts, handler)
  })
})

t.test('GET request from cache, etag, no date', async t => {
  const cache = new Cache({ path: t.testdir() })
  const handler: Dispatcher.DispatchHandlers = {}
  const origin = 'registry.npmjs.org'
  const path = '/abbrev'
  const method = 'GET'
  const etag = '"frow frow frow"'
  const headers = { accept }

  const key = JSON.stringify([origin, method, path, accept])
  const entry = new CacheEntry(200, toRawHeaders({ etag }))
  entry.addBody(Buffer.from('{"some":"json"}'))
  cache.set(key, entry.encode())
  await cache.promise()

  const opts: Dispatcher.DispatchOptions & { cache: Cache } = {
    cache,
    origin,
    path,
    method,
    headers,
  }

  return await new Promise<void>(res => {
    const d = cacheInterceptor((o, h) => {
      t.equal(o, opts)
      t.strictSame(opts.headers, { accept, 'if-none-match': etag })
      t.not(h, handler)
      res()
      return true
    })
    d(opts, handler)
  })
})

t.test('GET request from cache, date, no etag', async t => {
  const cache = new Cache({ path: t.testdir() })
  const handler: Dispatcher.DispatchHandlers = {}
  const origin = 'registry.npmjs.org'
  const path = '/abbrev'
  const method = 'GET'
  const date = new Date('2023-01-01').toUTCString()
  const headers = { accept }

  const key = JSON.stringify([origin, method, path, accept])
  const entry = new CacheEntry(200, toRawHeaders({ date }))
  entry.addBody(Buffer.from('{"some":"json"}'))
  cache.set(key, entry.encode())
  await cache.promise()

  const opts: Dispatcher.DispatchOptions & { cache: Cache } = {
    cache,
    origin,
    path,
    method,
    headers,
  }

  return await new Promise<void>(res => {
    const d = cacheInterceptor((o, h) => {
      t.equal(o, opts)
      t.strictSame(opts.headers, {
        accept,
        'if-modified-since': date,
      })
      t.not(h, handler)
      res()
      return true
    })
    d(opts, handler)
  })
})

t.test('GET request from cache, date and etag', async t => {
  // this is the most common case, actually
  const cache = new Cache({ path: t.testdir() })
  const handler: Dispatcher.DispatchHandlers = {}
  const origin = 'registry.npmjs.org'
  const path = '/abbrev'
  const method = 'GET'
  const etag = '"frow frow frow"'
  const date = new Date('2023-01-01').toUTCString()
  const headers = { accept }

  const key = JSON.stringify([origin, method, path, accept])
  const entry = new CacheEntry(
    200,
    toRawHeaders({ 'last-modified': date, etag }),
  )
  entry.addBody(Buffer.from('{"some":"json"}'))
  cache.set(key, entry.encode())
  await cache.promise()

  const opts: Dispatcher.DispatchOptions & { cache: Cache } = {
    cache,
    origin,
    path,
    method,
    headers,
  }

  return await new Promise<void>(res => {
    const d = cacheInterceptor((o, h) => {
      t.equal(o, opts)
      t.strictSame(opts.headers, {
        accept,
        'if-modified-since': date,
        'if-none-match': etag,
      })
      t.not(h, handler)
      res()
      return true
    })
    d(opts, handler)
  })
})

t.test('GET request from cache, valid cache entry', async t => {
  // this is the most common case, actually
  const cache = new Cache({ path: t.testdir() })
  let calls = 0
  const handler: Dispatcher.DispatchHandlers = {
    onConnect(abort) {
      calls++
      t.match(abort, Function)
    },
    onHeaders(statusCode, headers, resume, statusText) {
      calls++
      t.equal(statusCode, 200)
      t.strictSame(
        headers,
        entry.headers.concat([
          Buffer.from('content-length'),
          Buffer.from(String(entry.buffer().byteLength)),
        ]),
      )
      t.match(resume, Function)
      t.ok(statusText, 'OK')
      return true
    },
    onData(chunk) {
      calls++
      t.strictSame(chunk, Buffer.from('{"some":"json"}'))
      return true
    },
    onComplete() {
      calls++
      t.equal(calls, 4)
      t.end()
    },
  }
  const origin = 'registry.npmjs.org'
  const path = '/abbrev'
  const method = 'GET'
  const etag = '"frow frow frow"'
  const date = new Date('2023-01-01').toUTCString()
  const headers = { accept }

  const key = JSON.stringify([origin, method, path, accept])
  const entry = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/octet-stream',
      'cache-control': 'immutable',
    }),
  )
  entry.addBody(Buffer.from('{"some":"json"}'))
  cache.set(key, entry.encode())
  await cache.promise()

  let bodyResumed = false
  const body = {
    resume: () => (bodyResumed = true),
  } as unknown as Readable
  const opts: Dispatcher.DispatchOptions & { cache: Cache } = {
    cache,
    origin,
    path,
    method,
    headers,
    body,
  }

  return await new Promise<void>(res => {
    const d = cacheInterceptor((o, h) => {
      t.equal(o, opts)
      t.strictSame(opts.headers, {
        accept,
        'if-modified-since': date,
        'if-none-match': etag,
      })
      t.not(h, handler)
      t.equal(bodyResumed, true)
      res()
      return true
    })
    d(opts, handler)
    t.throws(() =>
      d(
        //@ts-expect-error
        { ...opts, integrity: 'not valid, no sha512- prefix' },
        handler,
      ),
    )
    t.throws(() =>
      d(
        { ...opts, integrity: 'sha512-also not valid, too short' },
        handler,
      ),
    )
    t.throws(() =>
      d(
        {
          ...opts,
          integrity:
            'sha512-does not end with == XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        },
        handler,
      ),
    )
  })
})
