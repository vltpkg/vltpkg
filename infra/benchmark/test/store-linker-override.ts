import { readFileSync } from 'node:fs'
import t from 'tap'
import {
  storeLinkerOverride,
  storeLinkerOverrideFile,
} from '../src/store-linker-override.ts'

t.test('only a line of its own counts', t => {
  for (const body of [
    '',
    'runs `bench-store-linker=hardlink` first',
    'waits for bench-store-linker=hardlink',
    '`bench-store-linker=hardlink`',
    '- bench-store-linker=hardlink',
    'bench-store-linker=hardlink.',
  ]) {
    t.strictSame(storeLinkerOverride(body), [], body)
  }
  t.strictSame(
    storeLinkerOverride(
      'intro\r\n\r\n  bench-store-linker=hardlink\r\n\r\nbench-store-linker=copy',
    ),
    ['VLT_STORE_LINKER=hardlink'],
    'crlf, first line wins',
  )
  t.end()
})

t.test('control', t => {
  t.strictSame(
    storeLinkerOverride('bench-store-linker=hardlink,unpack'),
    [
      'VLT_STORE_LINKER=hardlink',
      'BENCH_BINARY=vlt,VLT_STORE_LINKER=unpack vlt',
    ],
  )
  t.end()
})

t.test('invalid values', t => {
  for (const v of [
    'bogus',
    'hardlink,',
    'auto,copy,unpack',
    ',unpack',
  ]) {
    t.throws(
      () => storeLinkerOverride(`bench-store-linker=${v}`),
      { message: `Invalid bench-store-linker=${v}` },
      v,
    )
  }
  t.end()
})

t.test('appends to the env file', t => {
  const file = `${t.testdir({ env: 'A=1\n' })}/env`
  t.strictSame(storeLinkerOverrideFile('none', file), [])
  t.strictSame(
    storeLinkerOverrideFile('bench-store-linker=auto', file),
    ['VLT_STORE_LINKER=auto'],
  )
  t.equal(readFileSync(file, 'utf8'), 'A=1\nVLT_STORE_LINKER=auto\n')
  t.end()
})
