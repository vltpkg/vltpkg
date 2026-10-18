import t from 'tap'
import * as fs from 'node:fs'
import { join } from 'node:path'
import {
  readUpdateState,
  writeUpdateState,
} from '../src/update-state.ts'

const state = {
  registry: 'https://registry.npmjs.org/',
  version: '1.0.0',
  lastCheck: 123,
}

t.test('state validation and atomic writes', t => {
  const dir = t.testdir()
  const file = join(dir, 'state.json')
  t.equal(readUpdateState(file), undefined)
  for (const invalid of [
    null,
    1,
    'text',
    true,
    [],
    { registry: 'x' },
    { registry: 'x', version: '1' },
    {},
    { ...state, registry: 1 },
    { ...state, version: 1 },
    { ...state, lastCheck: '1' },
    { ...state, lastCheck: null },
    { ...state, latest: 2 },
    { ...state, notifiedVersion: 2 },
    { ...state, notifiedAt: '1' },
  ]) {
    fs.writeFileSync(file, JSON.stringify(invalid))
    t.equal(readUpdateState(file), undefined)
  }
  for (const field of ['lastCheck', 'notifiedAt']) {
    fs.writeFileSync(
      file,
      JSON.stringify({ ...state, [field]: 'overflow' }).replace(
        '"overflow"',
        '1e999',
      ),
    )
    t.equal(readUpdateState(file), undefined)
  }
  fs.writeFileSync(file, '{')
  t.equal(readUpdateState(file), undefined)
  writeUpdateState(file, state)
  t.strictSame(readUpdateState(file), state)
  const notified = {
    ...state,
    latest: '2.0.0',
    notifiedVersion: '2.0.0',
    notifiedAt: 456,
  }
  writeUpdateState(file, notified)
  t.strictSame(readUpdateState(file), notified)
  t.strictSame(fs.readdirSync(dir), ['state.json'])
  t.end()
})

t.test(
  'failed replacement leaves the previous state intact',
  async t => {
    const file = join(t.testdir(), 'state.json')
    writeUpdateState(file, state)
    const { writeUpdateState: write } = await t.mockImport<
      typeof import('../src/update-state.ts')
    >('../src/update-state.ts', {
      'node:fs': t.createMock(fs, {
        renameSync: () => {
          throw new Error('rename failed')
        },
      }),
    })
    t.throws(
      () => write(file, { ...state, lastCheck: 456 }),
      /rename failed/,
    )
    t.strictSame(readUpdateState(file), state)
    t.notOk(fs.existsSync(`${file}.${process.pid}.tmp`))
  },
)
