import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import {
  globalStateFile,
  readGlobalState,
  updateGlobalState,
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
      JSON.stringify({ binDirs: abs, localBinNoticed: 'yes', x: 1 }),
    ),
    { x: 1 },
    'mistyped keys dropped',
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
