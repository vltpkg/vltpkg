import type { Server } from 'node:http'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { connect as netConnect } from 'node:net'
import type { Test } from 'tap'
import t from 'tap'
import type { Agent as AgentType } from 'undici'
import { Agent, EnvHttpProxyAgent, request } from 'undici'
import { getDispatcher } from '../src/proxy.ts'

const proxyKeys = [
  'http_proxy',
  'HTTP_PROXY',
  'https_proxy',
  'HTTPS_PROXY',
  'no_proxy',
  'NO_PROXY',
]

// Swap in a copy of the environment with every proxy variable removed,
// so an ambient proxy on the machine running the tests can't change the
// result.
const setProxyEnv = (
  t: Test,
  env: Record<string, string> = {},
): void => {
  const value = { ...process.env }
  for (const key of proxyKeys) delete value[key]
  t.intercept(process, 'env', { value: { ...value, ...env } })
}

const listen = async (t: Test, server: Server): Promise<number> => {
  await new Promise<void>(res => {
    server.listen(0, '127.0.0.1', res)
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

/**
 * A minimal HTTP proxy. undici tunnels with `CONNECT` even for `http:`
 * origins, so recording the `CONNECT` requests is enough to tell whether
 * traffic was proxied or dialed directly.
 */
const createProxy = async (t: Test) => {
  const tunneled: string[] = []
  const server = createServer((_req, res) => {
    res.statusCode = 405
    res.end()
  })
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
  const port = await listen(t, server)
  return { port, url: `http://127.0.0.1:${port}`, tunneled }
}

const useDispatcher = (t: Test, options: AgentType.Options = {}) => {
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
