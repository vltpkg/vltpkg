import * as v8 from 'node:v8'
import t, { Test } from 'tap'

const mock = async (t: Test) =>
  t.mockImport<typeof import('../src/serdes.js')>(
    '../src/serdes.js',
    {
      '../src/env.js': await t.mockImport('../src/env.js'),
    },
  )

t.test('actual', async t => {
  const { deserialize, serialize, serializedHeader } = await mock(t)
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
    { value: { version: { v8: '420.69.lol' } } },
  )
  const { serializedHeader } = await mock(t)
  t.equal(serializedHeader, 'v8-serialize-420')
})

t.test('simulate bun', async t => {
  t.intercept(globalThis as typeof globalThis & { Bun: any }, 'Bun', {
    value: { version: '420.69.lol' },
  })
  const { serializedHeader } = await mock(t)
  t.equal(serializedHeader, 'bun-serialize-420')
})

t.test('simulate unknown', async t => {
  t.intercept(globalThis, 'process', { value: undefined })
  const { serializedHeader } = await mock(t)
  t.equal(serializedHeader, undefined)
})
