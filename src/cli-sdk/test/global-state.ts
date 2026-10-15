import { joinDepIDTuple } from '@vltpkg/dep-id'
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs'
import * as fsp from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'
import {
  globalStateFile,
  readGlobalState,
  sweepPendingRemove,
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
        pendingRemove: [abs, 'rel', null],
      }),
    ),
    {
      binDirs: [abs],
      localBinNoticed: true,
      pathSetup: 'declined',
      pendingRemove: [abs],
    },
  )
  t.strictSame(
    await read(
      JSON.stringify({
        binDirs: abs,
        localBinNoticed: 'yes',
        pathSetup: 'x',
        pendingRemove: abs,
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
      pendingRemove: [abs],
      x: 1,
    }),
  })
  const res = await updateGlobalState(root, s => ({
    ...s,
    localBinNoticed: true,
  }))
  const expect = {
    binDirs: [abs],
    pathSetup: 'declined',
    pendingRemove: [abs],
    x: 1,
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

t.test('sweepPendingRemove', async t => {
  const id = (v: string) =>
    joinDepIDTuple(['registry', '', `vlt@${v}`])
  const [a, b, c] = [id('1.0.0'), id('1.1.0'), id('1.2.0')]
  const pkg = () => ({ 'vlt.js': '' })
  const setup = (pendingRemove?: unknown) =>
    t.testdir({
      ...(pendingRemove ?
        {
          'global-state.json': JSON.stringify({
            pendingRemove,
            x: 1,
          }),
        }
      : {}),
      node_modules: {
        '.vlt': {
          [a]: pkg(),
          [b]: pkg(),
          [c]: pkg(),
          node_modules: {},
        },
      },
      outside: {},
    })
  const state = (root: string) =>
    JSON.parse(readFileSync(globalStateFile(root), 'utf8')) as unknown
  const store = (root: string) =>
    resolve(realpathSync.native(root), 'node_modules/.vlt')

  t.test(
    'removes listed store dirs, keeps the running one',
    async t => {
      const root = setup([])
      const s = store(root)
      const list = [
        resolve(s, a),
        resolve(s, b),
        resolve(s, c),
        resolve(s, 'node_modules'),
        resolve(root, 'outside'),
        resolve(s, a, 'vlt.js'),
      ]
      await updateGlobalState(root, st => ({
        ...st,
        pendingRemove: list,
      }))
      t.intercept(process, 'argv', {
        value: [process.execPath, resolve(s, b, 'vlt.js')],
      })
      await sweepPendingRemove(root)
      t.notOk(existsSync(resolve(s, a)))
      t.notOk(existsSync(resolve(s, c)))
      t.ok(existsSync(resolve(s, b)), 'running vlt kept')
      t.ok(existsSync(resolve(s, 'node_modules')), 'not a store dir')
      t.ok(existsSync(resolve(root, 'outside')), 'outside the store')
      t.strictSame(state(root), {
        x: 1,
        pendingRemove: [resolve(s, b)],
      })
    },
  )

  t.test('no argv[1]', async t => {
    const root = setup([])
    const s = store(root)
    await updateGlobalState(root, st => ({
      ...st,
      pendingRemove: [resolve(s, a)],
    }))
    t.intercept(process, 'argv', { value: [process.execPath] })
    await sweepPendingRemove(root)
    t.notOk(existsSync(resolve(s, a)))
    t.strictSame(state(root), { x: 1, pendingRemove: [] })
  })

  t.test('argv[1] missing on disk', async t => {
    const root = setup([])
    const s = store(root)
    await updateGlobalState(root, st => ({
      ...st,
      pendingRemove: [resolve(s, a)],
    }))
    t.intercept(process, 'argv', {
      value: [process.execPath, resolve(root, 'nope.js')],
    })
    await sweepPendingRemove(root)
    t.notOk(existsSync(resolve(s, a)))
  })

  t.test('rm fails: kept for next time', async t => {
    const root = setup([])
    const s = store(root)
    await updateGlobalState(root, st => ({
      ...st,
      pendingRemove: [resolve(s, a), resolve(s, c)],
    }))
    const { sweepPendingRemove } = await t.mockImport<
      typeof import('../src/global-state.ts')
    >('../src/global-state.ts', {
      'node:fs/promises': t.createMock(fsp, {
        rm: async (p: string, o: Parameters<typeof fsp.rm>[1]) => {
          if (p === resolve(s, a)) {
            throw Object.assign(new Error('busy'), { code: 'EBUSY' })
          }
          return fsp.rm(p, o)
        },
      }),
    })
    await sweepPendingRemove(root)
    t.ok(existsSync(resolve(s, a)))
    t.notOk(existsSync(resolve(s, c)))
    t.strictSame(state(root), {
      x: 1,
      pendingRemove: [resolve(s, a)],
    })
  })

  t.test('nothing removed: not written', async t => {
    const root = setup([])
    const s = store(root)
    await updateGlobalState(root, st => ({
      ...st,
      pendingRemove: [resolve(s, b)],
    }))
    const before = readFileSync(globalStateFile(root), 'utf8')
    t.intercept(process, 'argv', {
      value: [process.execPath, resolve(s, b, 'vlt.js')],
    })
    let wrote = false
    const { sweepPendingRemove } = await t.mockImport<
      typeof import('../src/global-state.ts')
    >('../src/global-state.ts', {
      'node:fs/promises': t.createMock(fsp, {
        writeFile: async () => {
          wrote = true
        },
      }),
    })
    await sweepPendingRemove(root)
    t.notOk(wrote)
    t.equal(readFileSync(globalStateFile(root), 'utf8'), before)
  })

  t.test('missing state or empty list: no write', async t => {
    for (const root of [setup(), setup([])]) {
      const before = readdirSync(root).sort()
      await sweepPendingRemove(root)
      t.strictSame(readdirSync(root).sort(), before)
    }
  })

  t.test('unreadable root: resolves', async t => {
    const root = t.testdir({
      'global-state.json': JSON.stringify({ pendingRemove: [abs] }),
    })
    const { sweepPendingRemove } = await t.mockImport<
      typeof import('../src/global-state.ts')
    >('../src/global-state.ts', {
      'node:fs/promises': t.createMock(fsp, {
        realpath: async () => {
          throw new Error('nope')
        },
      }),
    })
    await t.resolves(sweepPendingRemove(root))
  })
})
