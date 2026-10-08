import t from 'tap'
import { PackageJson } from '@vltpkg/package-json'
import type { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import {
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import { objectLikeOutput } from '../src/visualization/object-like-output.ts'
import { mockPackageInfo as mockPackageInfoBase } from './fixtures/reify.ts'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { UpdateOptions } from '../src/update.ts'

const createMockPackageInfo = (
  overrides: Partial<typeof mockPackageInfoBase> = {},
) =>
  ({
    ...mockPackageInfoBase,
    ...overrides,
  }) as unknown as PackageInfoClient

const mockPackageInfo = createMockPackageInfo()

t.test('update', async t => {
  const options = {
    projectRoot: t.testdirName,
    scurry: {},
    packageJson: {
      read() {
        return { name: 'my-project', version: '1.0.0' }
      },
    },
  } as unknown as UpdateOptions
  let log = ''

  const { update } = await t.mockImport<
    typeof import('../src/update.ts')
  >('../src/update.ts', {
    '../src/ideal/build-ideal-from-starting-graph.ts': {
      buildIdealFromStartingGraph: async () => {
        log += 'build-ideal-from-starting-graph\n'
      },
    },
    '../src/actual/load.ts': {
      load: () => {
        log += 'actual.load\n'
      },
    },
    '../src/reify/index.ts': {
      reify: async () => {
        log += 'reify\n'
        return { buildQueue: [], diff: {} }
      },
    },
    '../src/modifiers.ts': {
      GraphModifier: {
        maybeLoad() {
          log += 'GraphModifier.maybeLoad\n'
        },
      },
    },
    '@vltpkg/workspaces': {
      Monorepo: { maybeLoad: () => undefined },
    },
  })

  await update(options)

  const expected =
    [
      'GraphModifier.maybeLoad',
      'build-ideal-from-starting-graph',
      'actual.load',
      'reify',
    ].join('\n') + '\n'
  t.equal(
    log,
    expected,
    'should call build-ideal-from-starting-graph -> actual.load -> reify in order',
  )
})

t.test(
  'update with no package.json file in cwd calls init',
  async t => {
    const dir = t.testdir({})
    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
    } as unknown as UpdateOptions

    let initCalled = false
    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      '@vltpkg/init': {
        init: async () => {
          initCalled = true
        },
      },
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
    })

    // Mock the second read after init
    let readCount = 0
    options.packageJson.read = () => {
      readCount++
      if (readCount === 1) {
        throw Object.assign(
          new Error('Could not read package.json file'),
          {
            code: 'ENOENT',
          },
        )
      }
      return { name: 'test', version: '1.0.0' }
    }

    await t.resolves(update(options), 'should succeed after init')
    t.ok(initCalled, 'should call init when package.json is missing')
  },
)

t.test('unknown error reading package.json', async t => {
  const dir = t.testdir({})
  const options = {
    projectRoot: dir,
    scurry: new PathScurry(),
    packageJson: {
      read() {
        throw new Error('ERR')
      },
    },
    packageInfo: mockPackageInfo,
  } as unknown as UpdateOptions
  const { update } = await t.mockImport<
    typeof import('../src/update.ts')
  >('../src/update.ts', {})

  await t.rejects(
    update(options),
    /ERR/,
    'should throw unknown errors',
  )
})

t.test(
  'update ignores expectLockfile and frozenLockfile flags',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      // No vlt-lock.json file on purpose
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
      frozenLockfile: true,
    } as unknown as UpdateOptions

    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
    })

    await t.resolves(
      update(options),
      'should not enforce lockfile on update',
    )
  },
)

t.test(
  'update uses package.json specs, ignoring existing node_modules and lockfile',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          // exact version present in fixtures to avoid network access
          'strip-ansi': '7.1.0',
        },
      }),
      // lockfile present but empty/outdated
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 1,
        options: {},
        nodes: {},
        edges: {},
      }),
      node_modules: {
        'strip-ansi': {
          'package.json': JSON.stringify({
            name: 'strip-ansi',
            version: '6.0.1',
          }),
        },
      },
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
    } as unknown as UpdateOptions

    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      // Avoid making any file system changes
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
    })

    const { graph } = await update(options)
    t.match(
      objectLikeOutput(graph),
      /Edge spec\(strip-ansi@7\.1\.0\)/,
      'ideal graph reflects package.json spec, not existing node_modules',
    )
  },
)

t.test(
  'update -w re-resolves only the selected workspaces',
  async t => {
    // exact specs (locked nodes) get that version, ranges get `latest`
    let latest = '1.0.0'
    const packageInfo = {
      async manifest({ final: f }: Spec) {
        return {
          name: f.name,
          version:
            /^\d+\.\d+\.\d+$/.test(f.bareSpec) ? f.bareSpec : latest,
        }
      },
      prefetchResolve: () => () => {},
    } as unknown as PackageInfoClient
    const pkg = (
      name: string,
      dependencies: Record<string, string>,
    ) => ({
      'package.json': JSON.stringify({
        name,
        version: '1.0.0',
        dependencies,
      }),
    })
    const dir = t.testdir({
      ...pkg('root', { a: '^1.0.0' }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        x: pkg('x', { b: '^1.0.0', d: '^1.0.0' }),
        y: pkg('y', { c: '^1.0.0', d: '^1.0.0' }),
      },
    })
    t.chdir(dir)
    unload('project')
    t.teardown(() => unload('project'))
    const packageJson = new PackageJson()
    // fresh scurry: fs changes between calls
    const opts = (load: { paths?: string[] } = {}) => {
      const scurry = new PathScurry(dir)
      return {
        projectRoot: dir,
        scurry,
        packageJson,
        packageInfo,
        registries: { npm: 'https://registry.npmjs.org/' },
        allowScripts: ':not(*)',
        monorepo: Monorepo.maybeLoad(dir, {
          scurry,
          packageJson,
          load,
        }),
      } as unknown as UpdateOptions
    }
    const { install } = await import('../src/install.ts')
    await install({ ...opts(), lockfileOnly: true })
    const lockfile = resolve(dir, 'vlt-lock.json')
    const lock = JSON.parse(readFileSync(lockfile, 'utf8')) as {
      nodes: Record<string, unknown>
    }

    latest = '1.1.0'
    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
    })
    const versions = async (options: UpdateOptions) => {
      const { graph } = await update(options)
      const res: Record<string, string | undefined> = {}
      for (const importer of graph.importers) {
        for (const edge of importer.edgesOut.values()) {
          res[`${importer.name} ${edge.name}`] = edge.to?.version
        }
      }
      return res
    }

    const scoped = {
      'root a': '1.0.0',
      'x b': '1.1.0',
      'x d': '1.0.0',
      'y c': '1.0.0',
      'y d': '1.0.0',
    }
    t.strictSame(
      await versions(opts({ paths: ['packages/x'] })),
      scoped,
      'only x re-resolved; shared d kept locked',
    )
    const all = {
      'root a': '1.1.0',
      'x b': '1.1.0',
      'x d': '1.1.0',
      'y c': '1.1.0',
      'y d': '1.1.0',
    }
    t.strictSame(
      await versions(opts()),
      all,
      'unfiltered updates all',
    )
    writeFileSync(
      lockfile,
      JSON.stringify({
        ...lock,
        nodes: { ...lock.nodes, 'file~../../forbidden': [0, 'f'] },
      }),
    )
    await t.rejects(
      update(opts({ paths: ['packages/x'] })),
      { cause: { code: 'EINVALIDNAME' } },
      'unsafe lockfile fails loud',
    )
    rmSync(lockfile)
    t.strictSame(
      await versions(opts({ paths: ['packages/x'] })),
      all,
      'no lockfile, nothing installed: updates all',
    )

    // installed: root a, y c + d (store ids from the lockfile)
    const link = (from: string, name: string) => {
      const id = Object.keys(lock.nodes).find(i =>
        i.endsWith(`~${name}@1.0.0`),
      )!
      const pkgDir = resolve(
        dir,
        'node_modules/.vlt',
        id,
        'node_modules',
        name,
      )
      mkdirSync(pkgDir, { recursive: true })
      writeFileSync(
        resolve(pkgDir, 'package.json'),
        JSON.stringify({ name, version: '1.0.0' }),
      )
      mkdirSync(resolve(dir, from, 'node_modules'), {
        recursive: true,
      })
      symlinkSync(
        pkgDir,
        resolve(dir, from, 'node_modules', name),
        'junction',
      )
    }
    link('.', 'a')
    link('packages/y', 'c')
    link('packages/y', 'd')
    t.strictSame(
      await versions(opts({ paths: ['packages/x'] })),
      scoped,
      'no lockfile: unselected keep installed versions',
    )
  },
)
