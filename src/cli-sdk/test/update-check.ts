import t from 'tap'
import * as fs from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  readUpdateState,
  writeUpdateState,
} from '../src/update-state.ts'
const { __CODE_SPLIT_SCRIPT_NAME, checkForUpdate } =
  await t.mockImport<typeof import('../src/update-check.ts')>(
    '../src/update-check.ts',
  )

const state = {
  registry: 'https://registry.npmjs.org/',
  version: '1.0.0',
  lastCheck: 123,
}

t.test(
  'fetches dist-tags directly and preserves notification state',
  async t => {
    const file = join(t.testdir(), 'state.json')
    writeUpdateState(file, state)
    fs.writeFileSync(`${file}.lock`, '')
    t.intercept(globalThis, 'fetch', {
      value: async (url: URL, init: RequestInit) => {
        t.equal(
          String(url),
          'https://registry.npmjs.org/-/package/vlt/dist-tags',
        )
        t.equal(init.redirect, 'error')
        t.ok(init.signal)
        t.match(init.headers, { 'cache-control': 'no-cache' })
        writeUpdateState(file, {
          ...state,
          notifiedVersion: '1.5.0',
          notifiedAt: 456,
        })
        return Response.json({
          latest: '2.0.0',
          next: '3.0.0-beta.1',
        })
      },
    })
    await checkForUpdate(file)
    t.strictSame(readUpdateState(file), {
      ...state,
      latest: '2.0.0',
      notifiedVersion: '1.5.0',
      notifiedAt: 456,
    })
    t.notOk(fs.existsSync(`${file}.lock`))
  },
)

t.test('release channels and invalid tags', async t => {
  const file = join(t.testdir(), 'state.json')
  for (const [version, tags, latest] of [
    ['1.0.0', { latest: '0.9.0' }, '1.0.0'],
    ['1.0.0', { latest: 1 }, '1.0.0'],
    ['1.0.0', { latest: 'bad' }, '1.0.0'],
    ['1.0.0', {}, '1.0.0'],
    [
      '2.0.0-beta.1',
      {
        latest: '1.0.0',
        beta: '2.0.0-beta.2',
        next: '3.0.0-alpha.1',
      },
      '2.0.0-beta.2',
    ],
    ['2.0.0-rc.1', { next: '2.0.0-rc.2' }, '2.0.0-rc.2'],
    ['2.0.0-rc.1', {}, '2.0.0-rc.1'],
    ['2.0.0-1', { latest: '2.0.0' }, '2.0.0'],
  ] as const) {
    writeUpdateState(file, { ...state, version })
    t.intercept(globalThis, 'fetch', {
      value: async () => Response.json(tags),
    })
    await checkForUpdate(file)
    t.equal(readUpdateState(file)?.latest, latest)
  }
})

t.test(
  'failed checks and stale workers do not overwrite state',
  async t => {
    const file = join(t.testdir(), 'state.json')
    for (const outcome of [
      'http',
      'json',
      'null',
      'network',
      'registry',
      'version',
      'time',
      'deleted',
    ]) {
      writeUpdateState(file, state)
      fs.writeFileSync(`${file}.lock`, '')
      t.intercept(globalThis, 'fetch', {
        value: async () => {
          if (outcome === 'http')
            return new Response('', { status: 503 })
          if (outcome === 'json') return new Response('{')
          if (outcome === 'null') return Response.json(null)
          if (outcome === 'network') throw new Error('offline')
          if (outcome === 'deleted') fs.rmSync(file)
          else
            writeUpdateState(file, {
              ...state,
              [outcome === 'time' ? 'lastCheck' : outcome]:
                outcome === 'time' ? 456 : 'other',
            })
          return Response.json({ latest: '2.0.0' })
        },
      })
      await checkForUpdate(file)
      t.equal(readUpdateState(file)?.latest, undefined, outcome)
      t.notOk(fs.existsSync(`${file}.lock`))
    }
    fs.rmSync(file, { force: true })
    await checkForUpdate(file)
    writeUpdateState(file, { ...state, version: 'invalid' })
    await checkForUpdate(file)
    const { checkForUpdate: check } = await t.mockImport<
      typeof import('../src/update-check.ts')
    >('../src/update-check.ts', {
      'node:fs': t.createMock(fs, {
        rmSync: () => {
          throw new Error('read only')
        },
      }),
    })
    await check(file)
  },
)

t.test(
  'worker entry accepts paths, file URLs and missing arguments',
  async t => {
    const title = process.title
    t.teardown(() => {
      process.title = title
    })
    for (const script of [
      __CODE_SPLIT_SCRIPT_NAME,
      pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).href,
    ]) {
      process.title = 'test-update-check'
      t.intercept(process, 'argv', {
        value: [process.execPath, script],
      })
      await t.mockImport<typeof import('../src/update-check.ts')>(
        '../src/update-check.ts',
      )
      t.equal(process.title, 'vlt-update-check')
    }
    const file = join(t.testdir(), 'invalid.json')
    writeUpdateState(file, { ...state, version: 'dev' })
    fs.writeFileSync(`${file}.lock`, '')
    t.intercept(process, 'argv', {
      value: [process.execPath, __CODE_SPLIT_SCRIPT_NAME, file],
    })
    await t.mockImport<typeof import('../src/update-check.ts')>(
      '../src/update-check.ts',
    )
    t.notOk(fs.existsSync(`${file}.lock`))
  },
)
