import { resolve } from 'node:path'
import t from 'tap'
import { type PathBase, PathScurry } from 'path-scurry'
import { PackageJson } from '@vltpkg/package-json'
import { type Manifest } from '@vltpkg/types'
import {
  asProjectTools,
  isProjectTools,
  inferTools,
  type ProjectTools,
  type DashboardProjectData,
  getGraphProjectData,
} from '../src/project-info.ts'
import {
  type ConfigOptions,
  type LoadedConfig,
} from '../src/config/index.ts'

t.cleanSnapshot = s => s.replace(/\\\\/g, '/')

t.test('isProjectTools', async t => {
  t.ok(isProjectTools('vlt'), 'should return true for vlt')
  t.notOk(
    isProjectTools('non-indexed-tool'),
    'should return false for unknown tool',
  )
})

t.test('asProjectTools', async t => {
  const tool: ProjectTools = asProjectTools('vlt')
  t.equal(tool, 'vlt', 'should return type casted string')
  t.throws(
    () => asProjectTools('non-indexed-tool'),
    /Invalid dashboard tool: non-indexed-tool/,
    'should throw an error for unknown tool',
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

t.test('getReadablePath', async t => {
  await t.test('posix', async t => {
    const { getReadablePath } = await t.mockImport(
      '../src/project-info.ts',
      {
        'node:os': {
          homedir() {
            return '/home/user'
          },
        },
      },
    )
    const from = [
      '/home/user/foo',
      '/home/user/foo/projects/lorem/node_modules/ipsum',
      '/path/to/project/node_modules/a/node_modules/b',
    ]
    const to = [
      '~/foo',
      '~/foo/projects/lorem/node_modules/ipsum',
      '/path/to/project/node_modules/a/node_modules/b',
    ]
    t.strictSame(
      from.map(f => getReadablePath(f)),
      to,
      'should return the correct posix readable path',
    )
  })
  await t.test('windows', async t => {
    const { getReadablePath } = await t.mockImport(
      '../src/project-info.ts',
      {
        'node:os': {
          homedir() {
            return 'C:\\Users\\username'
          },
        },
      },
    )
    const from = [
      'C:\\Users\\username',
      'C:\\Users\\username\\projects\\lorem\\node_modules\\ipsum',
      'C:\\path\\to\\project\\node_modules\\a\\node_modules\\b',
    ]
    const to = [
      '~',
      '~\\projects\\lorem\\node_modules\\ipsum',
      'C:\\path\\to\\project\\node_modules\\a\\node_modules\\b',
    ]
    t.strictSame(
      from.map(f => getReadablePath(f)),
      to,
      'should return the correct windows readable path',
    )
  })
})

t.test('getDashboardProjectData', async t => {
  const dir = t.testdir({
    home: {
      user: {
        projects: {
          a: {
            'package.json': JSON.stringify({
              name: 'a',
              version: '1.0.0',
              engines: {
                node: '>=20',
                npm: '>=10',
              },
            }),
          },
          b: {}, // no package.json file in **b**
          c: {
            'package.json': JSON.stringify({
              name: 'c',
              version: '1.0.0',
            }),
            'vlt.json': {},
          },
          d: {
            'package.json': JSON.stringify({
              version: '1.0.0',
            }),
            'pnpm-lock.yaml': {},
          },
        },
      },
    },
  })
  const { getDashboardProjectData } = await t.mockImport(
    '../src/project-info.ts',
    {
      'node:os': {
        homedir() {
          return resolve(dir, 'home', 'user')
        },
      },
    },
  )
  const packageJson = new PackageJson()
  const scurry = new PathScurry(t.testdirName)
  const folders: PathBase[] = []
  const conf: LoadedConfig = {
    options: {
      packageJson,
      scurry,
    } as ConfigOptions,
  } as LoadedConfig

  // read all folders in projects, creating a list of PathBase objects
  for (const entry of scurry.readdirSync(
    resolve(dir, 'home', 'user', 'projects'),
  )) {
    folders.push(entry)
  }

  const res: DashboardProjectData[] = []
  for (const folder of folders) {
    // mock fixed mtime
    folder.lstatSync = () => ({ mtimeMs: 1 }) as any

    // collect dashboard project data
    const data = getDashboardProjectData(folder, conf)
    if (data) {
      res.push(data)
    }
  }
  t.matchSnapshot(
    res,
    'should return the correct dashboard project data',
  )
})

t.test('getGraphProjectData', async t => {
  const dir = t.testdir({
    home: {
      user: {
        projects: {
          a: {
            'package.json': JSON.stringify({
              name: 'a',
              version: '1.0.0',
              engines: {
                node: '>=20',
                npm: '>=10',
              },
            }),
          },
          b: {
            'package.json': JSON.stringify({
              name: 'b',
              version: '1.0.0',
            }),
            node_modules: {
              '.vlt': {},
            },
          },
          c: {
            'package.json': JSON.stringify({
              name: 'c',
              version: '1.0.0',
            }),
            'vlt.json': {},
          },
        },
      },
    },
  })
  const packageJson = new PackageJson()
  const scurry = new PathScurry(dir)
  const conf: LoadedConfig = {
    options: {
      packageJson,
      scurry,
    } as ConfigOptions,
  } as LoadedConfig

  const a = scurry.lstatSync(
    resolve(dir, 'home', 'user', 'projects', 'a'),
  )
  if (!a) {
    throw new Error('a is not a valid path')
  }
  t.matchSnapshot(
    getGraphProjectData(conf, a),
    'should return the correct graph project data for a node+npm project',
  )

  const b = scurry.lstatSync(
    resolve(dir, 'home', 'user', 'projects', 'b'),
  )
  if (!b) {
    throw new Error('b is not a valid path')
  }
  t.matchSnapshot(
    getGraphProjectData(conf, b),
    'should return the correct graph project data for a vlt project',
  )

  const c = scurry.lstatSync(
    resolve(dir, 'home', 'user', 'projects', 'c'),
  )
  if (!c) {
    throw new Error('c is not a valid path')
  }
  t.matchSnapshot(
    getGraphProjectData(conf, c),
    'should return the correct graph project data for a non-installed vlt project',
  )

  t.matchSnapshot(
    getGraphProjectData(conf),
    'should return emtpy response on missing folder',
  )
})

t.test('getGraphProjectData empty vlt-installed project', async t => {
  const dir = t.testdir({
    home: {
      user: {
        projects: {
          'my-project': {
            'package.json': JSON.stringify({
              name: 'my-project',
              version: '1.0.0',
              author: 'Ruy Adorno <ruy@example.com>',
            }),
            node_modules: {
              '.vlt-lock.json': JSON.stringify({
                nodes: [],
                edges: [],
              }),
            },
          },
        },
      },
    },
  })
  const packageJson = new PackageJson()
  const scurry = new PathScurry(dir)
  const conf: LoadedConfig = {
    options: {
      packageJson,
      scurry,
    } as ConfigOptions,
  } as LoadedConfig

  const myProject = scurry.lstatSync(
    resolve(dir, 'home', 'user', 'projects', 'my-project'),
  )
  if (!myProject) {
    throw new Error('my-project is not a valid path')
  }
  t.matchSnapshot(
    getGraphProjectData(conf, myProject),
    'should return vltInstalled: true for an empty but installed project',
  )
})
