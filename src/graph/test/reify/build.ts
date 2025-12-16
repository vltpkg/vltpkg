import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import type { RunOptions } from '@vltpkg/run'
import { Monorepo } from '@vltpkg/workspaces'
import * as FSP from 'node:fs/promises'
import * as FS from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Diff } from '../../src/diff.ts'
import { actual } from '../../src/index.ts'

const runs: RunOptions[] = []
t.beforeEach(() => (runs.length = 0))

const mockRun = async (options: RunOptions) => {
  runs.push(options)
}

const chmods: string[] = []
const mockFSP = t.createMock(FSP, {
  chmod: async (path: string, mode: number) => {
    t.equal(mode & 0o111, 0o111)
    chmods.push(path)
  },
})

const { build } = await t.mockImport<
  typeof import('../../src/reify/build.ts')
>('../../src/reify/build.ts', {
  '@vltpkg/run': { run: mockRun },
  'node:fs/promises': mockFSP,
})

// clear out before each test
t.beforeEach(() => {
  chmods.length = 0
  runs.length = 0
})

t.test(
  'run build steps in an installed project graph',
  { keepFixture: true },
  async t => {
    t.options.keepFixture = true
    const aid = joinDepIDTuple(['registry', '', 'a@1.2.3'])
    const xid = joinDepIDTuple(['registry', '', 'x@1.2.3'])
    const yid = joinDepIDTuple(['registry', '', 'y@1.2.3'])

    const projectRoot = t.testdir({
      src: {
        app: {
          'package.json': JSON.stringify({
            name: 'app',
            version: '1.2.3',
            dependencies: { y: '' },
            scripts: {
              postprepare: 'true',
            },
          }),
          node_modules: {
            y: t.fixture(
              'symlink',
              '../../../node_modules/.vlt/' + yid + '/node_modules/y',
            ),
          },
        },
      },
      'package.json': JSON.stringify({
        name: 'project',
        version: '1.2.3',
        dependencies: {
          x: '',
          a: '',
        },
      }),
      'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
      node_modules: {
        '.bin': {
          x: t.fixture(
            'symlink',
            '../.vlt/' + xid + '/node_modules/x/bin.js',
          ),
        },
        a: t.fixture('symlink', './.vlt/' + aid + '/node_modules/a'),
        x: t.fixture('symlink', './.vlt/' + xid + '/node_modules/x'),
        '.vlt': {
          [aid]: {
            node_modules: {
              a: {
                'package.json': JSON.stringify({
                  name: 'a',
                  version: '1.2.3',
                  scripts: {
                    install: 'do not run this',
                  },
                }),
              },
            },
          },
          [xid]: {
            node_modules: {
              x: {
                'package.json': JSON.stringify({
                  name: 'x',
                  version: '1.2.3',
                  bin: './bin.js',
                }),
                'bin.js': `#!/usr/bin/env node\nconsole.log('hello')`,
              },
            },
          },
          [yid]: {
            node_modules: {
              x: t.fixture(
                'symlink',
                '../../' + xid + '/node_modules/x',
              ),
              y: {
                'index.js': `console.error('y')`,
                'package.json': JSON.stringify({
                  name: 'y',
                  version: '1.2.3',
                  scripts: {
                    install: 'true',
                    preinstall: 'true',
                  },
                  dependencies: { x: '1' },
                }),
              },
            },
          },
        },
      },
    })

    // pretend like we didn't have the deps, and then added them
    const after = actual.load({
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      projectRoot,
      loadManifests: true,
    })
    const before = actual.load({
      projectRoot,
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      loadManifests: true,
    })
    const bx = before.nodes.get(xid)
    const by = before.nodes.get(yid)
    if (!bx) throw new Error('no x node in before??')
    if (!by) throw new Error('no y node in before??')
    before.removeNode(bx)
    before.removeNode(by)
    const diff = new Diff(before, after)

    const result = await build(
      diff,
      new PackageJson(),
      new PathScurry(projectRoot),
      new Set([xid, yid]),
    )

    // Check that we got the expected build result
    t.ok(result.success, 'should have success array')
    t.ok(result.failure, 'should have failure array')
    // only reports on non-importer nodes built
    t.equal(
      result.success.length,
      2,
      'should have 2 successfully built nodes',
    )
    t.equal(result.failure.length, 0, 'should have no failures')

    // Verify the built nodes include expected packages
    const successNames = result.success.map(n => n.name).sort()
    t.match(
      successNames,
      ['x', 'y'],
      'should include all expected packages',
    )

    // Check the runs - now including all the additional parameters
    t.equal(runs.length, 2, 'should have 2 runs')

    // Find the install run and prepare run
    const installRun = runs.find(r => r.arg0 === 'install')
    const prepareRun = runs.find(r => r.arg0 === 'prepare')

    t.ok(installRun, 'should have install run')
    t.ok(prepareRun, 'should have prepare run')

    if (installRun) {
      t.equal(
        installRun.cwd,
        resolve(
          projectRoot,
          `./node_modules/.vlt/${yid}/node_modules/y`,
        ),
        'install run should have correct cwd',
      )
      t.equal(
        installRun.ignoreMissing,
        true,
        'install run should ignore missing',
      )
      t.ok(
        installRun.signal instanceof AbortSignal,
        'install run should have signal',
      )
    }

    if (prepareRun) {
      t.equal(
        prepareRun.cwd,
        resolve(projectRoot, `./src/app`),
        'prepare run should have correct cwd',
      )
      t.equal(
        prepareRun.ignoreMissing,
        true,
        'prepare run should ignore missing',
      )
      t.ok(
        prepareRun.signal instanceof AbortSignal,
        'prepare run should have signal',
      )
    }
    t.match(
      new Set(chmods),
      new Set([
        resolve(
          projectRoot,
          `node_modules/.vlt/${xid}/node_modules/x/bin.js`,
        ),
      ]),
    )
  },
)

t.test('should handle missing bin files gracefully', async t => {
  const runs: RunOptions[] = []
  const chmods: string[] = []
  const existsChecks: string[] = []

  const mockRun = async (options: RunOptions) => {
    runs.push(options)
  }

  const mockFSP = t.createMock(FSP, {
    chmod: async (path: string, mode: number) => {
      t.equal(mode & 0o111, 0o111)
      chmods.push(path)
    },
  })

  const mockFS = t.createMock(FS, {
    existsSync: (path: string): boolean => {
      existsChecks.push(path)
      // Return false for paths that contain 'missing-bin' to simulate missing files
      return !path.includes('missing-bin')
    },
    statSync: (_path: string) => ({ mode: 0o644 }),
  })

  const { build } = await t.mockImport<
    typeof import('../../src/reify/build.ts')
  >('../../src/reify/build.ts', {
    '@vltpkg/run': { run: mockRun },
    'node:fs/promises': mockFSP,
    'node:fs': mockFS,
  })

  const sqldId = joinDepIDTuple([
    'registry',
    '',
    'sqld@0.24.1-pre.42',
  ])

  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        sqld: '0.24.1-pre.42',
      },
    }),
    node_modules: {
      sqld: t.fixture(
        'symlink',
        './.vlt/' + sqldId + '/node_modules/sqld',
      ),
      '.vlt': {
        [sqldId]: {
          node_modules: {
            sqld: {
              'package.json': JSON.stringify({
                name: 'sqld',
                version: '0.24.1-pre.42',
                bin: {
                  sqld: 'missing-bin/sqld', // This will trigger existsSync to return false
                },
              }),
              // Note: missing-bin/sqld file doesn't exist
            },
          },
        },
      },
    },
  })

  // Load the "after" state with the sqld package present
  const after = actual.load({
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    projectRoot,
    loadManifests: true,
  })

  // Load the "before" state with all packages
  const before = actual.load({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    loadManifests: true,
  })

  // Remove the sqld package from the "before" state to simulate adding it
  const bSqld = before.nodes.get(sqldId)
  if (!bSqld) throw new Error('no sqld node in before??')
  before.removeNode(bSqld)

  const diff = new Diff(before, after)

  // This should not throw an error even though the bin file doesn't exist
  // Pass sqld node in allowScripts to ensure the visit function is called
  await build(
    diff,
    new PackageJson(),
    new PathScurry(projectRoot),
    new Set([sqldId]),
  )

  // Verify the existsSync was called for the missing bin file
  t.ok(
    existsChecks.some(path => path.includes('missing-bin')),
    'existsSync should be called for bin files',
  )

  // Verify chmod was NOT called for the missing file
  t.notOk(
    chmods.some(path => path.includes('missing-bin')),
    'chmod should not be called for missing bin files',
  )
})

t.test(
  'should handle optional dependency build failures',
  async t => {
    const runs: RunOptions[] = []
    const chmods: string[] = []

    const mockRun = async (options: RunOptions) => {
      runs.push(options)
      // Throw an error for the optional-dep package install script
      if (options.cwd.endsWith('/optional-dep')) {
        throw new Error('Build failed for optional dependency')
      }
    }

    const mockFSP = t.createMock(FSP, {
      chmod: async (path: string, mode: number) => {
        t.equal(mode & 0o111, 0o111)
        chmods.push(path)
      },
    })

    const { build } = await t.mockImport<
      typeof import('../../src/reify/build.ts')
    >('../../src/reify/build.ts', {
      '@vltpkg/run': { run: mockRun },
      'node:fs/promises': mockFSP,
    })

    const regularId = joinDepIDTuple([
      'registry',
      '',
      'regular-dep@1.0.0',
    ])
    const optionalId = joinDepIDTuple([
      'registry',
      '',
      'optional-dep@1.0.0',
    ])

    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'regular-dep': '1.0.0',
        },
        optionalDependencies: {
          'optional-dep': '1.0.0',
        },
      }),
      node_modules: {
        'regular-dep': t.fixture(
          'symlink',
          './.vlt/' + regularId + '/node_modules/regular-dep',
        ),
        'optional-dep': t.fixture(
          'symlink',
          './.vlt/' + optionalId + '/node_modules/optional-dep',
        ),
        '.vlt': {
          [regularId]: {
            node_modules: {
              'regular-dep': {
                'package.json': JSON.stringify({
                  name: 'regular-dep',
                  version: '1.0.0',
                  scripts: {
                    install: 'echo "Installing regular-dep"',
                  },
                }),
              },
            },
          },
          [optionalId]: {
            node_modules: {
              'optional-dep': {
                'package.json': JSON.stringify({
                  name: 'optional-dep',
                  version: '1.0.0',
                  scripts: {
                    install: 'exit 1', // This will fail
                  },
                }),
              },
            },
          },
        },
      },
    })

    // Load the "after" state with both packages present
    const after = actual.load({
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      projectRoot,
      loadManifests: true,
    })

    // Load the "before" state with all packages
    const before = actual.load({
      projectRoot,
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      loadManifests: true,
    })

    // Remove both packages from the "before" state to simulate adding them
    const bRegular = before.nodes.get(regularId)
    const bOptional = before.nodes.get(optionalId)
    if (!bRegular) throw new Error('no regular-dep node in before??')
    if (!bOptional)
      throw new Error('no optional-dep node in before??')
    before.removeNode(bRegular)
    before.removeNode(bOptional)

    const diff = new Diff(before, after)

    // Run the build with scripts enabled for both nodes
    const result = await build(
      diff,
      new PackageJson(),
      new PathScurry(projectRoot),
      new Set([regularId, optionalId]),
    )

    // Verify we have the expected structure
    t.ok(result.success, 'should have success array')
    t.ok(result.failure, 'should have failure array')

    // using "exit 1" for testing failures is not going to work on windows
    if (process.platform !== 'win32') {
      // The regular dependency should succeed
      t.equal(
        result.success.length,
        1,
        'should have 1 successfully built node',
      )
      const successNames = result.success.map(n => n.name)
      t.match(
        successNames,
        ['regular-dep'],
        'regular-dep should succeed',
      )

      // The optional dependency should fail
      t.equal(result.failure.length, 1, 'should have 1 failed node')
      const failureNames = result.failure.map(n => n.name)
      t.match(
        failureNames,
        ['optional-dep'],
        'optional-dep should be in failures',
      )

      // Verify the failed node is optional
      const failedNode = result.failure[0]
      if (failedNode) {
        t.ok(
          failedNode.isOptional(),
          'failed node should be marked as optional',
        )
      }
    }

    // Verify both install scripts were attempted
    t.equal(runs.length, 2, 'should have attempted 2 install runs')
    const regularRun = runs.find(r => r.cwd.includes('regular-dep'))
    const optionalRun = runs.find(r => r.cwd.includes('optional-dep'))
    t.ok(regularRun, 'should have attempted regular-dep install')
    t.ok(optionalRun, 'should have attempted optional-dep install')
  },
)

t.test(
  'should detect binding.gyp and run implicit install script',
  async t => {
    const runs: RunOptions[] = []
    const chmods: string[] = []

    const mockRun = async (options: RunOptions) => {
      runs.push(options)
    }

    const mockFSP = t.createMock(FSP, {
      chmod: async (path: string, mode: number) => {
        t.equal(mode & 0o111, 0o111)
        chmods.push(path)
      },
    })

    const { build } = await t.mockImport<
      typeof import('../../src/reify/build.ts')
    >('../../src/reify/build.ts', {
      '@vltpkg/run': { run: mockRun },
      'node:fs/promises': mockFSP,
    })

    const nativeAddonId = joinDepIDTuple([
      'registry',
      '',
      'native-addon@1.0.0',
    ])

    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'native-addon': '1.0.0',
        },
      }),
      node_modules: {
        'native-addon': t.fixture(
          'symlink',
          './.vlt/' + nativeAddonId + '/node_modules/native-addon',
        ),
        '.vlt': {
          [nativeAddonId]: {
            node_modules: {
              'native-addon': {
                // Package.json has NO install script
                'package.json': JSON.stringify({
                  name: 'native-addon',
                  version: '1.0.0',
                }),
                // But has binding.gyp - npm's implicit install trigger
                'binding.gyp': JSON.stringify({
                  targets: [{ target_name: 'addon' }],
                }),
              },
            },
          },
        },
      },
    })

    // Load the "after" state with the package present
    const after = actual.load({
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      projectRoot,
      loadManifests: true,
    })

    // Load the "before" state
    const before = actual.load({
      projectRoot,
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      loadManifests: true,
    })

    // Remove the package from the "before" state to simulate adding it
    const bNative = before.nodes.get(nativeAddonId)
    if (!bNative)
      throw new Error('no native-addon node in before??')
    before.removeNode(bNative)

    const diff = new Diff(before, after)

    // Run the build with scripts enabled
    const result = await build(
      diff,
      new PackageJson(),
      new PathScurry(projectRoot),
      new Set([nativeAddonId]),
    )

    // Verify the build was called for the native addon
    t.ok(result.success, 'should have success array')
    t.equal(
      result.success.length,
      1,
      'should have 1 successfully built node',
    )
    t.equal(
      result.success[0]?.name,
      'native-addon',
      'native-addon should be built',
    )

    // Verify install script was attempted even though none was defined
    // (because binding.gyp exists)
    t.equal(runs.length, 1, 'should have 1 install run')
    const installRun = runs[0]
    t.ok(installRun, 'should have install run')
    if (installRun) {
      t.equal(
        installRun.arg0,
        'install',
        'should run install script',
      )
      t.ok(
        installRun.cwd.includes('native-addon'),
        'should run in native-addon directory',
      )
    }
  },
)

t.test(
  'should NOT run implicit install when install script exists',
  async t => {
    const runs: RunOptions[] = []
    const chmods: string[] = []

    const mockRun = async (options: RunOptions) => {
      runs.push(options)
    }

    const mockFSP = t.createMock(FSP, {
      chmod: async (path: string, mode: number) => {
        t.equal(mode & 0o111, 0o111)
        chmods.push(path)
      },
    })

    const { build } = await t.mockImport<
      typeof import('../../src/reify/build.ts')
    >('../../src/reify/build.ts', {
      '@vltpkg/run': { run: mockRun },
      'node:fs/promises': mockFSP,
    })

    const nativeAddonId = joinDepIDTuple([
      'registry',
      '',
      'native-addon-custom@1.0.0',
    ])

    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'native-addon-custom': '1.0.0',
        },
      }),
      node_modules: {
        'native-addon-custom': t.fixture(
          'symlink',
          './.vlt/' +
            nativeAddonId +
            '/node_modules/native-addon-custom',
        ),
        '.vlt': {
          [nativeAddonId]: {
            node_modules: {
              'native-addon-custom': {
                // Package.json HAS custom install script
                'package.json': JSON.stringify({
                  name: 'native-addon-custom',
                  version: '1.0.0',
                  scripts: {
                    install: 'echo custom-install',
                  },
                }),
                // Also has binding.gyp
                'binding.gyp': JSON.stringify({
                  targets: [{ target_name: 'addon' }],
                }),
              },
            },
          },
        },
      },
    })

    // Load the "after" state with the package present
    const after = actual.load({
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      projectRoot,
      loadManifests: true,
    })

    // Load the "before" state
    const before = actual.load({
      projectRoot,
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      loadManifests: true,
    })

    // Remove the package from the "before" state to simulate adding it
    const bNative = before.nodes.get(nativeAddonId)
    if (!bNative)
      throw new Error('no native-addon-custom node in before??')
    before.removeNode(bNative)

    const diff = new Diff(before, after)

    // Run the build with scripts enabled
    const result = await build(
      diff,
      new PackageJson(),
      new PathScurry(projectRoot),
      new Set([nativeAddonId]),
    )

    // Verify the build was called
    t.ok(result.success, 'should have success array')
    t.equal(
      result.success.length,
      1,
      'should have 1 successfully built node',
    )

    // Verify install script was run (once, for the custom script)
    t.equal(runs.length, 1, 'should have 1 install run')
    const installRun = runs[0]
    t.ok(installRun, 'should have install run')
    if (installRun) {
      t.equal(
        installRun.arg0,
        'install',
        'should run install script',
      )
    }
  },
)
