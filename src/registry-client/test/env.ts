import t from 'tap'

t.test('deno', async t => {
  const g = globalThis as typeof globalThis & { Deno: any }
  t.intercept(g, 'Deno', { value: {} })
  t.intercept(process.versions, 'deno', { value: '7.8.9' })
  const env = await t.mockImport('../src/env.js')
  t.strictSame(env, Object.assign(Object.create(null), {
    bun: undefined,
    deno: '7.8.9',
    engine: { name: 'v8', version: process.versions.v8 },
    isBun: false,
    isDeno: true,
    isNode: false,
    node: undefined,
  }))
})

t.test('bun', async t => {
  const g = globalThis as typeof globalThis & { Bun: any }
  t.intercept(g, 'Bun', { value: {} })
  t.intercept(process.versions, 'bun', { value: '7.8.9' })
  const env = await t.mockImport('../src/env.js')
  t.strictSame(env, Object.assign(Object.create(null), {
    bun: '7.8.9',
    deno: undefined,
    engine: { name: 'bun', version: '7.8.9' },
    isBun: true,
    isDeno: false,
    isNode: false,
    node: undefined,
  }))
})

t.test('node', async t => {
  const env = await t.mockImport('../src/env.js')
  t.strictSame(env, Object.assign(Object.create(null), {
    bun: undefined,
    deno: undefined,
    engine: { name: 'v8', version: process.versions.v8 },
    isBun: false,
    isDeno: false,
    isNode: true,
    node: process.versions.node,
  }))
})
