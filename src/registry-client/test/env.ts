import t from 'tap'

t.test('deno', async t => {
  const g = globalThis as typeof globalThis & { Deno: any }
  t.intercept(g, 'Deno', { value: {} })
  t.intercept(process.versions, 'deno', { value: '7.8.9' })
  const env = await t.mockImport('../src/env.ts')
  t.strictSame(
    env,
    Object.assign(Object.create(null), {
      bun: undefined,
      deno: '7.8.9',
      isBun: false,
      isDeno: true,
      isNode: false,
      node: undefined,
    }),
  )
})

t.test('bun', async t => {
  const g = globalThis as typeof globalThis & { Bun: any }
  t.intercept(g, 'Bun', { value: {} })
  t.intercept(process.versions, 'bun', { value: '7.8.9' })
  const env = await t.mockImport('../src/env.ts')
  t.strictSame(
    env,
    Object.assign(Object.create(null), {
      bun: '7.8.9',
      deno: undefined,
      isBun: true,
      isDeno: false,
      isNode: false,
      node: undefined,
    }),
  )
})

t.test('node', async t => {
  const env = await t.mockImport('../src/env.ts')
  t.strictSame(
    env,
    Object.assign(Object.create(null), {
      bun: undefined,
      deno: undefined,
      isBun: false,
      isDeno: false,
      isNode: true,
      node: process.versions.node,
    }),
  )
})
