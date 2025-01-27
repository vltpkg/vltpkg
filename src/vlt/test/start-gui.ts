import { joinDepIDTuple } from '@vltpkg/dep-id'
import { type Dependency } from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { type Manifest } from '@vltpkg/types'
import { readdirSync, readFileSync } from 'node:fs'
import http from 'node:http'
import { resolve } from 'node:path'
import { PathScurry, type PathBase } from 'path-scurry'
import t from 'tap'
import {
  type ConfigOptions,
  type LoadedConfig,
} from '../src/config/index.js'
import {
  formatDashboardJson,
  inferTools,
  parseInstallOptions,
} from '../src/start-gui.js'
import { actualObject } from './fixtures/actual.js'

t.cleanSnapshot = s =>
  s.replace(
    /^(\s+)"projectRoot": ".*"/gm,
    '$1"projectRoot": "{ROOT}"',
  )

t.test('starts gui data and server', async t => {
  class PackageJson {
    read() {
      return { name: 'my-project', version: '1.0.0' }
    }
  }
  class PathScurry {
    lstatSync() {}
  }
  const options = {
    projectRoot: t.testdirName,
    packageJson: new PackageJson(),
    scurry: new PathScurry(),
  }

  let openURL = ''
  let openPort = 0
  let openHost = ''
  const dir = t.testdirName
  const { startGUI } = await t.mockImport<
    typeof import('../src/start-gui.js')
  >('../src/start-gui.js', {
    'node:http': {
      ...http,
      createServer() {
        return {
          listen(port: number, host: string, cb: () => void) {
            openPort = port
            openHost = host
            setImmediate(cb)
          },
        }
      },
    },
    '@vltpkg/url-open': {
      urlOpen(url: string) {
        openURL = url
      },
    },
    '@vltpkg/graph': {
      actual: {
        load() {
          return {
            options: {},
            nodes: {},
            edges: {},
            importers: [],
          }
        },
      },
      asDependency(item: any): Dependency {
        return item as Dependency
      },
    },
    '@vltpkg/package-json': {
      PackageJson,
    },
    '../src/read-project-folders.js': {
      readProjectFolders() {
        return [
          {
            name: 'my-project',
            fullpath: () => '/path/to/my-project',
            lstatSync: () => ({ mtimeMs: Date.now() }),
            resolve: () => '/path/to/my-project',
          },
        ]
      },
    },
  })

  // workaround for the import.meta.resolve issue not working with tap atm
  const assetsDir = resolve(
    import.meta.dirname,
    '../../../src/gui/dist',
  )

  const log = t.capture(console, 'log').args

  await startGUI({
    conf: { options, values: {} } as unknown as LoadedConfig,
    assetsDir,
    tmpDir: dir,
  })

  const tmp = resolve(dir, 'vltgui')
  const files: string[] = []
  for (const file of readdirSync(tmp)) {
    files.push(file)
  }
  t.matchSnapshot(files, 'should copy all files to tmp directory')

  t.matchSnapshot(
    JSON.parse(readFileSync(resolve(tmp, 'graph.json'), 'utf8')),
    'should write empty graph.json used in tests',
  )

  t.matchSnapshot(log()[0], 'should log the server start message')

  t.strictSame(openPort, 7017, 'should open the correct port')
  t.strictSame(openHost, 'localhost', 'should open the correct host')
  t.strictSame(
    openURL,
    'http://localhost:7017/dashboard',
    'should open the correct browser URL',
  )
})

t.test('inferTools', async t => {
  const dir = t.testdir({
    'with-engines': {
      'package.json': JSON.stringify({
        name: 'manifest-with-engines',
        engines: {
          node: '>=20',
          npm: '>=10',
        },
      }),
    },
    empty: {
      'package.json': JSON.stringify({
        name: 'empty-manifest',
      }),
    },
    'with-config-props': {
      'package.json': JSON.stringify({
        name: 'manifest-with-config-props',
        pnpm: {
          hooks: {
            readPackage: 'echo "Hello"',
          },
        },
      }),
    },
    'with-pnpm-lockfile': {
      'package.json': JSON.stringify({
        name: 'manifest-with-pnpm-lockfile',
      }),
      'pnpm-lock.yaml': '',
    },
  })
  const packageJson = new PackageJson()
  const scurry = new PathScurry(t.testdirName)
  const folders = new Map<string, PathBase>()
  const manis = new Map<string, Manifest>()
  for (const entry of scurry.readdirSync(dir)) {
    folders.set(entry.name, entry)
    manis.set(entry.name, packageJson.read(entry.fullpath()))
  }

  const mainWithEnginesFolder = folders.get('with-engines')!
  const mainWithEnginesMani = manis.get('with-engines')!
  t.strictSame(
    inferTools(mainWithEnginesMani, mainWithEnginesFolder, scurry),
    ['node', 'npm'],
  )

  const emptyFolder = folders.get('empty')!
  const emptyMani = manis.get('empty')!
  t.strictSame(inferTools(emptyMani, emptyFolder, scurry), ['js'])

  const withConfigPropsFolder = folders.get('with-config-props')!
  const withConfigPropsMani = manis.get('with-config-props')!
  t.strictSame(
    inferTools(withConfigPropsMani, withConfigPropsFolder, scurry),
    ['pnpm'],
  )

  const withPnpmLockfileFolder = folders.get('with-pnpm-lockfile')!
  const withPnpmLockfileMani = manis.get('with-pnpm-lockfile')!
  t.strictSame(
    inferTools(withPnpmLockfileMani, withPnpmLockfileFolder, scurry),
    ['pnpm'],
  )
})

t.test('formatDashboardJson', async t => {
  const dir = t.testdir({
    a: {},
    b: {
      'package.json': JSON.stringify({ name: 'b' }),
    },
  })
  const packageJson = new PackageJson()
  const scurry = new PathScurry(t.testdirName)
  t.strictSame(
    formatDashboardJson(scurry.readdirSync(dir), {
      packageJson,
      scurry,
    } as ConfigOptions).projects.map(
      ({ name }: { name: string }) => name,
    ),
    ['b'],
    'should skip folders without package.json',
  )
})

t.test('e2e server test', async t => {
  const dir = t.testdir({
    'assets-dir': {},
    projects: {
      'my-project': actualObject(t),
      'other-project': {
        'package.json': JSON.stringify({ name: 'other-project' }),
        'pnpm-lock.yaml': '',
      },
      'node-project': {
        'package.json': JSON.stringify({
          name: 'node-project',
          engines: { node: '>=10' },
        }),
      },
    },
  })
  t.chdir(resolve(dir, 'projects/my-project'))

  // workaround for the import.meta.resolve issue not working with tap atm
  const assetsDir = resolve(
    import.meta.dirname,
    '../../../src/gui/dist',
  )
  const log: string[] = []
  let ilog = ''

  const { startGUI } = await t.mockImport('../src/start-gui.js', {
    '@vltpkg/url-open': { urlOpen() {} },
    '../src/install.js': {
      async install() {
        ilog += 'install\n'
      },
    },
    '../src/uninstall.js': {
      async uninstall() {
        ilog += 'uninstall\n'
      },
    },
    '../src/output.js': {
      stderr: () => {},
      stdout: (str: string) => {
        log.push(str)
      },
    },
  })

  await t.test('/select-project', async t => {
    const port = 8017
    const options = {
      projectRoot: resolve(dir, 'projects/my-project'),
      packageJson: new PackageJson(),
      scurry: new PathScurry(dir),
    }
    const server = await startGUI({
      conf: {
        options,
        resetOptions(newProjectRoot: string) {
          options.projectRoot = newProjectRoot
        },
        values: {},
      } as LoadedConfig,
      assetsDir,
      port,
      tmpDir: resolve(dir, 'assets-dir'),
    })
    t.teardown(() => server.close())

    const tmp = resolve(dir, 'assets-dir/vltgui')
    const files: string[] = []
    for (const file of readdirSync(tmp)) {
      files.push(file)
    }
    t.ok(
      files.includes('index.js'),
      'should copy the index.js file to the tmp directory',
    )
    t.matchSnapshot(
      readFileSync(resolve(tmp, 'graph.json'), 'utf8'),
      'should write graph.json with data from the current project',
    )
    t.matchSnapshot(log, 'should log the server start message')

    // tests a POST to /select-project and swap graph.json content
    const reqSelectProject = await fetch(
      `http://localhost:${port}/select-project`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          path: resolve(dir, 'projects/other-project'),
        }),
      },
    )
    const resSelectProject = await reqSelectProject.json()
    t.strictSame(resSelectProject, 'ok', 'should respond with ok')

    t.matchSnapshot(
      readFileSync(resolve(tmp, 'graph.json'), 'utf8'),
      'should update graph.json with new data',
    )
  })

  await t.test('/install', async t => {
    const port = 8018
    const options = {
      projectRoot: resolve(dir, 'projects/my-project'),
      packageJson: new PackageJson(),
      scurry: new PathScurry(dir),
    }
    const server = await startGUI({
      conf: {
        options,
        resetOptions(newProjectRoot: string) {
          options.projectRoot = newProjectRoot
        },
      } as LoadedConfig,
      assetsDir,
      port,
      tmpDir: resolve(dir, 'assets-dir'),
    })
    t.teardown(() => server.close())

    // tests a POST to /install
    const reqInstall = await fetch(
      `http://localhost:${port}/install`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          add: {
            [joinDepIDTuple(['file', '.'])]: {
              abbrev: { version: 'latest', type: 'prod' },
            },
          },
        }),
      },
    )
    const resInstall = await reqInstall.json()
    t.matchSnapshot(ilog, 'should install dependencies')
    t.strictSame(resInstall, 'ok', 'should respond with ok')

    // missing add args
    ilog = ''
    const reqMissingArgs = await fetch(
      `http://localhost:${port}/install`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({}),
      },
    )
    const resMissingArgs = await reqMissingArgs.text()
    t.strictSame(ilog, '', 'should not install dependencies')
    t.strictSame(
      resMissingArgs,
      JSON.stringify(
        'Bad request.\nGUI install endpoint called without add argument',
      ),
      'should respond with bad request response',
    )
  })

  await t.test('install error', async t => {
    const port = 8019
    const options = {
      projectRoot: resolve(dir, 'projects/my-project'),
      packageJson: new PackageJson(),
      scurry: new PathScurry(dir),
    }
    // broken install
    const { startGUI } = await t.mockImport('../src/start-gui.js', {
      '@vltpkg/url-open': { urlOpen() {} },
      '../src/install.js': {
        async install() {
          throw new Error('ERR')
        },
      },
      '../src/output.js': {
        stderr: () => {},
        stdout: () => {},
      },
    })
    const server = await startGUI({
      conf: {
        options,
        resetOptions(newProjectRoot: string) {
          options.projectRoot = newProjectRoot
        },
      } as LoadedConfig,
      assetsDir,
      port,
      tmpDir: resolve(dir, 'assets-dir'),
    })
    t.teardown(() => server.close())

    const req = await fetch(`http://localhost:${port}/install`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        add: {
          [joinDepIDTuple(['file', '.'])]: {
            abbrev: { version: 'latest', type: 'prod' },
          },
        },
      }),
    })
    const res = await req.text()
    t.strictSame(
      req.status,
      500,
      'should respond with bad request status code',
    )
    t.match(
      res,
      /Install failed./,
      'should respond with failed error info',
    )
  })

  await t.test('/uninstall', async t => {
    const port = 8020
    const options = {
      projectRoot: resolve(dir, 'projects/my-project'),
      packageJson: new PackageJson(),
      scurry: new PathScurry(dir),
    }
    const server = await startGUI({
      conf: {
        options,
        resetOptions(newProjectRoot: string) {
          options.projectRoot = newProjectRoot
        },
      } as LoadedConfig,
      assetsDir,
      port,
      tmpDir: resolve(dir, 'assets-dir'),
    })
    t.teardown(() => server.close())

    // tests a POST to /uninstall
    const reqUninstall = await fetch(
      `http://localhost:${port}/uninstall`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          remove: {
            [joinDepIDTuple(['file', '.'])]: ['abbrev'],
          },
        }),
      },
    )
    const resUninstall = await reqUninstall.json()
    t.strictSame(resUninstall, 'ok', 'should respond with ok')

    // missing remove args
    const reqMissingArgs = await fetch(
      `http://localhost:${port}/uninstall`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({}),
      },
    )
    const resMissingArgs = await reqMissingArgs.text()
    t.strictSame(
      resMissingArgs,
      JSON.stringify(
        'Bad request.\nGUI uninstall endpoint called with no arguments',
      ),
      'should respond with bad request response',
    )
  })

  await t.test('uninstall error', async t => {
    const port = 8021
    const options = {
      projectRoot: resolve(dir, 'projects/my-project'),
      packageJson: new PackageJson(),
      scurry: new PathScurry(dir),
    }
    // broken uninstall
    const { startGUI } = await t.mockImport('../src/start-gui.js', {
      '@vltpkg/url-open': { urlOpen() {} },
      '../src/uninstall.js': {
        async uninstall() {
          throw new Error('ERR')
        },
      },
      '../src/output.js': {
        stderr: () => {},
        stdout: () => {},
      },
    })
    const server = await startGUI({
      conf: {
        options,
        resetOptions(newProjectRoot: string) {
          options.projectRoot = newProjectRoot
        },
      } as LoadedConfig,
      assetsDir,
      port,
      tmpDir: resolve(dir, 'assets-dir'),
    })
    t.teardown(() => server.close())

    const req = await fetch(`http://localhost:${port}/uninstall`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        remove: {
          [joinDepIDTuple(['file', '.'])]: ['abbrev'],
        },
      }),
    })
    const res = await req.text()
    t.strictSame(
      req.status,
      500,
      'should respond with bad request status code',
    )
    t.match(
      res,
      /Uninstall failed./,
      'should respond with failed error info',
    )
  })
})

t.test('no data to be found', async t => {
  const dir = t.testdir({
    'assets-dir': {},
    'empty-dir': {
      'nested-empty-dir': {},
    },
  })
  t.chdir(resolve(dir, 'empty-dir/nested-empty-dir'))

  // workaround for the import.meta.resolve issue not working with tap atm
  const assetsDir = resolve(
    import.meta.dirname,
    '../../../src/gui/dist',
  )

  t.capture(console, 'log').args // skip console.log to stdout
  const { startGUI } = await t.mockImport<
    typeof import('../src/start-gui.js')
  >('../src/start-gui.js', {
    '@vltpkg/url-open': { urlOpen() {} },
  })

  const port = 8017
  const options = {
    projectRoot: resolve(dir, 'empty-dir'),
    packageJson: new PackageJson(),
    scurry: new PathScurry(dir),
  }
  const server = await startGUI({
    conf: {
      options,
      resetOptions(newProjectRoot: string) {
        options.projectRoot = newProjectRoot
      },
      values: {
        'dashboard-root': [resolve(dir, 'emtpy-dir')],
      },
    } as unknown as LoadedConfig,
    assetsDir,
    port,
    tmpDir: resolve(dir, 'assets-dir'),
  })
  t.teardown(() => server.close())

  const tmp = resolve(dir, 'assets-dir/vltgui')
  const files: string[] = []
  for (const file of readdirSync(tmp)) {
    files.push(file)
  }
  t.notOk(
    files.some(name => name.endsWith('.json')),
    'should not create json files if no data was found',
  )
})

t.test('parseInstallArgs', async t => {
  const rootDepID = joinDepIDTuple(['file', '.'])
  const wsADepID = joinDepIDTuple(['workspace', 'packages/a'])
  t.matchSnapshot(
    parseInstallOptions({} as LoadedConfig, {
      [rootDepID]: {},
    }),
    'no item added to root',
  )

  t.matchSnapshot(
    parseInstallOptions({} as LoadedConfig, {
      [rootDepID]: {
        abbrev: { version: 'latest', type: 'dev' },
      },
    }),
    'single item added to root',
  )

  t.matchSnapshot(
    parseInstallOptions({} as LoadedConfig, {
      [wsADepID]: {
        abbrev: { version: 'latest', type: 'optional' },
      },
    }),
    'single item added to workspace',
  )

  t.matchSnapshot(
    parseInstallOptions({} as LoadedConfig, {
      [rootDepID]: {
        abbrev: { version: 'latest', type: 'dev' },
      },
      [wsADepID]: {
        'english-days': { version: 'latest', type: 'prod' },
        'simple-output': { version: 'latest', type: 'prod' },
      },
    }),
    'multiple item added to root and workspace',
  )
})
