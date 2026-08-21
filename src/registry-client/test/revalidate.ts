import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { PassThrough } from 'node:stream'
import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import { cacheKey, RegistryClient } from '../src/index.ts'
import { __CODE_SPLIT_SCRIPT_NAME, main } from '../src/revalidate.ts'
import { toRawHeaders } from './fixtures/to-raw-headers.ts'

const ENV = {
  NODE_OPTIONS: '--no-warnings --experimental-strip-types',
}

const seedEntry = async (
  cache: string,
  method: 'GET' | 'HEAD',
  url: string,
) => {
  const rc = new RegistryClient({ cache })
  const e = new CacheEntry(
    200,
    toRawHeaders({
      'content-type': 'application/json',
      etag: '"x"',
      date: new Date('2020-01-01').toUTCString(),
    }),
  )
  e.addBody(Buffer.from('{"ok":true}'))
  rc.cache.set(cacheKey(method, url), e.encode())
  await rc.cache.promise()
}

t.test('validate args', async t => {
  t.match(
    spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME], {
      input: '',
      stdio: ['pipe', 'inherit', 'inherit'],
      encoding: 'utf8',
      env: ENV,
    }),
    {
      status: 1,
    },
  )
  t.match(
    spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME, 'path'], {
      input: '',
      env: ENV,
    }),
    {
      status: 1,
    },
  )
  t.match(
    spawnSync(
      process.execPath,
      [__CODE_SPLIT_SCRIPT_NAME, t.testdir()],
      {
        input: 'nope\0not valid\0no valid keys\0',
        env: ENV,
      },
    ),
    { status: 1 },
  )
})

t.test('revalidate a url', async t => {
  let requests = 0
  const server = createServer((req, res) => {
    t.equal(req.url, '/' + String(req.method))
    requests++
    req.resume()
    res.setHeader('connection', 'close')
    res.end('ok')
  })
  await new Promise<void>(res =>
    server.listen(0, '127.0.0.1', () => res()),
  )
  t.teardown(() => {
    server.closeAllConnections()
    server.close()
  })
  const { port } = server.address() as AddressInfo
  const reg = `http://127.0.0.1:${port}`
  const dir = t.testdir({})
  await seedEntry(dir, 'GET', `${reg}/GET`)
  await seedEntry(dir, 'HEAD', `${reg}/HEAD`)

  const res = await new Promise<{
    status: number | null
    signal: NodeJS.Signals | null
  }>(res => {
    const cp = spawn(
      process.execPath,
      [__CODE_SPLIT_SCRIPT_NAME, dir],
      {
        stdio: ['pipe', 'inherit', 'inherit'],
        env: ENV,
      },
    )
    cp.stdin.write(`GET ${reg}/GET\0HEAD ${reg}/HEAD\0`, () => {
      cp.stdin.end()
    })
    cp.on('close', (status, signal) => {
      res({ status, signal })
    })
  })

  t.matchOnlyStrict(res, {
    status: 0,
    signal: null,
  })

  t.equal(requests, 2)
})

t.test('pool caps in-flight requests', async t => {
  t.intercept(process, 'env', {
    value: { ...process.env, VLT_REVALIDATE_CONCURRENCY: '2' },
  })
  let inFlight = 0
  let max = 0
  const server = createServer((_req, res) => {
    inFlight++
    max = Math.max(max, inFlight)
    setTimeout(() => {
      inFlight--
      res.statusCode = 304
      res.setHeader('date', new Date().toUTCString())
      res.end()
    }, 100)
  })
  await new Promise<void>(res =>
    server.listen(0, '127.0.0.1', () => res()),
  )
  t.teardown(() => server.close())
  const { port } = server.address() as AddressInfo
  const origin = `http://127.0.0.1:${port}`
  const dir = t.testdir()
  const urls = [1, 2, 3, 4].map(i => `${origin}/${i}`)
  for (const u of urls) {
    await seedEntry(dir, 'GET', u)
  }
  const stdin = new PassThrough()
  const p = main(dir, stdin)
  stdin.end(urls.map(u => `GET ${u}`).join('\0') + '\0')
  t.equal(await p, true)
  t.equal(max, 2, 'never more than 2 in flight')
})

t.test('invalid concurrency env falls back to default', async t => {
  t.intercept(process, 'env', {
    value: { ...process.env, VLT_REVALIDATE_CONCURRENCY: 'nope' },
  })
  const server = createServer((_req, res) => {
    res.statusCode = 304
    res.setHeader('date', new Date().toUTCString())
    res.end()
  })
  await new Promise<void>(res =>
    server.listen(0, '127.0.0.1', () => res()),
  )
  t.teardown(() => server.close())
  const { port } = server.address() as AddressInfo
  const url = `http://127.0.0.1:${port}/x`
  const dir = t.testdir()
  await seedEntry(dir, 'GET', url)
  const stdin = new PassThrough()
  const p = main(dir, stdin)
  stdin.end(`GET ${url}\0`)
  t.equal(await p, true)
})

t.test('high concurrency env is capped', async t => {
  t.intercept(process, 'env', {
    value: { ...process.env, VLT_REVALIDATE_CONCURRENCY: '100' },
  })
  const server = createServer((_req, res) => {
    res.statusCode = 304
    res.end()
  })
  await new Promise<void>(res =>
    server.listen(0, '127.0.0.1', () => res()),
  )
  t.teardown(() => server.close())
  const { port } = server.address() as AddressInfo
  const url = `http://127.0.0.1:${port}/x`
  const dir = t.testdir()
  await seedEntry(dir, 'GET', url)
  const stdin = new PassThrough()
  const p = main(dir, stdin)
  stdin.end(`GET ${url}\0`)
  t.equal(await p, true)
})
