import type { VltServerListening } from '@vltpkg/server'
import EventEmitter from 'node:events'
import { resolve } from 'node:path'
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

  // Test with default queryString (:root)
  t.equal(
    await getDefaultStartingRoute({
      scurry,
      projectRoot: resolve(dir, 'project'),
    }),
    `/explore/FwJw9mAuQ/overview`,
  )

  // Test with custom queryString
  t.equal(
    await getDefaultStartingRoute({
      queryString: '#lodash',
      scurry,
      projectRoot: resolve(dir, 'project'),
    }),
    '/explore/MQGw9gJghgzgFkA/overview',
  )

  // Test with complex queryString (DSS query)
  t.equal(
    await getDefaultStartingRoute({
      queryString: ':prod :scope(react)',
      scurry,
      projectRoot: resolve(dir, 'project'),
    }),
    '/explore/FwBwTg9gJgBMDOBjCICmAKMqCGiAuAlEA/overview',
  )

  // Test with symbolic link (should return root regardless of queryString)
  t.equal(
    await getDefaultStartingRoute({
      queryString: '#custom-target',
      scurry,
      projectRoot: resolve(dir, 'linky'),
    }),
    `/`,
  )

  // Test with no package.json (should return root regardless of queryString)
  t.equal(
    await getDefaultStartingRoute({
      queryString: '#custom-target',
      scurry,
      projectRoot: dir,
    }),
    `/`,
  )

  // Test with startingRoute (should override queryString)
  t.equal(
    await getDefaultStartingRoute({
      queryString: '#custom-target',
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
    values: {
      target: ':root',
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
  ) as VltServerListening

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
        t.strictSame(options, {
          ...conf.options,
          assetsDir: undefined,
        })
        serverCreated = true
        return mockServer
      },
    },
    '@vltpkg/url-open': {
      urlOpen: (url: string) => {
        urlOpened = true
        t.equal(url, 'server-address/')
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

t.test('startGUI() with --target option', async t => {
  t.test('with custom target and package.json', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({ name: 'test-project' }),
    })
    const scurry = new PathScurry(projectRoot)
    const conf = {
      resetOptions: () => {},
      options: {
        scurry,
        projectRoot,
      },
      values: {
        target: '#lodash',
      },
    } as unknown as LoadedConfig

    const mockServer = Object.assign(
      new EventEmitter<{
        needConfigUpdate: [string]
      }>(),
      {
        updateOptions: () => {},
        start: () => {},
        address: (route = '') => `server-address${route}`,
      },
    ) as unknown as VltServerListening

    let urlOpened = false
    let openedUrl: string | undefined = undefined
    const { startGUI } = await t.mockImport<
      typeof import('../src/start-gui.ts')
    >('../src/start-gui.ts', {
      '../src/output.ts': {
        stdout: () => {},
      },
      '@vltpkg/server': {
        createServer: () => mockServer,
      },
      '@vltpkg/url-open': {
        urlOpen: (url: string) => {
          urlOpened = true
          openedUrl = url
        },
      },
    })

    await startGUI(conf)
    t.equal(urlOpened, true)
    t.equal(
      openedUrl,
      'server-address/explore/MQGw9gJghgzgFkA/overview',
    )
  })

  t.test('with custom target and no package.json', async t => {
    const projectRoot = t.testdir({})
    const scurry = new PathScurry(projectRoot)
    const conf = {
      resetOptions: () => {},
      options: {
        scurry,
        projectRoot,
      },
      values: {
        target: '#lodash',
      },
    } as unknown as LoadedConfig

    const mockServer = Object.assign(
      new EventEmitter<{
        needConfigUpdate: [string]
      }>(),
      {
        updateOptions: () => {},
        start: () => {},
        address: (route = '') => `server-address${route}`,
      },
    ) as unknown as VltServerListening

    let urlOpened = false
    let openedUrl: string | undefined = undefined
    const { startGUI } = await t.mockImport<
      typeof import('../src/start-gui.ts')
    >('../src/start-gui.ts', {
      '../src/output.ts': {
        stdout: () => {},
      },
      '@vltpkg/server': {
        createServer: () => mockServer,
      },
      '@vltpkg/url-open': {
        urlOpen: (url: string) => {
          urlOpened = true
          openedUrl = url
        },
      },
    })

    await startGUI(conf)
    t.equal(urlOpened, true)
    t.equal(openedUrl, 'server-address/')
  })

  t.test('with complex DSS query target', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({ name: 'test-project' }),
    })
    const scurry = new PathScurry(projectRoot)
    const conf = {
      resetOptions: () => {},
      options: {
        scurry,
        projectRoot,
      },
      values: {
        target: ':prod :scope(react)',
      },
    } as unknown as LoadedConfig

    const mockServer = Object.assign(
      new EventEmitter<{
        needConfigUpdate: [string]
      }>(),
      {
        updateOptions: () => {},
        start: () => {},
        address: (route = '') => `server-address${route}`,
      },
    ) as unknown as VltServerListening

    let urlOpened = false
    let openedUrl: string | undefined = undefined
    const { startGUI } = await t.mockImport<
      typeof import('../src/start-gui.ts')
    >('../src/start-gui.ts', {
      '../src/output.ts': {
        stdout: () => {},
      },
      '@vltpkg/server': {
        createServer: () => mockServer,
      },
      '@vltpkg/url-open': {
        urlOpen: (url: string) => {
          urlOpened = true
          openedUrl = url
        },
      },
    })

    await startGUI(conf)
    t.equal(urlOpened, true)
    t.equal(
      openedUrl,
      'server-address/explore/FwBwTg9gJgBMDOBjCICmAKMqCGiAuAlEA/overview',
    )
  })

  t.test('with startingRoute parameter overrides target', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({ name: 'test-project' }),
    })
    const scurry = new PathScurry(projectRoot)
    const conf = {
      resetOptions: () => {},
      options: {
        scurry,
        projectRoot,
      },
      values: {
        target: '#lodash',
      },
    } as unknown as LoadedConfig

    const mockServer = Object.assign(
      new EventEmitter<{
        needConfigUpdate: [string]
      }>(),
      {
        updateOptions: () => {},
        start: () => {},
        address: (route = '') => `server-address${route}`,
      },
    ) as unknown as VltServerListening

    let urlOpened = false
    let openedUrl: string | undefined = undefined
    const { startGUI } = await t.mockImport<
      typeof import('../src/start-gui.ts')
    >('../src/start-gui.ts', {
      '../src/output.ts': {
        stdout: () => {},
      },
      '@vltpkg/server': {
        createServer: () => mockServer,
      },
      '@vltpkg/url-open': {
        urlOpen: (url: string) => {
          urlOpened = true
          openedUrl = url
        },
      },
    })

    await startGUI(conf, '/custom-route')
    t.equal(urlOpened, true)
    t.equal(openedUrl, 'server-address/custom-route')
  })
})
