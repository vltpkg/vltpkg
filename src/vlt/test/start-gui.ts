import type { VltServerListening } from '@vltpkg/server'
import EventEmitter from 'events'
import { resolve } from 'path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'
import { getDefaultStartingRoute } from '../src/start-gui.ts'

t.test('getDefaultStartingRoute', async t => {
  const dir = t.testdir({
    project: {
      'package.json': JSON.stringify({ name: 'valid' }),
    },
    linky: {
      'package.json': t.fixture('symlink', '../project/package.json'),
    },
  })
  const scurry = new PathScurry(dir)
  t.equal(
    await getDefaultStartingRoute({
      scurry,
      projectRoot: resolve(dir, 'project'),
    }),
    `/explore?query=${encodeURIComponent(':root')}`,
  )
  t.equal(
    await getDefaultStartingRoute({
      scurry,
      projectRoot: resolve(dir, 'linky'),
    }),
    `/dashboard`,
  )
  t.equal(
    await getDefaultStartingRoute({
      scurry,
      projectRoot: dir,
    }),
    `/dashboard`,
  )
  t.equal(
    await getDefaultStartingRoute({
      startingRoute: '/asdf',
      scurry,
      projectRoot: dir,
    }),
    `/asdf`,
  )
})

t.test('startGUI()', async t => {
  let optionsResetted: string | undefined = undefined
  const projectRoot = t.testdir({})

  const scurry = new PathScurry(projectRoot)
  const conf = {
    resetOptions: (dir: string) => (optionsResetted = dir),
    options: {
      scurry,
      projectRoot,
    },
  } as unknown as LoadedConfig

  let optionsUpdated: LoadedConfig['options'] | undefined = undefined
  let serverStarted = false
  const mockServer = Object.assign(
    new EventEmitter<{
      needConfigUpdate: [string]
    }>(),
    {
      updateOptions: (options: LoadedConfig['options']) => {
        optionsUpdated = options
      },
      start: () => {
        serverStarted = true
      },
      address: (route = '') => `server-address${route}`,
    },
  ) as unknown as VltServerListening

  let serverCreated = false
  let urlOpened = false
  let logged: string | undefined = undefined
  const { startGUI } = await t.mockImport<
    typeof import('../src/start-gui.ts')
  >('../src/start-gui.ts', {
    '../src/output.ts': {
      stdout: (msg: string) => (logged = msg),
    },
    '@vltpkg/server': {
      createServer: (options: unknown) => {
        t.equal(options, conf.options)
        serverCreated = true
        return mockServer
      },
    },
    '@vltpkg/url-open': {
      urlOpen: (url: string) => {
        urlOpened = true
        t.equal(url, 'server-address/dashboard')
      },
    },
  })

  const server = await startGUI(conf)
  t.equal(serverCreated, true)
  t.equal(serverStarted, true)
  t.equal(logged, '⚡️ vlt GUI running at server-address')
  t.equal(urlOpened, true)
  server.emit('needConfigUpdate', '/some/new/dir')
  t.equal(optionsResetted, '/some/new/dir')
  t.equal(optionsUpdated, conf.options)
})
