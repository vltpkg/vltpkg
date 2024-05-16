import { createServer } from 'http'
import t from 'tap'
import { gzipSync } from 'zlib'
import { RegistryClient } from '../src/index.js'

const PORT = (t.childId ?? 0) + 8080

// need to keep the fixture, because the cache-unzip operation will
// cause the rmdir to fail with ENOTEMPTY sporadically.
t.saveFixture = true

const etag = '"an etag is a gate in reverse, think about it"'
const date = new Date('2023-01-20')
const registry = createServer((req, res) => {
  res.setHeader('connection', 'close')
  res.setHeader('date', new Date().toUTCString())
  const { url = '' } = req
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
    res.statusCode = 306
    return res.end('not modified (and this is not valid json)')
  }
  const ifs = req.headers['if-modified-since']
  if (ifs) {
    const difs = new Date(ifs)
    if (difs > date) {
      res.statusCode = 306
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
    res.setHeader('content-type', 'application/octet-stream')
  }
  res.setHeader('content-length', resp.length)
  res.setHeader('content-encoding', 'gzip')
  res.end(resp)
})

const registryURL = `http://localhost:${PORT}`

t.teardown(() => registry.close())
t.before(
  async () => await new Promise<void>(r => registry.listen(PORT, r)),
)

t.test('make a request', { saveFixture: true }, async t => {
  const rc = new RegistryClient({ cache: t.testdir() })
  const [result, result2] = await Promise.all([
    rc.request(`${registryURL}/abbrev`),
    rc.request(`${registryURL}/abbrev`),
  ])

  t.strictSame(result.json(), { hello: 'world' })
  t.strictSame(result2.json(), { hello: 'world' })

  const res2 = await rc.request(`${registryURL}/abbrev`)
  t.strictSame(res2.json(), { hello: 'world' })
})

t.test('register unzipping for gzip responses', async t => {
  const registered: [string, string][] = []
  const register = (path: string, key: string) =>
    registered.push([path, key])
  const { RegistryClient } = await t.mockImport('../src/index.js', {
    '@vltpkg/cache-unzip': { register },
  })
  const rc = new RegistryClient({ cache: t.testdir() })
  const res = await rc.request(`${registryURL}/some/tarball`)
  t.equal(res.statusCode, 200)
  t.equal(res.isGzip, true)
  // only registers AFTER it's been written fully to the cache
  await rc.cache.promise()
  t.strictSame(registered, [
    [
      t.testdirName,
      JSON.stringify([
        `${registryURL}`,
        'GET',
        '/some/tarball',
        null,
      ]),
    ],
  ])
})

t.test('follow redirects', { saveFixture: true }, async t => {
  t.test(
    'polite number of redirections',
    { saveFixture: true },
    async t => {
      const rc = new RegistryClient({ cache: t.testdir() })
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
    const rc = new RegistryClient({ cache: t.testdir() })
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
      t.rejects(rc.request(`${registryURL}/${u}`), {
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
    const rc = new RegistryClient({ cache: t.testdir() })
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
          const rc = new RegistryClient({ cache: t.testdir() })
          const res = await rc.request(`${registryURL}/${u}`, {
            maxRedirections: 0,
          })
          t.strictSame(res.statusCode, code)
          t.equal(
            String(res.getHeader('location')),
            `/${code}-${type}4`,
          )
          t.end()
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
    const { userAgent } = await t.mockImport('../src/index.js')
    t.match(
      userAgent,
      /^@vltpkg\/registry-client\/[^ ]+ navUA$/,
      'navigator.userAgent present',
    )
  })

  t.test('no navigator.userAgent', t => {
    t.intercept(globalThis, 'navigator', { value: null })

    t.test('bun', async t => {
      const { userAgent } = await t.mockImport('../src/index.js', {
        bun: { default: { version: 'bunver' }}
      })
      t.match(userAgent,
        /^@vltpkg\/registry-client\/[^ ]+ Bun\/bunver$/
      )
    })

    t.test('bun', async t => {
      //@ts-ignore
      t.intercept(globalThis, 'Deno', { value: {
        deno: { version: 'denover' },
      }})
      const { userAgent } = await t.mockImport('../src/index.js')
      t.match(userAgent,
        /^@vltpkg\/registry-client\/[^ ]+ Deno\/denover$/
      )
    })

    t.test('node', async t => {
      //@ts-ignore
      t.intercept(process, 'version', { value:
        'nodever',
      })
      const { userAgent } = await t.mockImport('../src/index.js')
      t.match(userAgent,
        /^@vltpkg\/registry-client\/[^ ]+ Node.js\/nodever$/
      )
    })

    t.test('nothing we know about', async t => {
      //@ts-ignore
      t.intercept(process, 'version', { value: ''})
      const { userAgent } = await t.mockImport('../src/index.js')
      t.match(userAgent,
        /^@vltpkg\/registry-client\/[^ ]+ \(unknown platform\)$/
      )
    })

    t.end()
  })

  t.end()
})
