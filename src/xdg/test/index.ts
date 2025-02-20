import { posix } from 'node:path'
import t from 'tap'
import type { XDG } from '../src/index.ts'

const mocks = {
  os: { homedir: () => '/home', tmpdir: () => '/tmp' },
  path: posix,
}

t.intercept(process, 'getuid', { value: () => 501 })

// format a XDG object for snapshot tests
const f = (x: XDG) => ({
  name: x.name,
  base: x.base,
  configBase: x.config(),
  config: x.config('test'),
  cacheBase: x.cache(),
  cache: x.cache('test'),
  dataBase: x.data(),
  data: x.data('test'),
  stateBase: x.state(),
  state: x.state('test'),
  runtimeBase: x.runtime(),
  runtime: x.runtime('test'),
})

const xdgEnvs = {
  XDG_CONFIG_HOME: '/xdg-env/config',
  XDG_CACHE_HOME: '/xdg-env/cache',
  XDG_DATA_HOME: '/xdg-env/data',
  XDG_STATE_HOME: '/xdg-env/state',
  XDG_RUNTIME_DIR: '/xdg-env/runtime',
}

t.test('win32', t => {
  t.intercept(process, 'platform', { value: 'win32' })
  t.test('with APPDATA/LOCALAPPDATA envs set', async t => {
    t.intercept(process, 'env', {
      value: { APPDATA: '/appdata', LOCALAPPDATA: '/localappdata' },
    })
    const { XDG } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', mocks)
    t.matchSnapshot(f(new XDG('app')))
  })
  t.test('with no envs set', async t => {
    t.intercept(process, 'env', { value: {} })
    const { XDG } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', mocks)
    t.matchSnapshot(f(new XDG('app')))
  })
  t.test('with XDG envs set', async t => {
    t.intercept(process, 'env', { value: xdgEnvs })
    const { XDG } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', mocks)
    t.matchSnapshot(f(new XDG('app')))
  })
  t.end()
})

t.test('darwin', t => {
  t.intercept(process, 'platform', { value: 'darwin' })
  t.test('with xdg envs', async t => {
    t.intercept(process, 'env', { value: xdgEnvs })
    const { XDG } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', mocks)
    t.matchSnapshot(f(new XDG('app')))
  })
  t.test('defaults', async t => {
    t.intercept(process, 'env', { value: {} })
    const { XDG } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', mocks)
    t.matchSnapshot(f(new XDG('app')))
  })
  t.end()
})

t.test('others', t => {
  const platforms: NodeJS.Platform[] = ['linux', 'aix', 'android']
  t.test('with xdg envs', t => {
    t.intercept(process, 'env', { value: xdgEnvs })
    let found: XDG | undefined = undefined
    for (const p of platforms) {
      t.test(p, async t => {
        t.intercept(process, 'platform', { value: p })
        const { XDG } = await t.mockImport<
          typeof import('../src/index.ts')
        >('../src/index.ts', mocks)
        if (!found) {
          found = new XDG('app')
          t.matchSnapshot(f(found))
        } else {
          t.same(new XDG('app'), found)
        }
      })
    }
    t.end()
  })
  t.test('defaults', t => {
    t.intercept(process, 'env', { value: {} })
    let found: XDG | undefined = undefined
    for (const p of platforms) {
      t.test(p, async t => {
        t.intercept(process, 'platform', { value: p })
        const { XDG } = await t.mockImport<
          typeof import('../src/index.ts')
        >('../src/index.ts', mocks)
        if (!found) {
          found = new XDG('app')
          t.matchSnapshot(f(found))
        } else {
          t.same(new XDG('app'), found)
        }
      })
    }
    t.end()
  })
  t.end()
})
