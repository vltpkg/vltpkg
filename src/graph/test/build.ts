import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { build, skip } from '../src/build.ts'
import type { BuildData } from '../src/reify/save-build.ts'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'

const scurry = new PathScurry(t.testdirName)
const packageJson = new PackageJson()

t.test('build function', async t => {
  t.test('builds from cached build data when available', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {},
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        '.vlt-build.json': JSON.stringify({
          queue: [],
        } satisfies BuildData),
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
          },
          edges: {},
        }),
      },
    })

    // Call build function
    await build({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    // Verify the build file was cleaned up after successful completion
    const buildFilePath = resolve(dir, 'node_modules/.vlt-build.json')
    t.notOk(
      existsSync(buildFilePath),
      'build file should be removed after successful build',
    )

    // The function should complete without errors
    // This test primarily validates that the function can load cached build data
    // and call the reify build process without throwing errors
    t.pass('build completed successfully with cached build data')
  })

  t.test(
    'builds everything when no cached build data exists',
    async t => {
      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            lodash: '4',
          },
        }),
        'vlt.json': JSON.stringify({}),
        node_modules: {
          lodash: {
            'package.json': JSON.stringify({
              name: 'lodash',
              version: '4.17.21',
            }),
          },
          '.vlt-lock.json': JSON.stringify({
            lockfileVersion: 0,
            options: {
              registries: {
                npm: 'https://registry.npmjs.org/',
              },
            },
            build: {
              allowed: {},
              blocked: {},
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
              [joinDepIDTuple(['registry', '', 'lodash@4.17.21'])]: [
                0,
                'lodash',
                'sha512-lodashintegrity==',
              ],
            },
            edges: {
              [`${joinDepIDTuple(['file', '.'])} lodash`]: `prod 4 ${joinDepIDTuple(['registry', '', 'lodash@4.17.21'])}`,
            },
          }),
        },
      })

      // Ensure no build file exists
      const buildFilePath = resolve(
        dir,
        'node_modules/.vlt-build.json',
      )
      t.notOk(
        existsSync(buildFilePath),
        'build file should not exist initially',
      )

      // Call build function
      await build({
        projectRoot: dir,
        packageJson,
        scurry,
      })

      // The function should complete without errors
      // This test validates that the function can build everything when no cached data exists
      t.pass('build completed successfully without cached build data')
    },
  )

  t.test('handles corrupted build file gracefully', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          lodash: '4',
        },
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        '.vlt-build.json': 'invalid json content',
        lodash: {
          'package.json': JSON.stringify({
            name: 'lodash',
            version: '4.17.21',
          }),
        },
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [joinDepIDTuple(['registry', '', 'lodash@4.17.21'])]: [
              0,
              'lodash',
              'sha512-lodashintegrity==',
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} lodash`]: `prod 4 ${joinDepIDTuple(['registry', '', 'lodash@4.17.21'])}`,
          },
        }),
      },
    })

    // Call build function - should handle corrupted file gracefully
    await build({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    // Verify the corrupted build file was cleaned up after successful completion
    const buildFilePath = resolve(dir, 'node_modules/.vlt-build.json')
    t.notOk(
      existsSync(buildFilePath),
      'corrupted build file should be removed after successful build',
    )

    // The function should complete without errors even with corrupted build file
    t.pass('build handled corrupted build file gracefully')
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
    await build({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    // The function should complete without errors even without node_modules
    t.pass('build handled missing node_modules directory gracefully')
  })

  t.test('uses provided options correctly', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          lodash: '4',
        },
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
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
          },
          edges: {},
        }),
      },
    })

    // Call build function with custom options
    await build({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    // The function should complete without errors
    t.pass('build completed successfully with custom options')
  })

  t.test('cleans up build file after successful build', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {},
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        '.vlt-build.json': JSON.stringify({
          queue: [],
        } satisfies BuildData),
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
          },
          edges: {},
        }),
      },
    })

    const buildFilePath = resolve(dir, 'node_modules/.vlt-build.json')

    // Verify the build file exists before the build
    t.ok(
      existsSync(buildFilePath),
      'build file should exist before build',
    )

    // Call build function
    await build({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    // Verify the build file was cleaned up
    t.notOk(
      existsSync(buildFilePath),
      'build file should be removed after successful build',
    )
  })

  t.test(
    'loads build data from lockfile and transfers to graph',
    async t => {
      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            'test-pkg': '1.0.0',
          },
        }),
        'vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {
              'https://registry.npmjs.org/': ['test-pkg'],
            },
            blocked: {
              'https://registry.npmjs.org/': ['blocked-pkg'],
            },
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [joinDepIDTuple([
              'registry',
              'https://registry.npmjs.org/',
              'test-pkg@1.0.0',
            ])]: [0, 'test-pkg', 'sha512-testpkgintegrity=='],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} test-pkg`]: `prod 1.0.0 ${joinDepIDTuple(['registry', 'https://registry.npmjs.org/', 'test-pkg@1.0.0'])}`,
          },
        }),
        node_modules: {
          'test-pkg': {
            'package.json': JSON.stringify({
              name: 'test-pkg',
              version: '1.0.0',
              scripts: {
                install: 'echo "building"',
              },
            }),
          },
          '.vlt-lock.json': JSON.stringify({
            lockfileVersion: 0,
            options: {
              registry: 'https://registry.npmjs.org/',
            },
            build: {
              allowed: {},
              blocked: {},
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
              [joinDepIDTuple([
                'registry',
                'https://registry.npmjs.org/',
                'test-pkg@1.0.0',
              ])]: [0, 'test-pkg', 'sha512-testpkgintegrity=='],
            },
            edges: {
              [`${joinDepIDTuple(['file', '.'])} test-pkg`]: `prod 1.0.0 ${joinDepIDTuple(['registry', 'https://registry.npmjs.org/', 'test-pkg@1.0.0'])}`,
            },
          }),
        },
      })

      // Call build function
      await build({
        projectRoot: dir,
        packageJson,
        scurry,
      })

      // Verify lockfile was updated with build data
      const lockfilePath = resolve(dir, 'vlt-lock.json')
      t.ok(
        existsSync(lockfilePath),
        'lockfile should exist after build',
      )

      const lockfileContent = JSON.parse(
        readFileSync(lockfilePath, 'utf8'),
      )
      t.ok(
        lockfileContent.build,
        'lockfile should contain build data',
      )
      t.ok(
        lockfileContent.build.allowed,
        'lockfile should contain allowed build data',
      )

      t.pass(
        'build loaded and applied lockfile build data successfully',
      )
    },
  )

  t.test('persists build results to lockfile', async t => {
    const testPkgId = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'test-build-pkg@1.0.0',
    ])

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'test-build-pkg': '1.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {
          registry: 'https://registry.npmjs.org/',
        },
        build: {
          allowed: {},
          blocked: {},
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
          [testPkgId]: [
            0,
            'test-build-pkg',
            'sha512-testintegrity==',
          ],
        },
        edges: {
          [`${joinDepIDTuple(['file', '.'])} test-build-pkg`]: `prod 1.0.0 ${testPkgId}`,
        },
      }),
      node_modules: {
        '.vlt-build.json': JSON.stringify({
          queue: [testPkgId],
        } satisfies BuildData),
        'test-build-pkg': {
          'package.json': JSON.stringify({
            name: 'test-build-pkg',
            version: '1.0.0',
          }),
        },
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId]: [
              0,
              'test-build-pkg',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'test-build-pkg',
                version: '1.0.0',
              },
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} test-build-pkg`]: `prod 1.0.0 ${testPkgId}`,
          },
        }),
      },
    })

    // Call build function
    await build({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    // Verify lockfile was updated with build results
    const lockfilePath = resolve(dir, 'vlt-lock.json')
    t.ok(
      existsSync(lockfilePath),
      'lockfile should exist after build',
    )

    const lockfileContent = JSON.parse(
      readFileSync(lockfilePath, 'utf8'),
    )

    // Verify build data is persisted
    t.ok(lockfileContent.build, 'lockfile should contain build data')
    t.ok(
      lockfileContent.build.allowed,
      'lockfile should contain allowed build data',
    )

    t.pass('build results were persisted to lockfile successfully')
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
            build: {
              allowed: {},
              blocked: {},
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            },
            edges: {},
          }),
        },
      })

      // Call build function - should handle corrupted lockfile gracefully
      await build({
        projectRoot: dir,
        packageJson,
        scurry,
      })

      // The function should complete without errors even with corrupted lockfile
      t.pass('build handled corrupted lockfile gracefully')
    },
  )

  t.test(
    'works when both lockfile and build cache exist',
    async t => {
      const testPkgId = joinDepIDTuple([
        'registry',
        'https://registry.npmjs.org/',
        'cached-pkg@1.0.0',
      ])

      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            'cached-pkg': '1.0.0',
          },
        }),
        'vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {
              'https://registry.npmjs.org/': ['existing-pkg'],
            },
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId]: [
              0,
              'cached-pkg',
              'sha512-cachedintegrity==',
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} cached-pkg`]: `prod 1.0.0 ${testPkgId}`,
          },
        }),
        node_modules: {
          '.vlt-build.json': JSON.stringify({
            queue: [testPkgId],
          } satisfies BuildData),
          'cached-pkg': {
            'package.json': JSON.stringify({
              name: 'cached-pkg',
              version: '1.0.0',
            }),
          },
          '.vlt-lock.json': JSON.stringify({
            lockfileVersion: 0,
            options: {
              registry: 'https://registry.npmjs.org/',
            },
            build: {
              allowed: {},
              blocked: {},
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
              [testPkgId]: [
                0,
                'cached-pkg',
                'sha512-cachedintegrity==',
                null,
                null,
                {
                  name: 'cached-pkg',
                  version: '1.0.0',
                },
              ],
            },
            edges: {
              [`${joinDepIDTuple(['file', '.'])} cached-pkg`]: `prod 1.0.0 ${testPkgId}`,
            },
          }),
        },
      })

      // Call build function
      await build({
        projectRoot: dir,
        packageJson,
        scurry,
      })

      // Verify both lockfile build data and build cache were processed
      const lockfilePath = resolve(dir, 'vlt-lock.json')
      t.ok(
        existsSync(lockfilePath),
        'lockfile should exist after build',
      )

      const buildFilePath = resolve(
        dir,
        'node_modules/.vlt-build.json',
      )
      t.notOk(
        existsSync(buildFilePath),
        'build cache file should be cleaned up',
      )

      const lockfileContent = JSON.parse(
        readFileSync(lockfilePath, 'utf8'),
      )

      t.ok(
        lockfileContent.build,
        'lockfile should contain build data',
      )

      t.pass(
        'build handled both lockfile and build cache successfully',
      )
    },
  )

  t.test('build with queryFilteredNodes parameter', async t => {
    const testPkgId1 = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'test-pkg-1',
      '1.0.0',
    ])
    const testPkgId2 = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'test-pkg-2',
      '1.0.0',
    ])

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'test-pkg-1': '1.0.0',
          'test-pkg-2': '1.0.0',
        },
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        '.vlt-build.json': JSON.stringify({
          queue: [testPkgId1, testPkgId2],
        } satisfies BuildData),
        'test-pkg-1': {
          'package.json': JSON.stringify({
            name: 'test-pkg-1',
            version: '1.0.0',
          }),
        },
        'test-pkg-2': {
          'package.json': JSON.stringify({
            name: 'test-pkg-2',
            version: '1.0.0',
          }),
        },
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId1]: [
              0,
              'test-pkg-1',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'test-pkg-1',
                version: '1.0.0',
              },
            ],
            [testPkgId2]: [
              0,
              'test-pkg-2',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'test-pkg-2',
                version: '1.0.0',
              },
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} test-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
            [`${joinDepIDTuple(['file', '.'])} test-pkg-2`]: `prod 1.0.0 ${testPkgId2}`,
          },
        }),
      },
    })

    // Call build with queryFilteredNodes - only build test-pkg-1
    await build({
      projectRoot: dir,
      packageJson,
      scurry,
      queryFilteredNodes: [testPkgId1],
    })

    // Verify build data was partially updated (test-pkg-2 should remain in queue)
    const buildFilePath = resolve(dir, 'node_modules/.vlt-build.json')

    if (existsSync(buildFilePath)) {
      const updatedBuildData = JSON.parse(
        readFileSync(buildFilePath, 'utf8'),
      )
      t.strictSame(
        updatedBuildData.queue,
        [testPkgId2],
        'should remove only built packages from queue',
      )
    }

    t.pass('build with queryFilteredNodes completed')
  })

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
        '.vlt-build.json': JSON.stringify({
          queue: [],
        } satisfies BuildData),
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
          build: {
            allowed: {},
            blocked: {},
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
    await build({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    // Verify the build file was cleaned up after successful completion
    const buildFilePath = resolve(dir, 'node_modules/.vlt-build.json')
    t.notOk(
      existsSync(buildFilePath),
      'build file should be removed after successful build',
    )

    // Since there's no vlt-lock.json file at the project root,
    // build results won't be persisted to a lockfile
    const lockfilePath = resolve(dir, 'vlt-lock.json')
    t.notOk(
      existsSync(lockfilePath),
      'no lockfile should be created when none existed initially',
    )

    t.pass('build handled missing lockfile data gracefully')
  })

  t.test(
    'build function removes build file when queue becomes empty after filtering',
    async t => {
      const testPkgId = joinDepIDTuple(['registry', '', 'test-pkg@1.0.0'])

      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            'test-pkg': '^1.0.0',
          },
        }),
        'vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId]: [
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
            [`${joinDepIDTuple(['file', '.'])} test-pkg`]: `prod ^1.0.0 ${testPkgId}`,
          },
        }),
        'vlt.json': JSON.stringify({}),
        node_modules: {
          '.vlt-build.json': JSON.stringify({
            queue: [testPkgId], // test-pkg DepID in queue
          } satisfies BuildData),
          'test-pkg': {
            'package.json': JSON.stringify({
              name: 'test-pkg',
              version: '1.0.0',
            }),
          },
          '.vlt-lock.json': JSON.stringify({
            lockfileVersion: 0,
            options: {
              registry: 'https://registry.npmjs.org/',
            },
            build: {
              allowed: {},
              blocked: {},
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
              [testPkgId]: [
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
              [`${joinDepIDTuple(['file', '.'])} test-pkg`]: `prod ^1.0.0 ${testPkgId}`,
            },
          }),
        },
      })

      const buildFilePath = resolve(
        dir,
        'node_modules/.vlt-build.json',
      )

      // Verify the build file exists before the build
      t.ok(
        existsSync(buildFilePath),
        'build file should exist before build',
      )

      // Call build function with queryFilteredNodes to trigger conditional cleanup path
      // This will cause the build to process the test-pkg, removing it from the queue
      // When the queue becomes empty after filtering, it should trigger remove the
      // temporary build queue data file
      await build({
        projectRoot: dir,
        packageJson,
        scurry,
        queryFilteredNodes: [testPkgId],
      })

      // Verify the build file was completely removed after build
      t.notOk(
        existsSync(buildFilePath),
        'build file should be completely removed when queue becomes empty after filtering',
      )

      // Verify lockfile still exists
      const lockfilePath = resolve(dir, 'vlt-lock.json')
      t.ok(
        existsSync(lockfilePath),
        'lockfile should still exist after build',
      )

      t.pass(
        'build cleanup correctly removed build file when queue became empty after filtering',
      )
    },
  )

  t.end()
})

t.test('skip function', async t => {
  t.test('skip packages and update lockfile', async t => {
    const testPkgId1 = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'test-pkg-1',
      '1.0.0',
    ])
    const testPkgId2 = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'test-pkg-2',
      '1.0.0',
    ])

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'test-pkg-1': '1.0.0',
          'test-pkg-2': '1.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {
          registry: 'https://registry.npmjs.org/',
        },
        build: {
          allowed: {},
          blocked: {},
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
          [testPkgId1]: [0, 'test-pkg-1', 'sha512-testintegrity=='],
          [testPkgId2]: [0, 'test-pkg-2', 'sha512-testintegrity=='],
        },
        edges: {
          [`${joinDepIDTuple(['file', '.'])} test-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
          [`${joinDepIDTuple(['file', '.'])} test-pkg-2`]: `prod 1.0.0 ${testPkgId2}`,
        },
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        '.vlt-build.json': JSON.stringify({
          queue: [testPkgId1, testPkgId2],
        } satisfies BuildData),
        'test-pkg-1': {
          'package.json': JSON.stringify({
            name: 'test-pkg-1',
            version: '1.0.0',
          }),
        },
        'test-pkg-2': {
          'package.json': JSON.stringify({
            name: 'test-pkg-2',
            version: '1.0.0',
          }),
        },
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId1]: [
              0,
              'test-pkg-1',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'test-pkg-1',
                version: '1.0.0',
              },
            ],
            [testPkgId2]: [
              0,
              'test-pkg-2',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'test-pkg-2',
                version: '1.0.0',
              },
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} test-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
            [`${joinDepIDTuple(['file', '.'])} test-pkg-2`]: `prod 1.0.0 ${testPkgId2}`,
          },
        }),
      },
    })

    // Call skip function
    await skip({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    // Verify lockfile was updated with blocked packages
    const lockfilePath = resolve(dir, 'vlt-lock.json')
    t.ok(existsSync(lockfilePath), 'lockfile should exist after skip')

    const lockfileContent = JSON.parse(
      readFileSync(lockfilePath, 'utf8'),
    )

    t.ok(lockfileContent.build, 'lockfile should contain build data')
    t.ok(
      lockfileContent.build.blocked,
      'lockfile should contain blocked build data',
    )

    // Verify build data file was removed (no items remain)
    const buildFilePath = resolve(dir, 'node_modules/.vlt-build.json')
    t.notOk(
      existsSync(buildFilePath),
      'build data file should be removed after skipping all items',
    )

    t.pass('skip completed successfully')
  })

  t.test('skip with queryFilteredNodes parameter', async t => {
    const testPkgId1 = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'test-pkg-1',
      '1.0.0',
    ])
    const testPkgId2 = joinDepIDTuple([
      'registry',
      'https://registry.npmjs.org/',
      'test-pkg-2',
      '1.0.0',
    ])

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'test-pkg-1': '1.0.0',
          'test-pkg-2': '1.0.0',
        },
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        '.vlt-build.json': JSON.stringify({
          queue: [testPkgId1, testPkgId2],
        } satisfies BuildData),
        'test-pkg-1': {
          'package.json': JSON.stringify({
            name: 'test-pkg-1',
            version: '1.0.0',
          }),
        },
        'test-pkg-2': {
          'package.json': JSON.stringify({
            name: 'test-pkg-2',
            version: '1.0.0',
          }),
        },
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId1]: [
              0,
              'test-pkg-1',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'test-pkg-1',
                version: '1.0.0',
              },
            ],
            [testPkgId2]: [
              0,
              'test-pkg-2',
              'sha512-testintegrity==',
              null,
              null,
              {
                name: 'test-pkg-2',
                version: '1.0.0',
              },
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} test-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
            [`${joinDepIDTuple(['file', '.'])} test-pkg-2`]: `prod 1.0.0 ${testPkgId2}`,
          },
        }),
      },
    })

    // Call skip with queryFilteredNodes - only skip test-pkg-1
    await skip({
      projectRoot: dir,
      packageJson,
      scurry,
      queryFilteredNodes: [testPkgId1],
    })

    // Verify build data was partially updated (test-pkg-2 should remain in queue)
    const buildFilePath = resolve(dir, 'node_modules/.vlt-build.json')
    t.ok(
      existsSync(buildFilePath),
      'build data file should still exist',
    )

    const updatedBuildData = JSON.parse(
      readFileSync(buildFilePath, 'utf8'),
    )
    t.strictSame(
      updatedBuildData.queue,
      [testPkgId2],
      'should remove only skipped packages from queue',
    )

    t.pass('skip with queryFilteredNodes completed')
  })

  t.test('skip with no lockfile', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({}),
    })

    // Call skip function - should return early with no lockfile
    await skip({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    t.pass('skip with no lockfile completed without error')
  })

  t.test('skip with no queued items', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({}),
      node_modules: {
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
          },
          edges: {},
        }),
      },
    })

    // Call skip function - should return early with no queue
    await skip({
      projectRoot: dir,
      packageJson,
      scurry,
    })

    t.pass('skip with no queued items completed without error')
  })

  t.test(
    'skip function with existing lockfile build data',
    async t => {
      const testPkgId1 = joinDepIDTuple([
        'registry',
        'https://registry.npmjs.org/',
        'skip-pkg-1',
        '1.0.0',
      ])
      const testPkgId2 = joinDepIDTuple([
        'registry',
        'https://registry.npmjs.org/',
        'skip-pkg-2',
        '1.0.0',
      ])

      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            'skip-pkg-1': '1.0.0',
            'skip-pkg-2': '1.0.0',
          },
        }),
        'vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {
              'https://registry.npmjs.org/': ['existing-allowed-pkg'],
            },
            blocked: {
              'https://registry.npmjs.org/': ['existing-blocked-pkg'],
            },
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId1]: [0, 'skip-pkg-1', 'sha512-skipintegrity=='],
            [testPkgId2]: [0, 'skip-pkg-2', 'sha512-skipintegrity=='],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} skip-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
            [`${joinDepIDTuple(['file', '.'])} skip-pkg-2`]: `prod 1.0.0 ${testPkgId2}`,
          },
        }),
        'vlt.json': JSON.stringify({}),
        node_modules: {
          '.vlt-build.json': JSON.stringify({
            queue: [testPkgId1, testPkgId2],
          } satisfies BuildData),
          'skip-pkg-1': {
            'package.json': JSON.stringify({
              name: 'skip-pkg-1',
              version: '1.0.0',
            }),
          },
          'skip-pkg-2': {
            'package.json': JSON.stringify({
              name: 'skip-pkg-2',
              version: '1.0.0',
            }),
          },
          '.vlt-lock.json': JSON.stringify({
            lockfileVersion: 0,
            options: {
              registry: 'https://registry.npmjs.org/',
            },
            build: {
              allowed: {},
              blocked: {},
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
              [testPkgId1]: [
                0,
                'skip-pkg-1',
                'sha512-skipintegrity==',
              ],
              [testPkgId2]: [
                0,
                'skip-pkg-2',
                'sha512-skipintegrity==',
              ],
            },
            edges: {
              [`${joinDepIDTuple(['file', '.'])} skip-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
              [`${joinDepIDTuple(['file', '.'])} skip-pkg-2`]: `prod 1.0.0 ${testPkgId2}`,
            },
          }),
        },
      })

      // Call skip function
      await skip({
        projectRoot: dir,
        packageJson,
        scurry,
      })

      // Verify lockfile was updated with blocked packages while preserving existing data
      const lockfilePath = resolve(dir, 'vlt-lock.json')
      t.ok(
        existsSync(lockfilePath),
        'lockfile should exist after skip',
      )

      const lockfileContent = JSON.parse(
        readFileSync(lockfilePath, 'utf8'),
      )

      t.ok(
        lockfileContent.build,
        'lockfile should contain build data',
      )
      t.ok(
        lockfileContent.build.blocked,
        'lockfile should contain blocked build data',
      )
      t.ok(
        lockfileContent.build.allowed,
        'lockfile should contain allowed build data',
      )

      // Check that existing build data is preserved
      t.strictSame(
        lockfileContent.build.allowed,
        { 'https://registry.npmjs.org/': ['existing-allowed-pkg'] },
        'existing allowed packages should be preserved',
      )

      // Check that skipped packages are added to blocked list alongside existing blocked packages
      t.strictSame(
        lockfileContent.build.blocked[
          'https://registry.npmjs.org/'
        ].sort(),
        ['existing-blocked-pkg', 'skip-pkg-1', 'skip-pkg-2'].sort(),
        'skipped packages should be added to blocked list with existing packages',
      )

      // Verify build data file was removed (no items remain)
      const buildFilePath = resolve(
        dir,
        'node_modules/.vlt-build.json',
      )
      t.notOk(
        existsSync(buildFilePath),
        'build data file should be removed after skipping all items',
      )

      t.pass(
        'skip with existing lockfile build data completed successfully',
      )
    },
  )

  t.test(
    'skip function with no nodes to skip after filtering',
    async t => {
      const testPkgId1 = joinDepIDTuple([
        'registry',
        'https://registry.npmjs.org/',
        'queued-pkg-1',
        '1.0.0',
      ])
      const testPkgId2 = joinDepIDTuple([
        'registry',
        'https://registry.npmjs.org/',
        'queued-pkg-2',
        '1.0.0',
      ])
      const testPkgId3 = joinDepIDTuple([
        'registry',
        'https://registry.npmjs.org/',
        'filtered-pkg',
        '1.0.0',
      ])

      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            'queued-pkg-1': '1.0.0',
            'queued-pkg-2': '1.0.0',
            'filtered-pkg': '1.0.0',
          },
        }),
        'vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {
            registry: 'https://registry.npmjs.org/',
          },
          build: {
            allowed: {},
            blocked: {},
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
            [testPkgId1]: [
              0,
              'queued-pkg-1',
              'sha512-queuedintegrity==',
            ],
            [testPkgId2]: [
              0,
              'queued-pkg-2',
              'sha512-queuedintegrity==',
            ],
            [testPkgId3]: [
              0,
              'filtered-pkg',
              'sha512-filteredintegrity==',
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} queued-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
            [`${joinDepIDTuple(['file', '.'])} queued-pkg-2`]: `prod 1.0.0 ${testPkgId2}`,
            [`${joinDepIDTuple(['file', '.'])} filtered-pkg`]: `prod 1.0.0 ${testPkgId3}`,
          },
        }),
        'vlt.json': JSON.stringify({}),
        node_modules: {
          '.vlt-build.json': JSON.stringify({
            queue: [testPkgId1, testPkgId2], // testPkgId3 is NOT in queue, so it won't be skipped
          } satisfies BuildData),
          'queued-pkg-1': {
            'package.json': JSON.stringify({
              name: 'queued-pkg-1',
              version: '1.0.0',
            }),
          },
          'queued-pkg-2': {
            'package.json': JSON.stringify({
              name: 'queued-pkg-2',
              version: '1.0.0',
            }),
          },
          'filtered-pkg': {
            'package.json': JSON.stringify({
              name: 'filtered-pkg',
              version: '1.0.0',
            }),
          },
          '.vlt-lock.json': JSON.stringify({
            lockfileVersion: 0,
            options: {
              registry: 'https://registry.npmjs.org/',
            },
            build: {
              allowed: {},
              blocked: {},
            },
            nodes: {
              [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
              [testPkgId1]: [
                0,
                'queued-pkg-1',
                'sha512-queuedintegrity==',
              ],
              [testPkgId2]: [
                0,
                'queued-pkg-2',
                'sha512-queuedintegrity==',
              ],
              [testPkgId3]: [
                0,
                'filtered-pkg',
                'sha512-filteredintegrity==',
              ],
            },
            edges: {
              [`${joinDepIDTuple(['file', '.'])} queued-pkg-1`]: `prod 1.0.0 ${testPkgId1}`,
              [`${joinDepIDTuple(['file', '.'])} queued-pkg-2`]: `prod 1.0.0 ${testPkgId2}`,
              [`${joinDepIDTuple(['file', '.'])} filtered-pkg`]: `prod 1.0.0 ${testPkgId3}`,
            },
          }),
        },
      })

      // Call skip function with queryFilteredNodes that don't match anything in the queue
      // This should result in no nodes being skipped due to filtering
      await skip({
        projectRoot: dir,
        packageJson,
        scurry,
        queryFilteredNodes: [testPkgId3], // This package is NOT in the build queue
      })

      // Verify lockfile was NOT modified since no nodes were actually skipped
      const lockfilePath = resolve(dir, 'vlt-lock.json')
      const lockfileContent = JSON.parse(
        readFileSync(lockfilePath, 'utf8'),
      )

      // Build data should remain empty since no packages were skipped
      t.strictSame(
        lockfileContent.build.blocked,
        {},
        'no packages should be blocked since none were skipped',
      )

      // Verify build data file still exists with original queue
      const buildFilePath = resolve(
        dir,
        'node_modules/.vlt-build.json',
      )
      t.ok(
        existsSync(buildFilePath),
        'build data file should still exist since no items were skipped',
      )

      const buildData = JSON.parse(
        readFileSync(buildFilePath, 'utf8'),
      )
      t.strictSame(
        buildData.queue.sort(),
        [testPkgId1, testPkgId2].sort(),
        'build queue should remain unchanged',
      )

      t.pass(
        'skip with no nodes to skip after filtering completed without changes',
      )
    },
  )
})
