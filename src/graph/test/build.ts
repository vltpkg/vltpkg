import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { build } from '../src/build.ts'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'

const scurry = new PathScurry(t.testdirName)
const packageJson = new PackageJson()

t.test('build function', async t => {
  t.test('builds when no nodes need building', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {},
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
          },
          edges: {},
        }),
      },
    })

    // Call build function
    const result = await build({
      projectRoot: dir,
      packageJson,
      scurry,
      target: ':scripts',
    })

    // The function should complete without errors
    t.ok(result, 'should return build result')
    t.ok('success' in result, 'should have success array')
    t.ok('failure' in result, 'should have failure array')
    t.equal(
      result.success.length,
      0,
      'should have no successful builds when no nodes need building',
    )
    t.equal(
      result.failure.length,
      0,
      'should have no failed builds when no nodes need building',
    )
    t.pass('build completed successfully with no nodes to build')
  })

  t.test('handles missing node_modules directory', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          lodash: '4',
        },
      }),
      'vlt.json': JSON.stringify({}),
    })

    // Call build function - should handle missing node_modules
    const result = await build({
      projectRoot: dir,
      packageJson,
      scurry,
      target: ':scripts',
    })

    // The function should complete without errors even without node_modules
    t.ok(result, 'should return build result')
    t.equal(
      result.success.length,
      0,
      'should have no successful builds (no node_modules)',
    )
    t.equal(
      result.failure.length,
      0,
      'should have no failed builds (no node_modules)',
    )
    t.pass('build handled missing node_modules directory gracefully')
  })

  t.test(
    'handles corrupted lockfile build data gracefully',
    async t => {
      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {},
        }),
        'vlt-lock.json': 'invalid json content',
        node_modules: {
          '.vlt-lock.json': JSON.stringify({
            lockfileVersion: 0,
            options: {
              registry: 'https://registry.npmjs.org/',
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            },
            edges: {},
          }),
        },
      })

      // Call build function - should handle corrupted lockfile gracefully
      const result = await build({
        projectRoot: dir,
        packageJson,
        scurry,
        target: ':scripts',
      })

      // The function should complete without errors even with corrupted lockfile
      t.ok(result, 'should return build result')
      t.ok(result.success, 'should have success array')
      t.ok(result.failure, 'should have failure array')
      t.pass('build handled corrupted lockfile gracefully')
    },
  )

  t.test('build function with no lockfile data', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'test-pkg': '1.0.0',
        },
      }),
      node_modules: {
        'test-pkg': {
          'package.json': JSON.stringify({
            name: 'test-pkg',
            version: '1.0.0',
          }),
        },
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [joinDepIDTuple(['registry', '', 'test-pkg@1.0.0'])]: [
              0,
              'test-pkg',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'test-pkg',
                version: '1.0.0',
              },
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} test-pkg`]: `prod 1.0.0 ${joinDepIDTuple(['registry', '', 'test-pkg@1.0.0'])}`,
          },
        }),
      },
    })

    // Call build function - should handle missing lockfile gracefully
    const result = await build({
      projectRoot: dir,
      packageJson,
      scurry,
      target: ':scripts',
    })

    // Verify result
    t.ok(result.success, 'should have success array')
    t.ok(result.failure, 'should have failure array')

    // Since there's no vlt-lock.json file at the project root,
    // build results won't be persisted to a lockfile
    const lockfilePath = resolve(dir, 'vlt-lock.json')
    t.notOk(
      existsSync(lockfilePath),
      'no lockfile should be created when none existed initially',
    )

    t.pass('build handled missing lockfile data gracefully')
  })

  t.end()
})

t.test('build with target option', async t => {
  t.test('builds only nodes matching target query', async t => {
    const testPkgId1 = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'target-pkg-1',
      '1.0.0',
    ])
    const testPkgId2 = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'other-pkg',
      '1.0.0',
    ])

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'target-pkg-1': '1.0.0',
          'other-pkg': '1.0.0',
        },
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        'target-pkg-1': {
          'package.json': JSON.stringify({
            name: 'target-pkg-1',
            version: '1.0.0',
          }),
        },
        'other-pkg': {
          'package.json': JSON.stringify({
            name: 'other-pkg',
            version: '1.0.0',
          }),
        },
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId1]: [
              0,
              'target-pkg-1',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'target-pkg-1',
                version: '1.0.0',
              },
              null,
              null,
              null,
              1, // buildState: needed
            ],
            [testPkgId2]: [
              0,
              'other-pkg',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'other-pkg',
                version: '1.0.0',
              },
              null,
              null,
              null,
              1, // buildState: needed
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} target-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
            [`${joinDepIDTuple(['file', '.'])} other-pkg`]: `prod 1.0.0 ${testPkgId2}`,
          },
        }),
      },
    })

    // Call build with target query - only build packages with name starting with "target-"
    const result = await build({
      projectRoot: dir,
      packageJson,
      scurry,
      target: '[name^="target-"]',
    })

    // Verify result
    t.ok(result, 'should return build result')
    t.equal(
      result.success.length,
      1,
      'should have one successful build (target-pkg-1 matches query)',
    )
    t.equal(result.failure.length, 0, 'should have no failed builds')
    t.pass('build with target option completed')
  })

  t.end()
})

t.test('build with optional dependencies that fail', async t => {
  t.test(
    'handles optional dependency build failures gracefully',
    async t => {
      const optionalPkgId = joinDepIDTuple([
        'registry',
        '',
        'optional-fail-pkg@1.0.0',
      ])

      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          optionalDependencies: {
            'optional-fail-pkg': '1.0.0',
          },
        }),
        'vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [optionalPkgId]: [
              0,
              'optional-fail-pkg',
              'sha512-testintegrity==',
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} optional-fail-pkg`]: `optional 1.0.0 ${optionalPkgId}`,
          },
        }),
        node_modules: {
          'optional-fail-pkg': {
            'package.json': JSON.stringify({
              name: 'optional-fail-pkg',
              version: '1.0.0',
              scripts: {
                install: 'exit 1',
              },
            }),
          },
          '.vlt-lock.json': JSON.stringify({
            lockfileVersion: 0,
            options: {
              registry: 'https://registry.npmjs.org/',
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
              [optionalPkgId]: [
                1, // flags: optional (LockfileNodeFlagOptional = 1)
                'optional-fail-pkg',
                'sha512-testintegrity==',
                null,
                null,
                {
                  name: 'optional-fail-pkg',
                  version: '1.0.0',
                  scripts: {
                    install: 'exit 1',
                  },
                },
                null,
                null,
                null,
                1, // buildState: needed
              ],
            },
            edges: {
              [`${joinDepIDTuple(['file', '.'])} optional-fail-pkg`]: `optional 1.0.0 ${optionalPkgId}`,
            },
          }),
        },
      })

      // Call build function - optional dependency should fail but not break the build
      const result = await build({
        projectRoot: dir,
        packageJson,
        scurry,
        target: ':scripts',
      })

      // Verify result structure
      t.ok(result, 'should return build result')
      t.ok('success' in result, 'should have success array')
      t.ok('failure' in result, 'should have failure array')
      t.ok(
        Array.isArray(result.success),
        'success should be an array',
      )
      t.ok(
        Array.isArray(result.failure),
        'failure should be an array',
      )

      // The optional dependency with failing script should be in failure array
      t.equal(
        result.failure.length,
        1,
        'should have one failed optional dependency',
      )
      t.equal(
        result.failure[0]?.name,
        'optional-fail-pkg',
        'failed node should be optional-fail-pkg',
      )

      t.pass('build handled optional dependency failure correctly')
    },
  )

  t.end()
})
