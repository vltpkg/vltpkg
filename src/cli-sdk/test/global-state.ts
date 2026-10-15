import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import {
  globalStateFile,
  readGlobalState,
  updateGlobalState,
  writeFileAtomic,
  writeJsonAtomic,
} from '../src/global-state.ts'

const abs = resolve('/a/bin')

t.test('globalStateFile', async t => {
  t.equal(globalStateFile('/g'), resolve('/g', 'global-state.json'))
})

t.test('readGlobalState', async t => {
  const read = (content?: string) =>
    readGlobalState(
      t.testdir(
        content === undefined ? {} : { 'global-state.json': content },
      ),
    )
  t.strictSame(await read(), {}, 'missing')
  t.strictSame(await read('{'), {}, 'malformed')
  t.strictSame(await read('[]'), {}, 'array')
  t.strictSame(await read('"x"'), {}, 'string')
  t.strictSame(await read('null'), {}, 'null')
  t.strictSame(
    await read(
      JSON.stringify({
        binDirs: [abs, 'rel/bin', 1],
        localBinNoticed: true,
        pathSetup: 'declined',
      }),
    ),
    { binDirs: [abs], localBinNoticed: true, pathSetup: 'declined' },
  )
  t.strictSame(
    await read(
      JSON.stringify({
        binDirs: abs,
        localBinNoticed: 'yes',
        pathSetup: 'x',
        x: 1,
      }),
    ),
    { x: 1 },
    'mistyped keys dropped',
  )
  t.strictSame(
    await read(JSON.stringify({ pathSetup: true })),
    {},
    'pathSetup other than declined dropped',
  )
})

t.test('updateGlobalState', async t => {
  const root = t.testdir({
    'global-state.json': JSON.stringify({
      binDirs: [abs],
      pathSetup: 'declined',
      pendingRemove: ['x'],
    }),
  })
  const res = await updateGlobalState(root, s => ({
    ...s,
    localBinNoticed: true,
  }))
  const expect = {
    binDirs: [abs],
    pathSetup: 'declined',
    pendingRemove: ['x'],
    localBinNoticed: true,
  }
  t.strictSame(res, expect)
  const raw = readFileSync(globalStateFile(root), 'utf8')
  t.strictSame(JSON.parse(raw), expect)
  t.ok(raw.endsWith('}\n'), 'trailing newline')
  t.strictSame(
    readdirSync(root),
    ['global-state.json'],
    'no tmp left',
  )
})

t.test('writeJsonAtomic', async t => {
  const root = t.testdir({ dir: {} })
  await t.rejects(writeJsonAtomic(resolve(root, 'dir'), {}))
  t.strictSame(readdirSync(root), ['dir'], 'no tmp left')
})

t.test('writeFileAtomic', async t => {
  const root = t.testdir({ dir: {}, f: 'old' })
  await writeFileAtomic(resolve(root, 'f'), 'new')
  t.equal(readFileSync(resolve(root, 'f'), 'utf8'), 'new')
  const umask = process.umask(0o077)
  t.teardown(() => process.umask(umask))
  await writeFileAtomic(resolve(root, 'm'), 'x', 0o644)
  t.equal(readFileSync(resolve(root, 'm'), 'utf8'), 'x')
  if (process.platform !== 'win32') {
    t.equal(
      statSync(resolve(root, 'm')).mode & 0o777,
      0o644,
      'umask-proof',
    )
  }
  await t.rejects(writeFileAtomic(resolve(root, 'dir'), 'x', 0o600))
  t.strictSame(
    readdirSync(root).sort(),
    ['dir', 'f', 'm'],
    'no tmp left',
  )
})
