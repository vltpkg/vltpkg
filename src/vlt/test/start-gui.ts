import { joinDepIDTuple } from '@vltpkg/dep-id'
import { type Dependency } from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import http from 'node:http'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import {
  type ConfigOptions,
  type LoadedConfig,
} from '../src/config/index.ts'
import {
  formatDashboardJson,
  parseInstallOptions,
} from '../src/start-gui.ts'
import { actualObject } from './fixtures/actual.ts'

t.cleanSnapshot = s =>
  s
    .replace(
      /^(\s+)"projectRoot": ".*"/gm,
      '$1"projectRoot": "{ROOT}"',
    )
    .replace(/\\\\/g, '/')

t.test('starts gui data and server', async t => {
  const dir = t.testdir({})
  class PackageJson {
    read() {
      return { name: 'my-project', version: '1.0.0' }
    }
  }
  const options = {
    projectRoot: dir,
    packageJson: new PackageJson(),
    scurry: new PathScurry(),
  }

  let openURL = ''
  let openPort = 0
  let openHost = ''
  const { startGUI } = await t.mockImport<
    typeof import('../src/start-gui.ts')
  >('../src/start-gui.ts', {
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
    (
      await formatDashboardJson(scurry.readdirSync(dir), {
        options: {
          packageJson,
          scurry,
        } as ConfigOptions,
        values: {},
      } as LoadedConfig)
    ).projects.map(({ name }: { name: string }) => name),
    ['b'],
    'should skip folders without package.json',
  )
})

t.test('formatDashboardJson dashboardProjectLocations', async t => {
  const dir = t.testdir({
    foo: {
      'package.json': JSON.stringify({ name: 'foo' }),
    },
    projects: {
      a: {
        'package.json': JSON.stringify({ name: 'a' }),
      },
      b: {
        'package.json': JSON.stringify({ name: 'b' }),
      },
    },
    drafts: {
      recent: {
        c: {
          'package.json': JSON.stringify({ name: 'c' }),
        },
      },
      previous: {
        d: {
          'package.json': JSON.stringify({ name: 'd' }),
        },
        e: {
          'package.json': JSON.stringify({ name: 'e' }),
        },
        f: {
          'package.json': JSON.stringify({ name: 'f' }),
        },
      },
      more: {
        util: {
          extra: {
            g: {
              'package.json': JSON.stringify({ name: 'g' }),
            },
          },
        },
        h: {
          'package.json': JSON.stringify({ name: 'h' }),
        },
      },
      tmp: {},
    },
  })
  const scurry = new PathScurry(t.testdirName)
  const projectFolders = [
    scurry.lstatSync(resolve(dir, 'foo')),
    scurry.lstatSync(resolve(dir, 'projects/a')),
    scurry.lstatSync(resolve(dir, 'projects/b')),
    scurry.lstatSync(resolve(dir, 'drafts/recent/c')),
    scurry.lstatSync(resolve(dir, 'drafts/previous/d')),
    scurry.lstatSync(resolve(dir, 'drafts/previous/e')),
    scurry.lstatSync(resolve(dir, 'drafts/previous/f')),
    scurry.lstatSync(resolve(dir, 'drafts/more/util/extra/g')),
    scurry.lstatSync(resolve(dir, 'drafts/more/h')),
  ]
  const packageJson = new PackageJson()
  const { formatDashboardJson } = await t.mockImport(
    '../src/start-gui.ts',
    {
      'node:os': {
        ...(await import('node:os')),
        homedir() {
          return dir
        },
      },
      '../src/project-info.js': {
        ...(await import('../src/project-info.ts')),
        getReadablePath: (path: string) => path.replace(dir, '~'),
      },
    },
  )
  t.matchSnapshot(
    (
      await formatDashboardJson(projectFolders, {
        options: {
          packageJson,
          scurry,
        } as ConfigOptions,
        values: {},
      } as LoadedConfig)
    ).dashboardProjectLocations,
    'should return the expected dashboard project locations',
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
  const mocks = {
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
  }

  const { startGUI } = await t.mockImport(
    '../src/start-gui.ts',
    mocks,
  )

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

  await t.test('/create-project', async t => {
    ilog = ''
    const port = 8022
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
    t.matchSnapshot(log, 'should log the server start message')

    await t.test('standard request', async t => {
      ilog = ''
      // tests a POST to /create-project
      const reqSelectProject = await fetch(
        `http://localhost:${port}/create-project`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            path: resolve(dir, 'projects'),
            name: 'new-project',
            author: 'Ruy Adorno',
          }),
        },
      )
      const resSelectProject = await reqSelectProject.json()
      t.strictSame(resSelectProject, 'ok', 'should respond with ok')

      t.ok(existsSync(resolve(dir, 'projects/new-project')))

      t.matchSnapshot(
        readFileSync(resolve(tmp, 'graph.json'), 'utf8'),
        'should update graph.json with new project data',
      )
    })

    await t.test('invalid name', async t => {
      ilog = ''
      // tests an invalid name POST to /create-project
      const reqSelectProject = await fetch(
        `http://localhost:${port}/create-project`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            path: resolve(dir, 'projects'),
            name: 'B0RK$$$',
            author: 'Ruy Adorno',
          }),
        },
      )
      const resSelectProject = await reqSelectProject.json()
      t.strictSame(
        resSelectProject,
        'Bad request.\nProject name must be lowercase, alphanumeric, and may contain hyphens',
        'should respond with validation error message',
      )
      t.notOk(existsSync(resolve(dir, 'projects/B0RK$$$')))
    })

    await t.test('invalid long name', async t => {
      ilog = ''
      // tests an invalid name POST to /create-project
      const reqSelectProject = await fetch(
        `http://localhost:${port}/create-project`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            path: resolve(dir, 'projects'),
            name: 'this-is-a-very-long-project-name-that-should-not-be-allowed-to-exist-in-the-filesystem-because-it-is-too-long-and-will-cause-problems',
            author: 'Ruy Adorno',
          }),
        },
      )
      const resSelectProject = await reqSelectProject.json()
      t.strictSame(
        resSelectProject,
        'Bad request.\nProject name must be lowercase, alphanumeric, and may contain hyphens',
        'should respond with validation error message',
      )
      t.notOk(existsSync(resolve(dir, 'projects/B0RK$$$')))
    })

    await t.test('invalid path', async t => {
      ilog = ''
      // tests an invalid path POST to /create-project
      const reqSelectProject = await fetch(
        `http://localhost:${port}/create-project`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            path: 1234,
            name: 'another-new-project',
            author: 'Ruy Adorno',
          }),
        },
      )
      const resSelectProject = await reqSelectProject.json()
      t.strictSame(
        resSelectProject,
        'Bad request.\nProject path must be a string',
        'should respond with path validation error message',
      )
      t.notOk(
        existsSync(resolve(dir, 'projects/another-new-project')),
      )
    })

    await t.test('cli error', async t => {
      ilog = ''
      const stderr = console.error
      const port = 8023

      console.error = () => {}
      const { startGUI } = await t.mockImport('../src/start-gui.ts', {
        ...mocks,
        '../src/init.js': {
          async init() {
            throw new Error('ERR')
          },
        },
      })
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
      t.teardown(() => {
        console.error = stderr
        server.close()
      })

      // tests a failed POST to /create-project
      const reqSelectProject = await fetch(
        `http://localhost:${port}/create-project`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            path: resolve(dir, 'projects'),
            name: 'new-project',
            author: 'Ruy Adorno',
          }),
        },
      )
      const resSelectProject = await reqSelectProject.json()
      t.strictSame(
        resSelectProject,
        'CLI Error\nERR',
        'should respond with cli error message',
      )
    })
  })

  await t.test('/install', async t => {
    ilog = ''
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
    const { startGUI } = await t.mockImport('../src/start-gui.ts', {
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
    const { startGUI } = await t.mockImport('../src/start-gui.ts', {
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
    typeof import('../src/start-gui.ts')
  >('../src/start-gui.ts', {
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
