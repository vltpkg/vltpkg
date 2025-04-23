import type { Cache } from '@vltpkg/cache'
import { createServer } from 'http'
import EventEmitter from 'node:events'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import type { Test } from 'tap'
import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import type {
  RegistryClient,
  RegistryClientRequestOptions,
} from '../src/index.ts'
import { toRawHeaders } from './fixtures/to-raw-headers.ts'

const PORT = (t.childId || 0) + 8080

const etag = '"an etag is a gate in reverse, think about it"'
const date = new Date(Date.now() - 1000 * 10 * 60)
let dropConnection = false

const opened: Record<string, boolean> = {}
const urlOpenEE = new EventEmitter<{
  login: [url: string]
}>()

const mockUrlOpen = {
  urlOpen: async (url: string) => {
    const match = /npm_Yy[0-9]+$/.exec(url)
    if (!match) throw new Error('invalid login url')
    opened[match[0]] = true
    urlOpenEE.emit('login', match[0])
  },
}

const dir = t.testdir()
process.env.XDG_CONFIG_HOME = dir
process.env.XDG_CACHE_HOME = dir
process.env.XDG_DATA_HOME = dir
process.env.XDG_STATE_HOME = dir
process.env.XDG_RUNTIME_HOME = dir

// mock function, just sets the npm-otp header
const otplease = async (
  _client: any,
  options: RegistryClientRequestOptions,
  _response: any,
): Promise<RegistryClientRequestOptions | undefined> => {
  if (!options.otp) return { ...options, otp: 'hello' }
}

let doneUrlRetry: boolean | string = false
let doneUrlFail = false
let doneUrlInvalid = false

const tokensActions: [string, string][] = []

const registry = createServer((req, res) => {
  if (dropConnection) {
    dropConnection = false
    return setTimeout(() => req.socket.destroy())
  }
  res.setHeader('connection', 'close')
  res.setHeader('date', new Date().toUTCString())
  const { url = '' } = req

  if (url.startsWith('/-/put')) {
    return res.end(
      '{"ok": true, "method": "' + String(req.method) + '"}',
    )
  }

  if (url.startsWith('/-/npm/v1/tokens')) {
    tokensActions.push([
      req.method ?? 'wat!?',
      url.substring('/-/npm/v1/tokens'.length),
    ])
    if (req.method === 'GET' && url === '/-/npm/v1/tokens') {
      return res.end(
        JSON.stringify({
          objects: [
            {
              token: 'npm_xX',
              key: 'deadbeefcafebad',
            },
          ],
          urls: {
            next: String(
              new URL('/-/npm/v1/tokens/page/2', registryURL),
            ),
          },
        }),
      )
    } else if (req.method === 'GET') {
      return res.end(
        JSON.stringify({
          objects: [
            {
              token: 'npm_Yy',
              key: 'this is a key i supoise',
            },
          ],
          urls: {},
        }),
      )
    } else {
      return res.end('{}')
    }
  }

  if (url.startsWith('/-/401')) {
    if (req.headers['npm-otp']) {
      return res.end('{"status":"ok"}')
    } else {
      res.statusCode = 401
      res.setHeader('www-authenticate', 'otp')
      return res.end('{"needs":"otp"}')
    }
  }

  if (/^\/-\/v1\/login$/.test(url)) {
    const tok =
      'npm_Yy' + String(Math.random()).replace(/[^0-9]+/g, '')
    return res.end(
      JSON.stringify({
        doneUrl: `${registryURL}/-/weblogin-done-url/${tok}`,
        loginUrl: `${registryURL}/-/weblogin-login-url/${tok}`,
      }),
    )
  }

  if (/^\/-\/weblogin-done-url\/.*$/.test(url)) {
    const match = /npm_Yy[0-9]+$/.exec(url)
    if (!match) {
      res.statusCode = 403
      return res.end(JSON.stringify({ error: 'invalid login url' }))
    }
    if (doneUrlInvalid) {
      doneUrlInvalid = false
      res.statusCode = 200
      return res.end('{"no":"token here"}')
    }
    if (doneUrlFail) {
      doneUrlFail = false
      res.statusCode = 403
      return res.end('{"no":"way"}')
    }
    if (doneUrlRetry) {
      res.statusCode = 202
      if (typeof doneUrlRetry === 'string') {
        res.setHeader('retry-after', doneUrlRetry)
      }
      doneUrlRetry = false
      return res.end()
    }
    const tok = match[0]
    const handler = (tokenOpened: string) => {
      if (tokenOpened !== tok) return
      urlOpenEE.removeListener('login', handler)
      res.end(JSON.stringify({ token: tok }))
    }
    urlOpenEE.on('login', handler)
    if (opened[tok]) urlOpenEE.emit('login', tok)
    return
  }

  if (/^\/30[0-9]-redirect/.test(url)) {
    const statusCode = parseInt(url.substring(1, 4), 10)
    const n = parseInt(url.substring('/3xx-redirect'.length), 10)
    const location =
      n >= 1 ? `/${statusCode}-redirect${n - 1}` : `/abbrev`
    res.statusCode = statusCode
    res.setHeader('location', location)
    return res.end(JSON.stringify({ location }))
  }

  if (/^\/30[0-9]-cycle/.test(url)) {
    const statusCode = parseInt(url.substring(1, 4), 10)
    const n = parseInt(url.substring('/3xx-cycle'.length), 10)
    const location =
      n >= 1 ?
        `/${statusCode}-cycle${n - 1}`
      : `/${statusCode}-cycle4`
    res.statusCode = statusCode
    res.setHeader('location', location)
    return res.end(JSON.stringify({ location }))
  }

  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304
    return res.end('not modified (and this is not valid json)')
  }

  const ifs = req.headers['if-modified-since']
  if (ifs) {
    const difs = new Date(ifs)
    if (difs > date) {
      res.statusCode = 304
      return res.end()
    }
  }

  t.equal(
    req.headers['accept-encoding'],
    'gzip;q=1.0, identity;q=0.5',
  )
  t.match(
    req.headers['user-agent'],
    '@vltpkg/registry-client',
    'got a user-agent header',
  )

  res.setHeader('etag', etag)
  res.setHeader('last-modified', date.toUTCString())
  let resp: Buffer
  if (req.url === '/abbrev') {
    resp = gzipSync(Buffer.from(JSON.stringify({ hello: 'world' })))
    res.setHeader('content-type', 'application/json')
  } else {
    resp = gzipSync(Buffer.from('this is a tarball lets pretend'))
    const ai = req.headers['accept-integrity']
    if (
      ai &&
      ai !==
        'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000=='
    ) {
      res.statusCode = 406
      res.setHeader('content-type', 'application/json')
      return res.end(
        JSON.stringify({
          agent: 'lemongrab',
          castle: { condition: 'UNACCEPTABLE' },
          who: { did: 'THE THING!!!!!' },
        }),
      )
    }
    res.setHeader(
      'integrity',
      'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==',
    )

    res.setHeader('content-type', 'application/octet-stream')
  }
  res.setHeader('content-length', resp.length)
  res.setHeader('content-encoding', 'gzip')
  res.end(resp)
})

const registryURL = `http://localhost:${PORT}`

const unzipRegistered: [string, string][] = []
const unzipRegister = (path: string, key: string) =>
  unzipRegistered.push([path, key])

const revalRegistered: [string, 'GET' | 'HEAD', string | URL][] = []
const revalRegister = (
  path: string,
  method: 'GET' | 'HEAD',
  url: string | URL,
) => revalRegistered.push([path, method, url])

t.beforeEach(t => {
  unzipRegistered.length = 0
  // verify that it works even if connections get dropped sometimes
  dropConnection = true
  tokensActions.length = 0
  // create a registry client for each test based on its testdir
  t.context.rc = new RC({ cache: t.testdir() })
})

t.afterEach(async t => {
  // always wait for the cache to resolve before trying to clean up
  await (t.context.rc as RegistryClient).cache.promise()
})

const mockCacheUnzip = { register: unzipRegister }
const mockCacheReval = { register: revalRegister }

const mockIndex = async (t: Test, mocks?: Record<string, any>) =>
  t.mockImport<typeof import('../src/index.ts')>('../src/index.ts', {
    // always get fresh copy of env since it reads globalThis
    '../src/env.ts':
      await t.mockImport<typeof import('../src/env.ts')>(
        '../src/env.ts',
      ),
    '@vltpkg/cache-unzip': mockCacheUnzip,
    '../src/cache-revalidate.ts': mockCacheReval,
    '@vltpkg/url-open': mockUrlOpen,
    '../src/otplease.ts': { otplease },
    ...mocks,
  })

// default ones to use for tests that don't need their own mocks
const { RegistryClient: RC, getKC } = await mockIndex(t)

t.teardown(() => registry.close())

t.before(
  async () => await new Promise<void>(r => registry.listen(PORT, r)),
)

t.test('make a request', { saveFixture: true }, async t => {
  const rc = t.context.rc as RegistryClient
  const [result, result2] = await Promise.all([
    rc.request(`${registryURL}/abbrev`),
    rc.request(`${registryURL}/abbrev`),
  ])

  t.strictSame(result.json(), { hello: 'world' })
  t.strictSame(result2.json(), { hello: 'world' })

  const res2 = await rc.request(`${registryURL}/abbrev`)
  t.strictSame(res2.json(), { hello: 'world' })

  // make it look like an old cache entry that's an etag match
  res2.setHeader('date', new Date('2020-01-01').toISOString())
  const key = `${registryURL}/abbrev`
  rc.cache.set(key, res2.encode())

  // make a cache hit request
  const hit = await rc.request(`${registryURL}/abbrev`)
  t.strictSame(hit, res2)
})

t.test('register unzipping for gzip responses', async t => {
  const rc = t.context.rc as RegistryClient
  const res = await rc.request(`${registryURL}/some/tarball`)
  t.equal(res.statusCode, 200)
  t.equal(res.isGzip, true)
  // only registers AFTER it's been written fully to the cache
  await rc.cache.promise()
  t.strictSame(unzipRegistered, [
    [
      resolve(t.testdirName, 'registry-client'),
      String(new URL('/some/tarball', registryURL)),
    ],
  ])
})

t.test('integrity http header handling', async t => {
  const rc = t.context.rc as RegistryClient
  const ok = await rc.request(`${registryURL}/some/tarball`, {
    integrity:
      'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==',
  })
  t.equal(
    ok.integrity,
    'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==',
  )
  const notOk = await rc.request(
    `${registryURL}/some/other/tarball`,
    {
      integrity:
        'sha512-11111111111111111111111111111111111111111111111111111111111111111111111111111111111111==',
    },
  )
  t.match(notOk, { statusCode: 406 })
  await rc.cache.promise()
})

t.test('follow redirects', { saveFixture: true }, async t => {
  t.test(
    'polite number of redirections',
    { saveFixture: true },
    async t => {
      const rc = t.context.rc as RegistryClient
      const urls = [
        '301-redirect3',
        '302-redirect3',
        '303-redirect3',
        '307-redirect3',
        '308-redirect3',
      ]
      t.plan(urls.length)
      for (const u of urls) {
        t.strictSame(
          (await rc.request(`${registryURL}/${u}`)).json(),
          {
            hello: 'world',
          },
        )
      }
    },
  )

  t.test('too many redirections', { saveFixture: true }, async t => {
    const rc = t.context.rc as RegistryClient
    const urls = [
      '301-redirect300',
      '302-redirect300',
      '303-redirect300',
      '307-redirect300',
      '308-redirect300',
      '301-cycle300',
      '302-cycle300',
      '303-cycle300',
      '307-cycle300',
      '308-cycle300',
    ]
    t.plan(urls.length)
    for (const u of urls) {
      await t.rejects(rc.request(`${registryURL}/${u}`), {
        message: 'Maximum redirections exceeded',
        cause: {
          found: Array,
        },
      })
    }
  })

  t.test('redirection cycles', async t => {
    const urls = [
      '301-cycle5',
      '302-cycle5',
      '303-cycle5',
      '307-cycle5',
      '308-cycle5',
      '301-cycle0',
      '302-cycle0',
      '303-cycle0',
      '307-cycle0',
      '308-cycle0',
    ]
    t.plan(urls.length)
    const rc = t.context.rc as RegistryClient
    for (const u of urls) {
      await t.rejects(
        rc.request(`${registryURL}/${u}`),
        {
          message: 'Redirection cycle detected',
          cause: {
            found: Array,
          },
        },
        u,
      )
    }
  })

  t.test('no redirections, just return the 3xx response', t => {
    const codes = [301, 302, 303, 307, 308]
    const types = ['redirect', 'cycle']
    t.plan(codes.length * types.length)
    for (const code of codes) {
      for (const type of types) {
        const u = `${code}-${type}5`
        t.test(u, { saveFixture: true }, async t => {
          const rc = t.context.rc as RegistryClient
          const res = await rc.request(`${registryURL}/${u}`, {
            maxRedirections: 0,
          })
          t.strictSame(res.statusCode, code)
          t.equal(
            String(res.getHeader('location')),
            `/${code}-${type}4`,
          )
        })
      }
    }
  })
})

t.test('user-agent', t => {
  t.test('with navigator.userAgent', async t => {
    t.intercept(globalThis, 'navigator', {
      value: { userAgent: 'navUA' },
    })
    const { userAgent } = await mockIndex(t)
    t.match(
      userAgent,
      /^@vltpkg\/registry-client\/[^ ]+ navUA$/,
      'navigator.userAgent present',
    )
  })

  t.test('no navigator.userAgent', t => {
    t.intercept(globalThis, 'navigator', { value: null })

    t.test('bun', async t => {
      t.intercept(
        globalThis as typeof globalThis & { Bun: any },
        'Bun',
        { value: {} },
      )
      t.intercept(process, 'versions', {
        value: { bun: 'bunver' },
      })
      const { userAgent } = await mockIndex(t)
      t.match(
        userAgent,
        /^@vltpkg\/registry-client\/[^ ]+ Bun\/bunver$/,
      )
    })

    t.test('deno', async t => {
      t.intercept(
        globalThis as typeof globalThis & { Deno: any },
        'Deno',
        { value: {} },
      )
      t.intercept(process, 'versions', {
        value: { deno: 'denover' },
      })
      const { userAgent } = await mockIndex(t)
      t.match(
        userAgent,
        /^@vltpkg\/registry-client\/[^ ]+ Deno\/denover$/,
      )
    })

    t.test('node', async t => {
      t.intercept(process, 'versions', {
        value: { node: 'nodever' },
      })
      const { userAgent } = await mockIndex(t)
      t.match(
        userAgent,
        /^@vltpkg\/registry-client\/[^ ]+ Node.js\/nodever$/,
      )
    })

    t.test('nothing we know about', async t => {
      t.intercept(process, 'versions', { value: {} })
      const { userAgent } = await mockIndex(t)
      t.match(
        userAgent,
        /^@vltpkg\/registry-client\/[^ ]+ \(unknown platform\)$/,
      )
    })

    t.end()
  })

  t.end()
})

t.test('client.login()', async t => {
  // login is actually not resilient to dropped connections, by design
  dropConnection = false
  const rc = t.context.rc as RegistryClient
  await rc.login(registryURL)
  await getKC('').save()
  const auths = JSON.parse(
    readFileSync(resolve(dir, 'vlt/auth/keychain.json'), 'utf8'),
  )
  t.matchOnlyStrict(
    auths,
    {
      [new URL(registryURL).origin]: /^Bearer npm_Yy[0-9]+$/,
    },
    'saved auth to keychain',
  )
})

t.test('client.login() with immediate retry', async t => {
  // login is actually not resilient to dropped connections, by design
  dropConnection = false
  doneUrlRetry = true
  const rc = t.context.rc as RegistryClient
  await rc.login(registryURL)
  await getKC('').save()
  const auths = JSON.parse(
    readFileSync(resolve(dir, 'vlt/auth/keychain.json'), 'utf8'),
  )
  t.matchOnlyStrict(
    auths,
    {
      [new URL(registryURL).origin]: /^Bearer npm_Yy[0-9]+$/,
    },
    'saved auth to keychain',
  )
})

t.test('client.login() with 100ms delayed retry', async t => {
  // login is actually not resilient to dropped connections, by design
  dropConnection = false
  doneUrlRetry = '0.1'
  const rc = t.context.rc as RegistryClient
  await rc.login(registryURL)
  await getKC('').save()
  const auths = JSON.parse(
    readFileSync(resolve(dir, 'vlt/auth/keychain.json'), 'utf8'),
  )
  t.matchOnlyStrict(
    auths,
    {
      [new URL(registryURL).origin]: /^Bearer npm_Yy[0-9]+$/,
    },
    'saved auth to keychain',
  )
})

t.test('client.logout()', async t => {
  dropConnection = false
  const rc = t.context.rc as RegistryClient
  await rc.logout(registryURL)
  await getKC('').save()
  // do it again just to hit the 'no token' use case
  await rc.logout(registryURL)
  // do it again to hit the 'have token, but not on the server' case
  getKC('').set(registryURL, 'Bearer some-invalid-token')
  await rc.logout(registryURL)
  t.equal(await getKC('').get(registryURL), undefined)
  t.strictSame(
    new Set(tokensActions),
    new Set([
      ['GET', ''],
      ['GET', '/page/2'],
      ['DELETE', '/token/this%20is%20a%20key%20i%20supoise'],
      ['GET', ''],
      ['GET', '/page/2'],
    ]),
  )
})

t.test('client.login() with doneUrl invalid response', async t => {
  // login is actually not resilient to dropped connections, by design
  dropConnection = false
  doneUrlInvalid = true
  const rc = t.context.rc as RegistryClient
  await t.rejects(rc.login(registryURL))
})

t.test('client.login() with doneUrl failure status code', async t => {
  // login is actually not resilient to dropped connections, by design
  dropConnection = false
  doneUrlFail = true
  const rc = t.context.rc as RegistryClient
  await t.rejects(rc.login(registryURL))
})

t.test('401 prompting otplease', async t => {
  dropConnection = false
  const rc = t.context.rc as RegistryClient
  const result = await rc.request(
    new URL('/-/401/yolo', registryURL),
    { useCache: false },
  )
  t.match(result, { statusCode: 200 })
})

t.test('sending request with PUT method', async t => {
  // this provides coverage for the "no default cache except HEAD/GET" path
  const rc = t.context.rc as RegistryClient
  const result = await rc.request(new URL('/-/put', registryURL), {
    method: 'PUT',
  })
  t.strictSame(result.json(), { ok: true, method: 'PUT' })
})

t.test('identity', async t => {
  const rc = new RC({ identity: 'crisis' })
  t.equal(rc.identity, 'crisis')
})

t.test('staleWhileRevalidate', async t => {
  const rc = t.context.rc as RegistryClient
  // got the entry 10 minutes ago, no strictly valid, but swv ok
  const date = String(new Date(Date.now() - 100 * 60 * 1000))
  const swvEntry = new CacheEntry(
    200,
    toRawHeaders({
      date,
      'cache-control': 'maxage=300',
      'content-type': 'application/json',
    }),
  )
  swvEntry.addBody(Buffer.from('{"ok":true}'))

  const cache = rc.cache
  const staleCache = {
    path: () => cache.path(),
    fetch: async () => {
      // rc.cache = cache
      return swvEntry.encode()
    },
    promise: async () => {},
    set: () => {},
  } as unknown as Cache
  rc.cache = staleCache

  const stale = await rc.request(new URL('/abbrev', registryURL))
  t.strictSame(stale.body, { ok: true })
  t.equal(stale.staleWhileRevalidate, true)
  t.equal(stale.valid, false)
  t.strictSame(revalRegistered, [
    [dirname(cache.path()), 'GET', new URL('/abbrev', registryURL)],
  ])

  rc.cache = staleCache
  const refreshNow = await rc.request(
    new URL('/abbrev', registryURL),
    {
      staleWhileRevalidate: false,
    },
  )
  t.strictSame(
    refreshNow.body,
    { hello: 'world' },
    'revalidated, got fresh response',
  )
  await cache.promise()
})
