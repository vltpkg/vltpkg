import * as v8 from 'node:v8'
import t from 'tap'
import {
  deserialize,
  serialize,
  serializedHeader,
} from '../src/serdes.js'
const version = parseInt(
  process.versions.v8.replace(/[^0-9]/g, ' ').trim(),
  10,
)
t.equal(serializedHeader, `v8-serialize-${version}`)
t.equal(v8.serialize, serialize)
t.equal(v8.deserialize, deserialize)

t.test('simulate deno', async t => {
  t.intercept(
    globalThis as typeof globalThis & { Deno: any },
    'Deno',
    { value: { version: { v8: '420.69.lol' } } },
  )
  t.intercept(globalThis, 'process', { value: undefined })
  const { serializedHeader } = await t.mockImport<
    typeof import('../src/serdes.js')
  >('../src/serdes.js')
  t.equal(serializedHeader, 'v8-serialize-420')
})

t.test('simulate bun', async t => {
  t.intercept(globalThis as typeof globalThis & { Bun: any }, 'Bun', {
    value: { version: '420.69.lol' },
  })
  t.intercept(globalThis, 'process', { value: undefined })
  const { serializedHeader } = await t.mockImport<
    typeof import('../src/serdes.js')
  >('../src/serdes.js')
  t.equal(serializedHeader, 'bun-serialize-420')
})

t.test('simulate unknown', async t => {
  t.intercept(globalThis, 'process', { value: undefined })
  const { serializedHeader } = await t.mockImport<
    typeof import('../src/serdes.js')
  >('../src/serdes.js')
  t.equal(serializedHeader, undefined)
})
