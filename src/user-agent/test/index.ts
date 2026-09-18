import t from 'tap'
import type { Test } from 'tap'

const mockUserAgent = async (t: Test) =>
  (
    await t.mockImport<typeof import('../src/index.ts')>(
      '../src/index.ts',
    )
  ).userAgent

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
