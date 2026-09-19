import t from 'tap'
import type { Test } from 'tap'

const mockModule = async (t: Test) =>
  t.mockImport<typeof import('../src/index.ts')>('../src/index.ts')

const mockUserAgent = async (t: Test) =>
  (await mockModule(t)).userAgent

t.test('with navigator.userAgent', async t => {
  t.intercept(globalThis, 'navigator', {
    value: { userAgent: 'navUA' },
  })
  t.match(
    await mockUserAgent(t),
    /^vlt\/\d+\.\d+\.\d+ navUA$/,
    'defers to the runtime provided user agent',
  )
})

t.test('userAgentHeaders', t => {
  t.test('server-side runtime', async t => {
    t.intercept(process, 'versions', { value: { node: 'nodever' } })
    const { userAgent, userAgentHeaders } = await mockModule(t)
    t.strictSame(
      userAgentHeaders,
      { 'User-Agent': userAgent },
      'sets the User-Agent header outside of a browser',
    )
  })

  t.test('browser', async t => {
    // a browser has a navigator.userAgent but no process.versions
    t.intercept(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0' },
    })
    t.intercept(process, 'versions', { value: {} })
    const { userAgentHeaders } = await mockModule(t)
    t.strictSame(
      userAgentHeaders,
      {},
      'does not set a User-Agent header in a browser',
    )
  })

  t.end()
})

t.test('no navigator.userAgent', t => {
  t.intercept(globalThis, 'navigator', { value: null })

  t.test('bun', async t => {
    t.intercept(
      globalThis as typeof globalThis & { Bun: unknown },
      'Bun',
      { value: {} },
    )
    t.intercept(process, 'versions', {
      value: { bun: 'bunver', node: 'nodever' },
    })
    t.match(
      await mockUserAgent(t),
      /^vlt\/\d+\.\d+\.\d+ Bun\/bunver$/,
    )
  })

  t.test('deno', async t => {
    t.intercept(
      globalThis as typeof globalThis & { Deno: unknown },
      'Deno',
      { value: {} },
    )
    t.intercept(process, 'versions', {
      value: { deno: 'denover', node: 'nodever' },
    })
    t.match(
      await mockUserAgent(t),
      /^vlt\/\d+\.\d+\.\d+ Deno\/denover$/,
    )
  })

  t.test('node', async t => {
    t.intercept(process, 'versions', { value: { node: 'nodever' } })
    t.match(
      await mockUserAgent(t),
      /^vlt\/\d+\.\d+\.\d+ Node.js\/nodever$/,
    )
  })

  t.test('nothing we know about', async t => {
    t.intercept(process, 'versions', { value: {} })
    t.match(
      await mockUserAgent(t),
      /^vlt\/\d+\.\d+\.\d+ \(unknown platform\)$/,
    )
  })

  t.end()
})
