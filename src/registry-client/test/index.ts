import { createServer } from 'http'
import t from 'tap'
import { gzipSync } from 'zlib'
import { RegistryClient } from '../src/index.js'

const PORT = (t.childId ?? 0) + 8080

const etag = '"an etag is a gate in reverse, think about it"'
const date = new Date('2023-01-20')
const registry = createServer((req, res) => {
  res.setHeader('connection', 'close')
  res.setHeader('date', new Date().toUTCString())
  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 306
    return res.end()
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

t.teardown(() => registry.close())
t.before(
  async () => await new Promise<void>(r => registry.listen(PORT, r)),
)

t.test('make a request', async t => {
  const rc = new RegistryClient({ cache: t.testdir() })
  const [result, result2] = await Promise.all([
    rc.request(`http://localhost:${PORT}/abbrev`),
    rc.request(`http://localhost:${PORT}/abbrev`),
  ])

  t.strictSame(result.json(), { hello: 'world' })
  t.strictSame(result2.json(), { hello: 'world' })

  const res2 = await rc.request(`http://localhost:${PORT}/abbrev`)
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
  const res = await rc.request(
    `http://localhost:${PORT}/some/tarball`,
  )
  t.equal(res.statusCode, 200)
  t.equal(res.isGzip, true)
  // only registers AFTER it's been written fully to the cache
  await rc.cache.promise()
  t.strictSame(registered, [
    [
      t.testdirName,
      JSON.stringify([
        `http://localhost:${PORT}`,
        'GET',
        '/some/tarball',
        null,
      ]),
    ],
  ])
})
