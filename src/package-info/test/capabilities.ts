import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Test } from 'tap'
import t from 'tap'
import {
  PackageInfoClient,
  getCapabilities,
  peekCapabilities,
  resetCapabilities,
} from '../src/index.ts'

// What the server answers next, and what it was asked along the way.
let body: string | undefined = JSON.stringify({
  manifests: '0.1',
  resolve: '0.1',
  'stable-filter': '1.0',
  mimeTypes: [
    'application/vnd.vlt.packument-v1+json',
    'application/vnd.npm.install-v1+json',
    'application/json',
  ],
})
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

const registry = () =>
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
    registry: registry(),
  })
  return pi
}

t.beforeEach(() => {
  resetCapabilities()
  requests = 0
  delay = 0
})

t.test('reads the document a vlt registry serves', async t => {
  const pi = client(t)
  t.strictSame(await pi.capabilities(registry()), {
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
    pi.capabilities(registry()),
    pi.capabilities(registry()),
  ])
  t.equal(a, b, 'both asks got the same document')
  t.equal(requests, 1, 'asked the registry once')
})

t.test('a later process reads it out of the cache', async t => {
  const cache = t.testdir()
  const first = new PackageInfoClient({ cache, registry: registry() })
  const doc = await first.capabilities(registry())
  await (await first.getRegistryClient()).cache.promise()
  t.equal(requests, 1, 'cold miss')

  // a new client with the same cache dir stands in for a later `vlt` run
  resetCapabilities()
  const second = new PackageInfoClient({
    cache,
    registry: registry(),
  })
  t.strictSame(await second.capabilities(registry()), doc)
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
    t.strictSame(await pi.capabilities(registry()), {})
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
      resetCapabilities()
      body = served
      const pi = client(t)
      t.strictSame(await pi.capabilities(registry()), expected)
    })
  }
})

t.test('a body that does not parse answers empty', async t => {
  t.teardown(() => {
    body = '{}'
  })
  body = 'not json at all'
  const pi = client(t)
  t.strictSame(
    await getCapabilities(await pi.getRegistryClient(), registry()),
    {},
  )
})

t.test('peek answers only once the document lands', async t => {
  const pi = client(t)
  const rc = await pi.getRegistryClient()

  t.equal(
    peekCapabilities(rc, registry()),
    undefined,
    'no answer yet, and asking started the request',
  )
  const doc = await pi.capabilities(registry())
  t.strictSame(
    peekCapabilities(rc, registry()),
    doc,
    'the document, once it has landed',
  )
  t.equal(requests, 1, 'the peek started the only request')
})

t.test('reset clears the settled document too', async t => {
  const pi = client(t)
  const rc = await pi.getRegistryClient()
  await pi.capabilities(registry())
  t.not(peekCapabilities(rc, registry()), undefined, 'settled')

  resetCapabilities()
  t.equal(
    peekCapabilities(rc, registry()),
    undefined,
    'forgotten, so the next run asks again',
  )
})
