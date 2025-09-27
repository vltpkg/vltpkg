import t from 'tap'
import { PackageJson } from '@vltpkg/package-json'
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
        lockfileVersion: 0,
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
