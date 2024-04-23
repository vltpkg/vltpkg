import { createServer } from 'http'
import t from 'tap'
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

  res.setHeader('etag', etag)
  res.setHeader('last-modified', date.toUTCString())

  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ hello: 'world' }))
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
