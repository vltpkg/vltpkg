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
      true,
    )

    // Check that we got the expected build result
    t.match(result, {
      'https://registry.npmjs.org/': ['x', 'y'],
      file: ['project'],
      workspace: ['app'],
    })

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
  // Pass includeScripts: true to ensure the visit function is called
  await build(
    diff,
    new PackageJson(),
    new PathScurry(projectRoot),
    true,
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
  'build scripts filtering based on build.allowed and build.blocked',
  async t => {
    await t.test(
      'includeScripts=false with package in build.allowed[registry] and another not allowed',
      async t => {
        const aid = joinDepIDTuple([
          'registry',
          '',
          'allowed-pkg@1.0.0',
        ])
        const nid = joinDepIDTuple([
          'registry',
          '',
          'not-allowed@1.0.0',
        ])

        const projectRoot = t.testdir({
          'package.json': JSON.stringify({
            name: 'project',
            version: '1.0.0',
            dependencies: {
              'allowed-pkg': '1.0.0',
              'not-allowed': '1.0.0',
            },
          }),
          node_modules: {
            'allowed-pkg': t.fixture(
              'symlink',
              './.vlt/' + aid + '/node_modules/allowed-pkg',
            ),
            'not-allowed': t.fixture(
              'symlink',
              './.vlt/' + nid + '/node_modules/not-allowed',
            ),
            '.vlt': {
              [aid]: {
                node_modules: {
                  'allowed-pkg': {
                    'package.json': JSON.stringify({
                      name: 'allowed-pkg',
                      version: '1.0.0',
                      scripts: {
                        install: 'echo "allowed pkg install"',
                      },
                    }),
                  },
                },
              },
              [nid]: {
                node_modules: {
                  'not-allowed': {
                    'package.json': JSON.stringify({
                      name: 'not-allowed',
                      version: '1.0.0',
                      scripts: {
                        install: 'echo "not allowed pkg install"',
                      },
                    }),
                  },
                },
              },
            },
          },
        })

        // Load the "after" state with both packages
        const after = actual.load({
          monorepo: Monorepo.maybeLoad(projectRoot),
          packageJson: new PackageJson(),
          scurry: new PathScurry(projectRoot),
          projectRoot,
          loadManifests: true,
        })

        // Configure build.allowed to only include 'allowed-pkg'
        after.build = {
          allowed: {
            'https://registry.npmjs.org/': ['allowed-pkg'],
          },
          blocked: {},
        }

        // Load the "before" state without packages
        const before = actual.load({
          projectRoot,
          monorepo: Monorepo.maybeLoad(projectRoot),
          packageJson: new PackageJson(),
          scurry: new PathScurry(projectRoot),
          loadManifests: true,
        })
        const aNode = before.nodes.get(aid)
        const nNode = before.nodes.get(nid)
        if (!aNode) throw new Error('no allowed-pkg node in before??')
        if (!nNode) throw new Error('no not-allowed node in before??')
        before.removeNode(aNode)
        before.removeNode(nNode)
        const diff = new Diff(before, after)

        // Call build with includeScripts=false
        const result = await build(
          diff,
          new PackageJson(),
          new PathScurry(projectRoot),
          false, // includeScripts=false
        )

        // Should only build the allowed package
        t.match(result, {
          'https://registry.npmjs.org/': ['allowed-pkg'],
        })
        // Should not contain the not-allowed package
        t.notMatch(result['https://registry.npmjs.org/'] ?? [], [
          'not-allowed',
        ])

        // Verify runs - only the allowed package should run its install script
        const allowedRuns = runs.filter(r =>
          r.cwd.includes('/allowed-pkg'),
        )
        const notAllowedRuns = runs.filter(r =>
          r.cwd.includes('/not-allowed'),
        )

        t.equal(
          allowedRuns.length,
          1,
          'allowed package should have install run',
        )
        t.equal(
          notAllowedRuns.length,
          0,
          'not-allowed package should not have install run',
        )
      },
    )

    await t.test(
      'includeScripts=false with package in build.blocked[registry] and another not blocked',
      async t => {
        const bid = joinDepIDTuple([
          'registry',
          '',
          'blocked-pkg@1.0.0',
        ])
        const uid = joinDepIDTuple([
          'registry',
          '',
          'unblocked@1.0.0',
        ])

        const projectRoot = t.testdir({
          'package.json': JSON.stringify({
            name: 'project',
            version: '1.0.0',
            dependencies: {
              'blocked-pkg': '1.0.0',
              unblocked: '1.0.0',
            },
          }),
          node_modules: {
            'blocked-pkg': t.fixture(
              'symlink',
              './.vlt/' + bid + '/node_modules/blocked-pkg',
            ),
            unblocked: t.fixture(
              'symlink',
              './.vlt/' + uid + '/node_modules/unblocked',
            ),
            '.vlt': {
              [bid]: {
                node_modules: {
                  'blocked-pkg': {
                    'package.json': JSON.stringify({
                      name: 'blocked-pkg',
                      version: '1.0.0',
                      scripts: {
                        install: 'echo "blocked pkg install"',
                      },
                    }),
                  },
                },
              },
              [uid]: {
                node_modules: {
                  unblocked: {
                    'package.json': JSON.stringify({
                      name: 'unblocked',
                      version: '1.0.0',
                      scripts: {
                        install: 'echo "unblocked pkg install"',
                      },
                    }),
                  },
                },
              },
            },
          },
        })

        // Load the "after" state with both packages
        const after = actual.load({
          monorepo: Monorepo.maybeLoad(projectRoot),
          packageJson: new PackageJson(),
          scurry: new PathScurry(projectRoot),
          projectRoot,
          loadManifests: true,
        })

        // Configure build.blocked to block 'blocked-pkg'
        after.build = {
          allowed: {},
          blocked: {
            'https://registry.npmjs.org/': ['blocked-pkg'],
          },
        }

        // Load the "before" state without packages
        const before = actual.load({
          projectRoot,
          monorepo: Monorepo.maybeLoad(projectRoot),
          packageJson: new PackageJson(),
          scurry: new PathScurry(projectRoot),
          loadManifests: true,
        })
        const bNode = before.nodes.get(bid)
        const uNode = before.nodes.get(uid)
        if (!bNode) throw new Error('no blocked-pkg node in before??')
        if (!uNode) throw new Error('no unblocked node in before??')
        before.removeNode(bNode)
        before.removeNode(uNode)
        const diff = new Diff(before, after)

        // Call build with includeScripts=false
        const result = await build(
          diff,
          new PackageJson(),
          new PathScurry(projectRoot),
          false, // includeScripts=false
        )

        // Should only build the unblocked package (because blocked is excluded and with includeScripts=false, only allowed packages run)
        // Actually, with includeScripts=false and no allowed packages, none should run
        t.match(result, {})

        // Verify runs - no packages should run (blocked is blocked, unblocked is not in allowed list)
        const blockedRuns = runs.filter(r =>
          r.cwd.includes('/blocked-pkg'),
        )
        const unblockedRuns = runs.filter(r =>
          r.cwd.includes('/unblocked'),
        )

        t.equal(
          blockedRuns.length,
          0,
          'blocked package should not have install run',
        )
        t.equal(
          unblockedRuns.length,
          0,
          'unblocked package should not have install run when not in allowed list',
        )
      },
    )

    await t.test(
      'includeScripts=false with package in both build.allowed[registry] and build.blocked[registry]',
      async t => {
        const cid = joinDepIDTuple([
          'registry',
          '',
          'conflicted@1.0.0',
        ])

        const projectRoot = t.testdir({
          'package.json': JSON.stringify({
            name: 'project',
            version: '1.0.0',
            dependencies: {
              conflicted: '1.0.0',
            },
          }),
          node_modules: {
            conflicted: t.fixture(
              'symlink',
              './.vlt/' + cid + '/node_modules/conflicted',
            ),
            '.vlt': {
              [cid]: {
                node_modules: {
                  conflicted: {
                    'package.json': JSON.stringify({
                      name: 'conflicted',
                      version: '1.0.0',
                      scripts: {
                        install: 'echo "conflicted pkg install"',
                      },
                    }),
                  },
                },
              },
            },
          },
        })

        // Load the "after" state with the package
        const after = actual.load({
          monorepo: Monorepo.maybeLoad(projectRoot),
          packageJson: new PackageJson(),
          scurry: new PathScurry(projectRoot),
          projectRoot,
          loadManifests: true,
        })

        // Configure build to have the package in both allowed and blocked
        after.build = {
          allowed: {
            'https://registry.npmjs.org/': ['conflicted'],
          },
          blocked: {
            'https://registry.npmjs.org/': ['conflicted'],
          },
        }

        // Load the "before" state without packages
        const before = actual.load({
          projectRoot,
          monorepo: Monorepo.maybeLoad(projectRoot),
          packageJson: new PackageJson(),
          scurry: new PathScurry(projectRoot),
          loadManifests: true,
        })
        const cNode = before.nodes.get(cid)
        if (!cNode) throw new Error('no conflicted node in before??')
        before.removeNode(cNode)
        const diff = new Diff(before, after)

        // Call build with includeScripts=false
        const result = await build(
          diff,
          new PackageJson(),
          new PathScurry(projectRoot),
          false, // includeScripts=false
        )

        // Blocked should take precedence over allowed, so no builds should occur
        t.match(result, {})

        // Verify runs - the package should not run (blocked takes precedence)
        const conflictedRuns = runs.filter(r =>
          r.cwd.includes('/conflicted'),
        )
        t.equal(
          conflictedRuns.length,
          0,
          'conflicted package should not run when blocked, even if also allowed',
        )
      },
    )

    await t.test(
      'includeScripts=true with package in build.blocked[registry]',
      async t => {
        const bid = joinDepIDTuple([
          'registry',
          '',
          'blocked-pkg@1.0.0',
        ])
        const rid = joinDepIDTuple([
          'registry',
          '',
          'regular-pkg@1.0.0',
        ])

        const projectRoot = t.testdir({
          'package.json': JSON.stringify({
            name: 'project',
            version: '1.0.0',
            dependencies: {
              'blocked-pkg': '1.0.0',
              'regular-pkg': '1.0.0',
            },
          }),
          node_modules: {
            'blocked-pkg': t.fixture(
              'symlink',
              './.vlt/' + bid + '/node_modules/blocked-pkg',
            ),
            'regular-pkg': t.fixture(
              'symlink',
              './.vlt/' + rid + '/node_modules/regular-pkg',
            ),
            '.vlt': {
              [bid]: {
                node_modules: {
                  'blocked-pkg': {
                    'package.json': JSON.stringify({
                      name: 'blocked-pkg',
                      version: '1.0.0',
                      scripts: {
                        install: 'echo "blocked pkg install"',
                      },
                    }),
                  },
                },
              },
              [rid]: {
                node_modules: {
                  'regular-pkg': {
                    'package.json': JSON.stringify({
                      name: 'regular-pkg',
                      version: '1.0.0',
                      scripts: {
                        install: 'echo "regular pkg install"',
                      },
                    }),
                  },
                },
              },
            },
          },
        })

        // Load the "after" state with both packages
        const after = actual.load({
          monorepo: Monorepo.maybeLoad(projectRoot),
          packageJson: new PackageJson(),
          scurry: new PathScurry(projectRoot),
          projectRoot,
          loadManifests: true,
        })

        // Configure build.blocked to block 'blocked-pkg'
        after.build = {
          allowed: {},
          blocked: {
            'https://registry.npmjs.org/': ['blocked-pkg'],
          },
        }

        // Load the "before" state without packages
        const before = actual.load({
          projectRoot,
          monorepo: Monorepo.maybeLoad(projectRoot),
          packageJson: new PackageJson(),
          scurry: new PathScurry(projectRoot),
          loadManifests: true,
        })
        const bNode = before.nodes.get(bid)
        const rNode = before.nodes.get(rid)
        if (!bNode) throw new Error('no blocked-pkg node in before??')
        if (!rNode) throw new Error('no regular-pkg node in before??')
        before.removeNode(bNode)
        before.removeNode(rNode)
        const diff = new Diff(before, after)

        // Call build with includeScripts=true
        const result = await build(
          diff,
          new PackageJson(),
          new PathScurry(projectRoot),
          true, // includeScripts=true
        )

        // Should build only the regular package (blocked package should be excluded even with includeScripts=true)
        t.match(result, {
          'https://registry.npmjs.org/': ['regular-pkg'],
        })
        // Should not contain the blocked package
        t.notMatch(result['https://registry.npmjs.org/'] ?? [], [
          'blocked-pkg',
        ])

        // Verify runs - only the regular package should run
        const blockedRuns = runs.filter(r =>
          r.cwd.includes('/blocked-pkg'),
        )
        const regularRuns = runs.filter(r =>
          r.cwd.includes('/regular-pkg'),
        )

        t.equal(
          blockedRuns.length,
          0,
          'blocked package should not have install run even with includeScripts=true',
        )
        t.equal(
          regularRuns.length,
          1,
          'regular package should have install run with includeScripts=true',
        )
      },
    )
  },
)
