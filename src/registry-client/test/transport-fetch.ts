import { createServer } from 'node:http'
import type { Server } from 'node:http'
import t from 'tap'
import { fetchTransport } from '../src/transport-fetch.ts'
import type { Dispatcher } from 'undici'

const opts = {
  maxRetries: 3,
  timeoutFactor: 2,
  minTimeout: 0,
  maxTimeout: 100,
}

let flaky = 0
let throttled = 0
const server: Server = createServer((req, res) => {
  const u = req.url
  if (u === '/flaky') {
    flaky++
    if (flaky < 3) return void res.destroy()
    res.writeHead(200)
    return void res.end(`ok after ${flaky}`)
  }
  if (u === '/throttle') {
    throttled++
    if (throttled < 3) {
      // one wait driven by retry-after, one by the backoff schedule
      res.writeHead(
        429,
        throttled === 1 ? { 'retry-after': '1' } : {},
      )
      return void res.end('slow down')
    }
    res.writeHead(200)
    return void res.end('ok')
  }
  if (u === '/always500') {
    res.writeHead(500)
    return void res.end('nope')
  }
  if (u === '/cookies') {
    res.writeHead(200, { 'set-cookie': ['a=1', 'b=2'], 'x-one': '1' })
    return void res.end('c')
  }
  if (u === '/echo') {
    let body = ''
    req.on('data', (c: Buffer) => (body += String(c)))
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          method: req.method,
          headers: req.headers,
          body,
        }),
      )
    })
    return
  }
  if (u === '/slow') {
    setTimeout(() => {
      res.writeHead(200)
      res.end('slow')
    }, 2000)
    return
  }
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('ok')
})

const origin = await new Promise<string>(res => {
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address() as { port: number }
    res(`http://127.0.0.1:${port}`)
  })
})
t.teardown(() => server.close())

const req = (
  path: string,
  more: Partial<Dispatcher.RequestOptions> = {},
) =>
  fetchTransport(opts).request({
    origin,
    path,
    method: 'GET',
    ...more,
  })

t.test('basic request', async t => {
  const res = await req('/ok')
  t.equal(res.statusCode, 200)
  t.equal(res.headers['content-type'], 'text/plain')
  t.equal(await res.body.text(), 'ok')
})

t.test('body is a stream and carries the mixins', async t => {
  const res = await req('/ok')
  const chunks: Buffer[] = []
  await new Promise<void>(done => {
    res.body.on('data', (c: Buffer) => chunks.push(c))
    res.body.on('end', done)
  })
  t.equal(Buffer.concat(chunks).toString(), 'ok')
  const json = await req('/echo').then(async r => r.body.json())
  t.match(json, { method: 'GET' })
  const buf = await req('/ok').then(r => r.body.arrayBuffer())
  t.equal(Buffer.from(buf).toString(), 'ok')
})

t.test('set-cookie stays an array, others are strings', async t => {
  const res = await req('/cookies')
  await res.body.text()
  t.strictSame(res.headers['set-cookie'], ['a=1', 'b=2'])
  t.equal(res.headers['x-one'], '1')
})

t.test('every header shape addHeader can produce', async t => {
  const expected = { 'x-a': '1', 'x-b': '2' }
  for (const headers of [
    { 'x-a': '1', 'x-b': ['2'], 'x-skip': undefined },
    [
      ['x-a', '1'],
      ['x-b', '2'],
    ],
    ['x-a', '1', 'x-b', '2'],
    new Map([
      ['x-a', '1'],
      ['x-b', '2'],
    ]),
  ]) {
    const res = await req('/echo', {
      headers,
    } as unknown as Partial<Dispatcher.RequestOptions>)
    const seen = (await res.body.json()) as {
      headers: Record<string, string>
    }
    t.match(seen.headers, expected)
  }
  const none = await req('/echo', { headers: null })
  t.equal(
    ((await none.body.json()) as { method: string }).method,
    'GET',
  )
})

t.test('retries a dropped connection', async t => {
  flaky = 0
  const res = await req('/flaky')
  t.equal(res.statusCode, 200)
  t.equal(await res.body.text(), 'ok after 3')
})

t.test('retries a 429 and honours retry-after', async t => {
  throttled = 0
  const res = await req('/throttle')
  t.equal(res.statusCode, 200)
  t.equal(throttled, 3)
})

t.test(
  'gives up after maxRetries and returns the last response',
  async t => {
    const res = await req('/always500')
    t.equal(res.statusCode, 500)
  },
)

t.test('does not replay a POST', async t => {
  flaky = 0
  await t.rejects(req('/flaky', { method: 'POST', body: 'x' }))
  t.equal(flaky, 1, 'one attempt only')
})

t.test('sends a request body', async t => {
  const res = await req('/echo', { method: 'PUT', body: 'hello' })
  t.match(await res.body.json(), { method: 'PUT', body: 'hello' })
})

t.test('an abort is not retried', async t => {
  const ac = new AbortController()
  const p = req('/slow', { signal: ac.signal })
  setTimeout(() => ac.abort(), 50)
  await t.rejects(p)
})

t.test('a non-transient error is not retried', async t => {
  flaky = 0
  const er = Object.assign(new TypeError('fetch failed'), {
    cause: { code: 'ENOTATRANSIENTCODE' },
  })
  const fetchOrig = globalThis.fetch
  t.teardown(() => {
    globalThis.fetch = fetchOrig
  })
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    throw er
  }
  await t.rejects(req('/ok'))
  t.equal(calls, 1)
})
