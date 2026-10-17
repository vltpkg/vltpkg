import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'

type CaptureEvent = {
  distinctId: string
  event: string
  properties?: Record<string, unknown>
}

type ClientOpts = Record<string, unknown> & {
  fetch: (url: string, init: RequestInit) => Promise<Response>
}

type LoadOptions = {
  dir?: string
  requireThrows?: boolean
  captureThrows?: boolean
  shutdownRejects?: boolean
  env?: Record<string, string>
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const cmdEvent = {
  command: 'install',
  duration_ms: 1,
  success: true,
  node_version: 'v22.0.0',
  vlt_version: '1.0.0',
  os: 'linux',
  arch: 'x64',
  ci: false,
}

const load = async (t: Test, o: LoadOptions = {}) => {
  const dir = o.dir ?? t.testdir()
  const env: NodeJS.ProcessEnv = { ...process.env }
  delete env.DO_NOT_TRACK
  delete env.VLT_TELEMETRY
  t.intercept(process, 'env', { value: { ...env, ...o.env } })

  const clients: FakePostHog[] = []
  let requires = 0
  class FakePostHog {
    key: string
    opts: ClientOpts
    captured: CaptureEvent[] = []
    shutdowns = 0
    constructor(key: string, opts: ClientOpts) {
      this.key = key
      this.opts = opts
      clients.push(this)
    }
    capture(ev: CaptureEvent) {
      if (o.captureThrows) throw new Error('capture')
      this.captured.push(ev)
    }
    async shutdown() {
      this.shutdowns++
      if (o.shutdownRejects) throw new Error('shutdown')
    }
  }

  const mod = await t.mockImport<
    typeof import('../src/telemetry.ts')
  >('../src/telemetry.ts', {
    'node:module': {
      createRequire: () => () => {
        requires++
        if (o.requireThrows) throw new Error('no posthog')
        return { PostHog: FakePostHog }
      },
    },
    '@vltpkg/xdg': {
      XDG: class {
        data(p = '') {
          return resolve(dir, 'vlt', p)
        }
      },
    },
  })
  return {
    ...mod,
    clients,
    requires: () => requires,
    idFile: resolve(dir, 'vlt', 'telemetry-id'),
  }
}

const trackers = [
  ['trackCommand', 'cli_command', cmdEvent],
  [
    'trackInstall',
    'cli_install',
    { dependency_count: 2, duration_ms: 3 },
  ],
  [
    'trackError',
    'cli_error',
    { command: 'install', error_code: 'E' },
  ],
] as const

type Loaded = Awaited<ReturnType<typeof load>>
const track = (
  m: Loaded,
  fn: (typeof trackers)[number][0],
  flag?: boolean,
) => {
  if (fn === 'trackCommand') m.trackCommand(cmdEvent, flag)
  else if (fn === 'trackInstall') m.trackInstall(trackers[1][2], flag)
  else m.trackError(trackers[2][2], flag)
}

t.test('client options', async t => {
  const m = await load(t)
  m.trackCommand(cmdEvent)
  t.equal(m.clients.length, 1)
  const [c] = m.clients
  t.type(c?.key, 'string')
  t.match(c?.opts, {
    host: 'https://us.i.posthog.com',
    flushAt: 20,
    flushInterval: 10_000,
    fetchRetryCount: 0,
    requestTimeout: 2_000,
    fetch: Function,
  })
})

t.test('fetch resolves failed sends as 204', async t => {
  const m = await load(t)
  m.trackCommand(cmdEvent)
  const opts = m.clients[0]?.opts
  if (!opts) throw new Error('no client')

  const restore = t.intercept(globalThis, 'fetch', {
    value: async () => {
      throw new TypeError('fetch failed')
    },
  })
  const res = await opts.fetch('https://x/batch/', {})
  t.equal(res.status, 204)
  restore.restore()

  const bad = new Response('nope', { status: 500 })
  const restoreBad = t.intercept(globalThis, 'fetch', {
    value: async () => bad,
  })
  const res2 = await opts.fetch('https://x/batch/', {})
  t.equal(res2.status, 204)
  t.not(res2, bad)
  restoreBad.restore()

  const ok = new Response('{}', { status: 200 })
  const calls: [string, RequestInit][] = []
  t.intercept(globalThis, 'fetch', {
    value: async (url: string, init: RequestInit) => {
      calls.push([url, init])
      return ok
    },
  })
  const init = { method: 'POST' }
  t.equal(await opts.fetch('https://x/batch/', init), ok)
  t.strictSame(calls, [['https://x/batch/', init]])
})

for (const [fn, event, props] of trackers) {
  t.test(fn, async t => {
    t.test('captures event', async t => {
      const m = await load(t)
      track(m, fn)
      track(m, fn, true)
      t.equal(m.clients.length, 1, 'client cached')
      const id = readFileSync(m.idFile, 'utf8').trim()
      t.match(id, UUID)
      t.strictSame(m.clients[0]?.captured, [
        { distinctId: id, event, properties: props },
        { distinctId: id, event, properties: props },
      ])
    })

    for (const [name, flag, env] of [
      ['flag false', false, {}],
      ['DO_NOT_TRACK=1', undefined, { DO_NOT_TRACK: '1' }],
      ['VLT_TELEMETRY=0', undefined, { VLT_TELEMETRY: '0' }],
    ] as const) {
      t.test(`opted out: ${name}`, async t => {
        const m = await load(t, { env })
        track(m, fn, flag)
        t.equal(m.clients.length, 0)
        t.equal(m.requires(), 0)
      })
    }

    t.test('init failed', async t => {
      const m = await load(t, { requireThrows: true })
      track(m, fn)
      track(m, fn)
      t.equal(m.requires(), 1, 'require not retried')
      t.equal(m.clients.length, 0)
      await m.flush()
    })

    t.test('capture throws', async t => {
      const m = await load(t, { captureThrows: true })
      t.doesNotThrow(() => track(m, fn))
      t.equal(m.clients.length, 1)
    })
  })
}

t.test('anonymous id', async t => {
  t.test('reused when present', async t => {
    const dir = t.testdir({ vlt: { 'telemetry-id': 'abc\n' } })
    const m = await load(t, { dir })
    m.trackCommand(cmdEvent)
    t.equal(m.clients[0]?.captured[0]?.distinctId, 'abc')
  })

  t.test('blank file replaced', async t => {
    const dir = t.testdir({ vlt: { 'telemetry-id': '  \n' } })
    const m = await load(t, { dir })
    m.trackCommand(cmdEvent)
    const id = m.clients[0]?.captured[0]?.distinctId
    t.match(id, UUID)
    t.equal(readFileSync(m.idFile, 'utf8'), `${id}\n`)
  })

  t.test('unwritable data dir', async t => {
    const dir = t.testdir()
    writeFileSync(resolve(dir, 'vlt'), 'not a dir')
    const m = await load(t, { dir })
    m.trackCommand(cmdEvent)
    m.trackCommand(cmdEvent)
    const [a, b] = m.clients[0]?.captured ?? []
    t.match(a?.distinctId, UUID)
    t.not(a?.distinctId, b?.distinctId, 'transient ids')
    t.equal(readFileSync(resolve(dir, 'vlt'), 'utf8'), 'not a dir')
  })
})

t.test('flush', async t => {
  t.test('no client', async t => {
    const m = await load(t)
    t.equal(await m.flush(), undefined)
  })

  t.test('shuts down client once', async t => {
    const m = await load(t)
    m.trackCommand(cmdEvent)
    await m.flush()
    await m.flush()
    t.equal(m.clients[0]?.shutdowns, 1)
    m.trackCommand(cmdEvent)
    t.equal(m.clients.length, 2, 'new client after flush')
  })

  t.test('shutdown rejects', async t => {
    const m = await load(t, { shutdownRejects: true })
    m.trackCommand(cmdEvent)
    t.equal(await m.flush(), undefined)
    t.equal(m.clients[0]?.shutdowns, 1)
  })
})
