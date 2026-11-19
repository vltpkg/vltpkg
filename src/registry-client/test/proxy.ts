import { readFileSync } from 'node:fs'
import type { RequestListener, Server } from 'node:http'
import { createServer } from 'node:http'
import { createServer as createTlsServer } from 'node:https'
import type { AddressInfo } from 'node:net'
import { connect as netConnect } from 'node:net'
import { resolve } from 'node:path'
import { rootCertificates } from 'node:tls'
import type { Test } from 'tap'
import t from 'tap'
import { Agent, EnvHttpProxyAgent, request } from 'undici'
import { getDispatcher } from '../src/proxy.ts'
import type { DispatcherOptions } from '../src/proxy.ts'

const proxyKeys = [
  'http_proxy',
  'HTTP_PROXY',
  'https_proxy',
  'HTTPS_PROXY',
  'no_proxy',
  'NO_PROXY',
  'npm_config_cafile',
  'NPM_CONFIG_CAFILE',
]

// Swap in a copy of the environment with every proxy variable and the
// CA file variable removed, so the machine running the tests can't
// change the result.
const setProxyEnv = (
  t: Test,
  env: Record<string, string> = {},
): void => {
  const value = { ...process.env }
  for (const key of proxyKeys) delete value[key]
  t.intercept(process, 'env', { value: { ...value, ...env } })
}

// The fixture is a self-signed certificate for `localhost` and
// `127.0.0.1`.
const fixtures = resolve(import.meta.dirname, 'fixtures/tls')
const certFile = resolve(fixtures, 'localhost-cert.pem')
const cert = readFileSync(certFile, 'utf8')
const key = readFileSync(resolve(fixtures, 'localhost-key.pem'))

const listen = async (
  t: Test,
  server: Server,
  host: string | undefined = '127.0.0.1',
): Promise<number> => {
  await new Promise<void>(res => {
    server.listen(0, host, res)
  })
  t.teardown(
    () =>
      new Promise<void>(res => {
        server.close(() => res())
      }),
  )
  return (server.address() as AddressInfo).port
}

const createOrigin = (t: Test) => {
  const server = createServer((req, res) => {
    if (req.url === '/slow') {
      setTimeout(() => res.end('slow'), 2000).unref()
      return
    }
    res.end('origin')
  })
  return listen(t, server)
}

// An https origin that presents the fixture certificate.
const createTlsOrigin = async (t: Test) => {
  const server = createTlsServer({ key, cert }, (_req, res) => {
    res.end('origin')
  })
  return `https://127.0.0.1:${await listen(t, server)}/`
}

/**
 * A minimal HTTP proxy. undici tunnels with `CONNECT` even for `http:`
 * origins, so recording the `CONNECT` requests is enough to tell whether
 * traffic was proxied or dialed directly.
 *
 * With `tls` the proxy is itself an https server with the fixture
 * certificate. undici sends an https proxy's host as the TLS server
 * name, which can't be an IP address, so it is reached as `localhost`
 * and listens on every local address.
 */
const createProxy = async (t: Test, { tls = false } = {}) => {
  const tunneled: string[] = []
  const handler: RequestListener = (_req, res) => {
    res.statusCode = 405
    res.end()
  }
  const server =
    tls ?
      createTlsServer({ key, cert }, handler)
    : createServer(handler)
  server.on('connect', (req, clientSocket, head) => {
    const target = req.url ?? ''
    tunneled.push(target)
    const [host = '', port = ''] = target.split(':')
    const originSocket = netConnect(Number(port), host, () => {
      clientSocket.write(
        'HTTP/1.1 200 Connection Established\r\n\r\n',
      )
      originSocket.write(head)
      originSocket.pipe(clientSocket)
      clientSocket.pipe(originSocket)
    })
    originSocket.on('error', () => clientSocket.destroy())
    clientSocket.on('error', () => originSocket.destroy())
  })
  if (tls) {
    const port = await listen(t, server, undefined)
    return { port, url: `https://localhost:${port}`, tunneled }
  }
  const port = await listen(t, server)
  return { port, url: `http://127.0.0.1:${port}`, tunneled }
}

const useDispatcher = (t: Test, options: DispatcherOptions = {}) => {
  const dispatcher = getDispatcher(options)
  t.teardown(() => dispatcher.close())
  return dispatcher
}

t.test('dispatcher selection', async t => {
  const cases: [string, Record<string, string>, boolean][] = [
    ['no proxy env', {}, false],
    ['http_proxy', { http_proxy: 'http://proxy.example:8080' }, true],
    ['HTTP_PROXY', { HTTP_PROXY: 'http://proxy.example:8080' }, true],
    [
      'https_proxy',
      { https_proxy: 'http://proxy.example:8080' },
      true,
    ],
    [
      'HTTPS_PROXY',
      { HTTPS_PROXY: 'http://proxy.example:8080' },
      true,
    ],
    ['empty http_proxy', { http_proxy: '' }, false],
    ['empty https_proxy', { https_proxy: '' }, false],
    ['no_proxy alone', { no_proxy: 'example.com' }, false],
  ]

  for (const [name, env, proxied] of cases) {
    t.test(name, async t => {
      setProxyEnv(t, env)
      const dispatcher = useDispatcher(t)
      t.equal(
        dispatcher instanceof EnvHttpProxyAgent,
        proxied,
        proxied ? 'uses EnvHttpProxyAgent' : 'uses plain Agent',
      )
      t.equal(
        dispatcher instanceof Agent,
        !proxied,
        'plain Agent only when no proxy is configured',
      )
    })
  }
})

t.test('requests are tunneled through the proxy', async t => {
  const proxy = await createProxy(t)
  const originPort = await createOrigin(t)
  setProxyEnv(t, { http_proxy: proxy.url })

  const dispatcher = useDispatcher(t)
  const res = await request(`http://127.0.0.1:${originPort}/`, {
    dispatcher,
  })

  t.equal(res.statusCode, 200)
  t.equal(await res.body.text(), 'origin')
  t.strictSame(
    proxy.tunneled,
    [`127.0.0.1:${originPort}`],
    'proxy saw the CONNECT for the origin',
  )
})

t.test('no_proxy hosts are dialed directly', async t => {
  const proxy = await createProxy(t)
  const originPort = await createOrigin(t)
  setProxyEnv(t, {
    http_proxy: proxy.url,
    no_proxy: '127.0.0.1',
  })

  const dispatcher = useDispatcher(t)
  const res = await request(`http://127.0.0.1:${originPort}/`, {
    dispatcher,
  })

  t.equal(await res.body.text(), 'origin')
  t.strictSame(proxy.tunneled, [], 'proxy was never contacted')
})

t.test('agent options apply on the proxied path', async t => {
  const proxy = await createProxy(t)
  const originPort = await createOrigin(t)
  const url = `http://127.0.0.1:${originPort}/slow`
  setProxyEnv(t, { http_proxy: proxy.url })

  const patient = useDispatcher(t)
  const res = await request(url, { dispatcher: patient })
  t.equal(
    await res.body.text(),
    'slow',
    'the slow route resolves with default timeouts',
  )

  // undici's timer wheel ticks about every 500ms, so the timeout and the
  // route's delay need room between them.
  const impatient = useDispatcher(t, { headersTimeout: 500 })
  await t.rejects(
    request(url, { dispatcher: impatient }),
    { code: 'UND_ERR_HEADERS_TIMEOUT' },
    'headersTimeout from the options was honored',
  )
})

t.test('CA file', async t => {
  const selfSigned = { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' }
  const url = await createTlsOrigin(t)

  // Verify certificates even if the environment running the tests has
  // NODE_TLS_REJECT_UNAUTHORIZED=0.
  const get = async (t: Test) => {
    const dispatcher = useDispatcher(t, {
      connect: { rejectUnauthorized: true },
    })
    const res = await request(url, { dispatcher })
    return await res.body.text()
  }

  t.test('unset, the defaults are trusted', async t => {
    setProxyEnv(t)
    await t.rejects(get(t), selfSigned)
  })

  t.test('the certificates in the file are trusted', async t => {
    setProxyEnv(t, { npm_config_cafile: certFile })
    t.equal(await get(t), 'origin')
  })

  t.test('a bundle of several certificates is split', async t => {
    const dir = t.testdir({
      'bundle.pem': [...rootCertificates.slice(0, 3), cert].join(
        '\n',
      ),
    })
    setProxyEnv(t, { npm_config_cafile: resolve(dir, 'bundle.pem') })
    t.equal(await get(t), 'origin')
  })

  t.test('the defaults are no longer trusted', async t => {
    const dir = t.testdir({
      'roots.pem': rootCertificates.join('\n'),
    })
    setProxyEnv(t, { npm_config_cafile: resolve(dir, 'roots.pem') })
    await t.rejects(get(t), selfSigned)
  })

  t.test('other connections keep the defaults', async t => {
    setProxyEnv(t, { npm_config_cafile: certFile })
    t.equal(await get(t), 'origin')
    const plain = new Agent({ connect: { rejectUnauthorized: true } })
    t.teardown(() => plain.close())
    await t.rejects(request(url, { dispatcher: plain }), selfSigned)
  })

  t.test('through an http proxy', async t => {
    const proxy = await createProxy(t)
    setProxyEnv(t, {
      npm_config_cafile: certFile,
      https_proxy: proxy.url,
    })
    t.equal(await get(t), 'origin')
    t.equal(proxy.tunneled.length, 1)
  })

  t.test('through an https proxy', async t => {
    const proxy = await createProxy(t, { tls: true })
    setProxyEnv(t, {
      npm_config_cafile: certFile,
      https_proxy: proxy.url,
    })
    t.equal(await get(t), 'origin')
    t.equal(proxy.tunneled.length, 1)
  })

  t.test('dialed directly under no_proxy', async t => {
    const proxy = await createProxy(t)
    setProxyEnv(t, {
      npm_config_cafile: certFile,
      https_proxy: proxy.url,
      no_proxy: '127.0.0.1',
    })
    t.equal(await get(t), 'origin')
    t.strictSame(proxy.tunneled, [])
  })

  t.test('through a proxy, unset', async t => {
    const proxy = await createProxy(t)
    setProxyEnv(t, { https_proxy: proxy.url })
    await t.rejects(get(t), selfSigned)
  })
})
