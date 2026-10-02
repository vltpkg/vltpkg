import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Test } from 'tap'
import t from 'tap'
import { PackageInfoClient, Registry } from '../src/index.ts'

// What the server answers next, and what it was asked along the way.
const full = JSON.stringify({
  manifests: '0.1',
  resolve: '0.1',
  'stable-filter': '1.0',
  mimeTypes: [
    'application/vnd.vlt.packument-v1+json',
    'application/vnd.npm.install-v1+json',
    'application/json',
  ],
})
let body: string | undefined = full
let requests = 0
let delay = 0

const server = createServer((req, res) => {
  if (req.url !== '/-/vlt/capabilities') {
    res.statusCode = 404
    return res.end('{}')
  }
  requests++
  const respond = () => {
    if (body === undefined) {
      res.statusCode = 404
      res.setHeader('content-type', 'application/json')
      return res.end('{"error":"not found"}')
    }
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    // the same day of max-age the registry serves, so the disk cache
    // behind the client answers every later ask
    res.setHeader('cache-control', 'public, max-age=86400')
    res.end(body)
  }
  if (delay) setTimeout(respond, delay)
  else respond()
})

t.before(
  () => new Promise<void>(res => server.listen(0, '127.0.0.1', res)),
)
t.teardown(() => server.close())

const url = () =>
  `http://127.0.0.1:${(server.address() as AddressInfo).port}/`

const client = (t: Test) => {
  // flush the background cache writes before tap removes the fixture dir,
  // or the cleanup races them (ENOTEMPTY on macOS). tap runs EOF hooks in
  // registration order, so this has to be hooked before t.testdir() hooks
  // the cleanup
  t.teardown(async () =>
    (await pi.getRegistryClient()).cache.promise(),
  )
  const pi = new PackageInfoClient({
    cache: t.testdir(),
    registry: url(),
  })
  return pi
}

t.beforeEach(() => {
  body = full
  requests = 0
  delay = 0
})

t.test('urls and keys', async t => {
  const r = new Registry('https://registry.vlt.io/acme/npm', () =>
    Promise.reject(new Error('not asked')),
  )
  t.equal(r.url, 'https://registry.vlt.io/acme/npm/', 'one slash')
  t.equal(r.key, 'https://registry.vlt.io/acme/npm', 'no slash')
  t.equal(String(r), r.url)
  t.equal(
    Registry.key('https://registry.vlt.io/acme/npm///'),
    r.key,
    'however many slashes',
  )
  t.equal(
    r.resolve('-/vlt/resolve').href,
    'https://registry.vlt.io/acme/npm/-/vlt/resolve',
  )
  t.equal(
    r.packumentUrl('@scope/pkg').href,
    'https://registry.vlt.io/acme/npm/@scope/pkg',
  )
  t.equal(
    r.packumentUrl('pkg', true).href,
    'https://registry.vlt.io/acme/npm/pkg?stable',
  )
  t.equal(
    r.tarballDirectory('pkg'),
    'https://registry.vlt.io/acme/npm/pkg/-/',
  )
  t.equal(r.packageKey('pkg'), 'https://registry.vlt.io/acme/npm/pkg')
  t.equal(
    r.manifestKey('pkg', '^1.0.0'),
    'https://registry.vlt.io/acme/npm/pkg@^1.0.0',
  )
})

t.test('one object per registry, however it is spelled', async t => {
  const pi = client(t)
  const r = pi.registry(url())
  t.equal(
    pi.registry(url().replace(/\/$/, '')),
    r,
    'without the slash',
  )
  t.equal(pi.registry(`${url()}/`), r, 'with two')
  t.not(pi.registry('https://registry.npmjs.org/'), r)
})

t.test('reads the document a vlt registry serves', async t => {
  const pi = client(t)
  t.strictSame(await pi.capabilities(url()), {
    manifests: '0.1',
    resolve: '0.1',
    'stable-filter': '1.0',
    mimeTypes: [
      'application/vnd.vlt.packument-v1+json',
      'application/vnd.npm.install-v1+json',
      'application/json',
    ],
  })
  t.equal(requests, 1, 'asked the registry once')
})

t.test('concurrent asks coalesce into one request', async t => {
  const pi = client(t)
  delay = 20
  const [a, b] = await Promise.all([
    pi.capabilities(url()),
    pi.capabilities(url()),
  ])
  t.equal(a, b, 'both asks got the same document')
  t.equal(requests, 1, 'asked the registry once')
})

t.test('a later process reads it out of the cache', async t => {
  const cache = t.testdir()
  const first = new PackageInfoClient({ cache, registry: url() })
  const doc = await first.capabilities(url())
  await (await first.getRegistryClient()).cache.promise()
  t.equal(requests, 1, 'cold miss')

  // a new client with the same cache dir stands in for a later `vlt` run
  const second = new PackageInfoClient({ cache, registry: url() })
  t.strictSame(await second.capabilities(url()), doc)
  t.equal(requests, 1, 'served from the disk cache, not the registry')
  await (await second.getRegistryClient()).cache.promise()
})

t.test(
  'a registry without the document has no extensions',
  async t => {
    const pi = client(t)
    body = undefined
    t.teardown(() => {
      body = '{}'
    })
    t.strictSame(await pi.capabilities(url()), {})
  },
)

t.test('a registry that cannot be reached answers empty', async t => {
  const pi = new PackageInfoClient({ cache: t.testdir() })
  // nothing listens here: the request rejects, and a rejected probe is
  // not a reason to fail whatever asked
  t.strictSame(await pi.capabilities('http://127.0.0.1:1/'), {})
})

t.test('fields that arrive malformed are dropped', async t => {
  t.teardown(() => {
    body = '{}'
  })

  const cases: [string, string, Record<string, unknown>][] = [
    ['a body that is not an object', '"nope"', {}],
    ['a null body', 'null', {}],
    [
      'versions that are not strings',
      JSON.stringify({
        manifests: 1,
        resolve: null,
        'stable-filter': 1,
      }),
      {},
    ],
    [
      'mimeTypes that is not an array',
      JSON.stringify({
        manifests: '0.1',
        mimeTypes: 'application/json',
      }),
      { manifests: '0.1' },
    ],
    [
      'mimeTypes holding something that is not a string',
      JSON.stringify({ mimeTypes: ['application/json', 7] }),
      {},
    ],
  ]

  for (const [name, served, expected] of cases) {
    await t.test(name, async t => {
      body = served
      const pi = client(t)
      t.strictSame(await pi.capabilities(url()), expected)
    })
  }
})

t.test('a body that does not parse answers empty', async t => {
  t.teardown(() => {
    body = '{}'
  })
  body = 'not json at all'
  const pi = client(t)
  t.strictSame(await pi.capabilities(url()), {})
})

t.test(
  'hasCapability answers only once the document lands',
  async t => {
    const pi = client(t)
    const r = pi.registry(url())

    t.equal(r.known, false)
    t.equal(
      r.hasCapability('resolve'),
      false,
      'no answer yet, and asking started the request',
    )
    await r.capabilities()
    t.equal(r.known, true)
    t.equal(r.hasCapability('resolve'), true, 'served')
    t.equal(r.hasCapability('mimeTypes'), true, 'served')
    t.equal(requests, 1, 'the first ask started the only request')
  },
)

t.test('a registry without the document has nothing', async t => {
  body = undefined
  t.teardown(() => {
    body = '{}'
  })
  const r = client(t).registry(url())
  await r.capabilities()
  t.equal(r.known, true, 'the answer is known')
  t.equal(r.hasCapability('resolve'), false)
})
