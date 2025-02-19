import type { PromiseSpawnOptions } from '@vltpkg/promise-spawn'
import { release } from 'os'
import t from 'tap'
import type { Test } from 'tap'

let RELEASE: string = release()
const SPAWNS: [string, string[], PromiseSpawnOptions][] = []
const mocks = {
  '@vltpkg/promise-spawn': {
    promiseSpawn: async (
      cmd: string,
      args: string[],
      opts: PromiseSpawnOptions,
    ) => {
      SPAWNS.push([cmd, args, opts])
    },
  },
  'node:os': {
    release: () => RELEASE,
  },
}

t.beforeEach(() => {
  SPAWNS.length = 0
  RELEASE = release()
})

const runTests = (t: Test) => {
  for (const platform of ['linux', 'darwin', 'win32']) {
    t.test(platform, async t => {
      const logs = t.capture(console, 'error').args
      t.intercept(process, 'platform', { value: platform })
      const { urlOpen } = await t.mockImport<
        typeof import('../src/index.ts')
      >('../src/index.ts', mocks)
      await urlOpen('https://example.com/')
      t.matchSnapshot(SPAWNS, 'spawns executed')
      t.matchSnapshot(logs(), 'logs printed')
    })
  }
  t.test('WSL', async t => {
    const logs = t.capture(console, 'error').args
    t.intercept(process, 'platform', { value: 'linux' })
    RELEASE = 'microsoft windows'
    const { urlOpen } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', mocks)
    await urlOpen('https://example.com/')
    t.matchSnapshot(SPAWNS, 'spawns executed')
    t.matchSnapshot(logs(), 'logs printed')
  })
}

t.test('isTTY', async t => {
  t.intercept(process.stderr, 'isTTY', { value: true })
  runTests(t)
})

t.test('not isTTY', async t => {
  t.intercept(process.stderr, 'isTTY', { value: false })
  runTests(t)
})
