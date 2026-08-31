// Fixture registry for the transport dark test. Node, always — a compiled binary
// cannot host it: linking every ext archive by hand (the F9b workaround)
// leaves node:http's server without its tokio reactor and it aborts.
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'

const PACKUMENT = gzipSync(
  Buffer.from(
    JSON.stringify({
      name: 'abbrev',
      'dist-tags': { latest: '1.0.0' },
    }),
  ),
)
let flaky = 0
let throttled = 0

const hits = {}
const server = createServer((req, res) => {
  const u = req.url
  hits[u] = (hits[u] ?? 0) + 1
  const send = (code, headers, body) => {
    res.writeHead(code, headers)
    res.end(body)
  }
  if (u === '/abbrev')
    return send(
      200,
      {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        etag: '"pack-1"',
        'cache-control': 'max-age=300',
      },
      PACKUMENT,
    )
  if (u === '/conditional') {
    if (req.headers['if-none-match'] === '"pack-1"')
      return send(304, { etag: '"pack-1"' })
    return send(
      200,
      { 'content-type': 'application/json', etag: '"pack-1"' },
      '{"fresh":true}',
    )
  }
  if (u === '/flaky') {
    if (++flaky < 3) return void res.destroy()
    return send(200, {}, `ok after ${flaky}`)
  }
  if (u === '/throttle') {
    if (++throttled < 3)
      return send(429, { 'retry-after': '1' }, 'slow down')
    return send(200, {}, 'ok')
  }
  if (u === '/reset') {
    flaky = 0
    throttled = 0
    return send(200, {}, 'reset')
  }
  if (u === '/hits')
    return send(
      200,
      { 'content-type': 'application/json' },
      JSON.stringify(hits),
    )
  if (u === '/redirect') return send(302, { location: '/abbrev' })
  if (u === '/auth')
    return send(
      200,
      { 'content-type': 'application/json' },
      JSON.stringify({ auth: req.headers.authorization ?? null }),
    )
  if (u === '/slow')
    return void setTimeout(() => send(200, {}, 'slow'), 3000)
  return send(404, {}, 'nope')
})
server.listen(Number(process.argv[2] ?? 0), '127.0.0.1', () =>
  console.log(server.address().port),
)
