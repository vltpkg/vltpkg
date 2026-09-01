import type { PromiseSpawnOptions } from '@vltpkg/promise-spawn'
import { release } from 'node:os'
import t from 'tap'
import type { Test } from 'tap'

const mockUrlOpen = async (t: Test) => {
  const logs = t.capture(console, 'error').args
  const { urlOpen } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', mocks)
  return { urlOpen, logs }
}

let RELEASE: string = release()
let SPAWN_ERROR: Error | undefined = undefined
const SPAWNS: [string, string[], PromiseSpawnOptions][] = []
const mocks = {
  '@vltpkg/promise-spawn': {
    promiseSpawn: async (
      cmd: string,
      args: string[],
      opts: PromiseSpawnOptions,
    ) => {
      SPAWNS.push([cmd, args, opts])
      if (SPAWN_ERROR) throw SPAWN_ERROR
    },
  },
  '@vltpkg/which': {
    which: async (cmd: string) => cmd,
  },
  'node:os': {
    release: () => RELEASE,
  },
}

t.beforeEach(() => {
  SPAWNS.length = 0
  RELEASE = release()
  SPAWN_ERROR = undefined
})

const runTests = (t: Test) => {
  for (const platform of ['linux', 'darwin', 'win32']) {
    t.test(platform, async t => {
      t.intercept(process, 'platform', { value: platform })
      const { urlOpen, logs } = await mockUrlOpen(t)
      await urlOpen('https://example.com/')
      t.matchSnapshot(SPAWNS, 'spawns executed')
      t.matchSnapshot(logs(), 'logs printed')
    })
  }
  t.test('WSL', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    RELEASE = 'microsoft windows'
    const { urlOpen, logs } = await mockUrlOpen(t)
    await urlOpen('https://example.com/')
    t.matchSnapshot(SPAWNS, 'spawns executed')
    t.matchSnapshot(logs(), 'logs printed')
  })
}

t.test('isTTY', async t => {
  t.intercept(process.stdin, 'isTTY', { value: true })
  t.intercept(process.stderr, 'isTTY', { value: true })
  runTests(t)
})

t.test('not isTTY', async t => {
  t.intercept(process.stdin, 'isTTY', { value: true })
  t.intercept(process.stderr, 'isTTY', { value: false })
  runTests(t)
})

t.test('stdin and stderr both not isTTY', async t => {
  t.intercept(process.stdin, 'isTTY', { value: false })
  t.intercept(process.stderr, 'isTTY', { value: false })
  runTests(t)
})

t.test('no spawn if which returns null', async t => {
  const { urlOpen } = await mockUrlOpen(t)
  await urlOpen('https://example.com/')
  t.strictSame(SPAWNS, [])
})

t.test('spawn failure does not throw', async t => {
  t.intercept(process.stdin, 'isTTY', { value: true })
  t.intercept(process.stderr, 'isTTY', { value: false })
  SPAWN_ERROR = new Error('command failed')
  const { urlOpen, logs } = await mockUrlOpen(t)
  await urlOpen('https://example.com/')
  t.strictSame(logs(), [
    ['Opening a web browser to: https://example.com/'],
    [
      'Could not open a browser. Please open https://example.com/ manually.',
    ],
  ])
})

t.test('no failure message if signal was aborted', async t => {
  t.intercept(process.stdin, 'isTTY', { value: true })
  t.intercept(process.stderr, 'isTTY', { value: false })
  SPAWN_ERROR = new Error('command failed')
  const { urlOpen, logs } = await mockUrlOpen(t)
  const ac = new AbortController()
  ac.abort()
  await urlOpen('https://example.com/', { signal: ac.signal })
  t.strictSame(logs(), [
    ['Opening a web browser to: https://example.com/'],
  ])
})
