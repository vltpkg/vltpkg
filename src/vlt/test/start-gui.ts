import t from 'tap'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathBase, PathScurry } from 'path-scurry'
import { PackageJson } from '@vltpkg/package-json'
import { Manifest } from '@vltpkg/types'
import { inferTools, formatDashboardJson } from '../src/start-gui.js'
import type {
  ConfigOptions,
  LoadedConfig,
} from '../src/config/index.js'
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
  const { startGUI } = await t.mockImport('../src/start-gui.js', {
    'node:http': {
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
    opener: (url: string) => {
      openURL = url
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
    conf: { options },
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
    } as ConfigOptions).map(({ name }: { name: string }) => name),
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

  const log = t.capture(console, 'log').args

  const { startGUI } = await t.mockImport('../src/start-gui.js', {
    opener: () => {},
  })

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
  t.matchSnapshot(
    readFileSync(resolve(tmp, 'graph.json'), 'utf8'),
    'should write graph.json with data from the current project',
  )
  t.matchSnapshot(files, 'should copy all files to tmp directory')
  t.matchSnapshot(log()[0], 'should log the server start message')

  // tests a POST to /select-project and swap graph.json content
  const req = await fetch(`http://localhost:${port}/select-project`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      path: resolve(dir, 'projects/other-project'),
    }),
  })
  const res = await req.json()
  t.strictSame(res, 'ok', 'should respond with ok')

  t.matchSnapshot(
    readFileSync(resolve(tmp, 'graph.json'), 'utf8'),
    'should update graph.json with new data',
  )
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
  const { startGUI } = await t.mockImport('../src/start-gui.js', {
    opener: () => {},
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
  t.matchSnapshot(
    files,
    'should not create json files if no data was found',
  )
})
