import * as v8 from 'node:v8'
import t, { Test } from 'tap'

const mockSerdes = async (t: Test) =>
  t.mockImport<typeof import('../src/serdes.js')>(
    '../src/serdes.js',
    {
      '../src/env.js': await t.mockImport('../src/env.js'),
    },
  )

t.test('actual', async t => {
  const { deserialize, serialize, serializedHeader } =
    await mockSerdes(t)
  const version = parseInt(
    process.versions.v8.replace(/[^0-9]/g, ' ').trim(),
    10,
  )
  t.equal(serializedHeader, `v8-serialize-${version}`)
  t.equal(v8.serialize, serialize)
  t.equal(v8.deserialize, deserialize)
})

t.test('simulate deno', async t => {
  t.intercept(
    globalThis as typeof globalThis & { Deno: any },
    'Deno',
    { value: {} },
  )
  t.intercept(process, 'versions', { value: { v8: '420.69.lol' } })
  const { serializedHeader } = await mockSerdes(t)
  t.equal(serializedHeader, 'v8-serialize-420')
})

t.test('simulate bun', async t => {
  t.intercept(globalThis as typeof globalThis & { Bun: any }, 'Bun', {
    value: {},
  })
  t.intercept(process, 'versions', { value: { bun: '420.69.lol' } })
  const { serializedHeader } = await mockSerdes(t)
  t.equal(serializedHeader, 'bun-serialize-420')
})

t.test('simulate unknown', async t => {
  t.intercept(process, 'versions', { value: {} })
  const { serializedHeader } = await mockSerdes(t)
  t.equal(serializedHeader, undefined)
})
