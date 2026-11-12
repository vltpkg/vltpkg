import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { Monorepo } from '@vltpkg/workspaces'
import * as fs from 'node:fs'
import { existsSync, readdirSync } from 'node:fs'
import type { MakeDirectoryOptions, PathLike, symlink } from 'node:fs'
import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Test } from 'tap'
import type { Node } from '../../src/index.ts'
import { actual } from '../../src/index.ts'
import {
  internalHoist,
  pickNodeToHoist,
} from '../../src/reify/internal-hoist.ts'
import { symlinkSyncMkdirp } from '../../src/reify/symlink-sync.ts'

t.test('basic hoisting', async t => {
  const mainManifest = { name: 'root' }

  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': JSON.stringify({
      workspaces: 'src/*',
      dependencies: {
        x: 'file:x',
        '@vltpkg/foo': 'github:vltpkg/foo',
      },
    }),
    x: {
      'package.json': JSON.stringify({
        name: 'x',
        version: '1.2.3',
      }),
    },
    node_modules: {
      // verify it works for scoped packages
      '@vltpkg': {
        foo: t.fixture(
          'symlink',
          `../.vlt/${joinDepIDTuple([
            'git',
            'git@github.com/vltpkg/foo',
            'main',
          ])}/node_modules/@vltpkg/foo`,
        ),
      },
      // outside of vlt store, not hoisted
      x: t.fixture('symlink', '../x'),

      '.vlt': {
        [joinDepIDTuple(['registry', '', 'abbrev@1.1.1'])]: {
          node_modules: {
            abbrev: {
              'package.json': JSON.stringify({
                name: 'abbrev',
                version: '1.1.1',
              }),
            },
          },
        },
        [joinDepIDTuple([
          'git',
          'git@github.com/vltpkg/foo',
          'main',
        ])]: {
          node_modules: {
            '@vltpkg': {
              foo: {
                'package.json': JSON.stringify({
                  name: '@vltpkg/foo',
                  version: '1.1.1',
                }),
              },
            },
          },
        },
      },
    },
    src: {
      foo: {
        'package.json': JSON.stringify({
          dependencies: {
            abbrev: '1',
          },
        }),
        node_modules: {
          abbrev: t.fixture(
            'symlink',
            `../../../node_modules/.vlt/${joinDepIDTuple(['registry', '', 'abbrev@1.1.1'])}/node_modules/abbrev`,
          ),
        },
      },
    },
  })

  const packageJson = new PackageJson()
  const scurry = new PathScurry(projectRoot)
  const remover = {
    rm: async (path: string) => await rm(path),
  } as unknown as RollbackRemove

  const graph = actual.load({
    projectRoot,
    mainManifest,
    scurry,
    packageJson,
    monorepo: Monorepo.load(projectRoot),
  })

  await internalHoist(
    graph,
    {
      projectRoot,
      scurry,
    },
    remover,
  )

  t.strictSame(
    readdirSync(
      resolve(projectRoot, 'node_modules/.vlt/node_modules'),
    ).sort((a, b) => a.localeCompare(b, 'en')),
    ['@vltpkg', 'abbrev'],
  )
  t.strictSame(
    readdirSync(
      resolve(projectRoot, 'node_modules/.vlt/node_modules/@vltpkg'),
    ),
    ['foo'],
  )
})

t.test('basic hoisting with existing links to replace', async t => {
  const mainManifest = { name: 'root' }

  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': JSON.stringify({
      workspaces: 'src/*',
      dependencies: {
        x: 'file:x',
        '@vltpkg/foo': 'github:vltpkg/foo',
      },
    }),
    x: {
      'package.json': JSON.stringify({
        name: 'x',
        version: '1.2.3',
      }),
    },
    node_modules: {
      // verify it works for scoped packages
      '@vltpkg': {
        foo: t.fixture(
          'symlink',
          `../.vlt/${joinDepIDTuple([
            'git',
            'git@github.com/vltpkg/foo',
            'main',
          ])}/node_modules/@vltpkg/foo`,
        ),
      },
      // outside of vlt store, not hoisted
      x: t.fixture('symlink', '../x'),

      '.vlt': {
        node_modules: {
          '@vltpkg': {
            foo: t.fixture('symlink', '..'),
          },
          abbrev: t.fixture('symlink', '..'),
        },
        [joinDepIDTuple(['registry', '', 'abbrev@1.1.1'])]: {
          node_modules: {
            abbrev: {
              'package.json': JSON.stringify({
                name: 'abbrev',
                version: '1.1.1',
              }),
            },
          },
        },
        [joinDepIDTuple([
          'git',
          'git@github.com/vltpkg/foo',
          'main',
        ])]: {
          node_modules: {
            '@vltpkg': {
              foo: {
                'package.json': JSON.stringify({
                  name: '@vltpkg/foo',
                  version: '1.1.1',
                }),
              },
            },
          },
        },
      },
    },
    src: {
      foo: {
        'package.json': JSON.stringify({
          dependencies: {
            abbrev: '1',
          },
        }),
        node_modules: {
          abbrev: t.fixture(
            'symlink',
            `../../../node_modules/.vlt/${joinDepIDTuple(['registry', '', 'abbrev@1.1.1'])}/node_modules/abbrev`,
          ),
        },
      },
    },
  })

  const packageJson = new PackageJson()
  const scurry = new PathScurry(projectRoot)
  const remover = {
    rm: async (path: string) => await rm(path),
  } as unknown as RollbackRemove

  const graph = actual.load({
    projectRoot,
    mainManifest,
    scurry,
    packageJson,
    monorepo: Monorepo.load(projectRoot),
  })

  await internalHoist(
    graph,
    {
      projectRoot,
      scurry,
    },
    remover,
  )

  t.strictSame(
    readdirSync(
      resolve(projectRoot, 'node_modules/.vlt/node_modules'),
    ).sort((a, b) => a.localeCompare(b, 'en')),
    ['@vltpkg', 'abbrev'],
  )
  t.strictSame(
    readdirSync(
      resolve(projectRoot, 'node_modules/.vlt/node_modules/@vltpkg'),
    ),
    ['foo'],
  )
})

t.test('scope dirs are made before linking', async t => {
  const gitId = joinDepIDTuple([
    'git',
    'git@github.com/vltpkg/foo',
    'main',
  ])
  const barId = joinDepIDTuple(['registry', '', '@vltpkg/bar@1.0.0'])
  const hoist = async (t: Test, scopeDir: boolean) => {
    const mainManifest = { name: 'root' }
    const projectRoot = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      'vlt.json': JSON.stringify({
        dependencies: { '@vltpkg/foo': 'github:vltpkg/foo' },
      }),
      node_modules: {
        '@vltpkg': {
          foo: t.fixture(
            'symlink',
            `../.vlt/${gitId}/node_modules/@vltpkg/foo`,
          ),
          bar: t.fixture(
            'symlink',
            `../.vlt/${barId}/node_modules/@vltpkg/bar`,
          ),
        },
        '.vlt': {
          ...(scopeDir ? { node_modules: { '@vltpkg': {} } } : {}),
          [barId]: {
            node_modules: {
              '@vltpkg': {
                bar: {
                  'package.json': JSON.stringify({
                    name: '@vltpkg/bar',
                    version: '1.0.0',
                  }),
                },
              },
            },
          },
          [gitId]: {
            node_modules: {
              '@vltpkg': {
                foo: {
                  'package.json': JSON.stringify({
                    name: '@vltpkg/foo',
                    version: '1.1.1',
                  }),
                },
              },
            },
          },
        },
      },
    })
    const made: string[] = []
    const noParent: string[] = []
    const { internalHoist } = await t.mockImport<
      typeof import('../../src/reify/internal-hoist.ts')
    >('../../src/reify/internal-hoist.ts', {
      'node:fs': {
        ...fs,
        mkdirSync: (
          path: PathLike,
          options?: MakeDirectoryOptions,
        ) => {
          made.push(String(path))
          return fs.mkdirSync(path, options)
        },
      },
      '../../src/reify/symlink-sync.ts': {
        symlinkSyncMkdirp: (
          target: string,
          link: string,
          type?: symlink.Type,
        ) => {
          if (!existsSync(dirname(link))) noParent.push(link)
          symlinkSyncMkdirp(target, link, type)
        },
      },
    })
    const scurry = new PathScurry(projectRoot)
    const graph = actual.load({
      projectRoot,
      mainManifest,
      scurry,
      packageJson: new PackageJson(),
      monorepo: Monorepo.load(projectRoot),
    })
    await internalHoist(graph, { projectRoot, scurry }, {
      rm: async (path: string) => await rm(path),
    } as unknown as RollbackRemove)
    const scope = scurry.resolve(
      'node_modules/.vlt/node_modules/@vltpkg',
    )
    t.strictSame(
      readdirSync(scope).sort((a, b) => a.localeCompare(b, 'en')),
      ['bar', 'foo'],
      'scoped links hoisted',
    )
    return { made, noParent, scope }
  }

  t.test('fresh hoist dir', async t => {
    const { made, noParent, scope } = await hoist(t, false)
    t.strictSame(noParent, [], 'no link into a missing dir')
    t.strictSame(made, [scope], 'scope dir made once')
  })

  t.test('scope dir already there', async t => {
    const { made, noParent } = await hoist(t, true)
    t.strictSame(noParent, [], 'no link into a missing dir')
    t.strictSame(made, [], 'listed scope dir not made again')
  })
})

t.test(
  'basic hoisting with existing links to leave in place',
  async t => {
    const mainManifest = { name: 'root' }

    const projectRoot = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      'vlt.json': JSON.stringify({
        workspaces: 'src/*',
        dependencies: {
          x: 'file:x',
          '@vltpkg/foo': 'github:vltpkg/foo',
        },
      }),
      x: {
        'package.json': JSON.stringify({
          name: 'x',
          version: '1.2.3',
        }),
      },
      node_modules: {
        // verify it works for scoped packages
        '@vltpkg': {
          foo: t.fixture(
            'symlink',
            `../.vlt/${joinDepIDTuple([
              'git',
              'git@github.com/vltpkg/foo',
              'main',
            ])}/node_modules/@vltpkg/foo`,
          ),
        },
        // outside of vlt store, not hoisted
        x: t.fixture('symlink', '../x'),

        '.vlt': {
          node_modules: {
            '@vltpkg': {
              foo: t.fixture(
                'symlink',
                `../../${joinDepIDTuple([
                  'git',
                  'git@github.com/vltpkg/foo',
                  'main',
                ])}/node_modules/@vltpkg/foo`,
              ),
            },
            abbrev: t.fixture(
              'symlink',
              `../${joinDepIDTuple(['registry', '', 'abbrev@1.1.1'])}/node_modules/abbrev`,
            ),
          },
          [joinDepIDTuple(['registry', '', 'abbrev@1.1.1'])]: {
            node_modules: {
              abbrev: {
                'package.json': JSON.stringify({
                  name: 'abbrev',
                  version: '1.1.1',
                }),
              },
            },
          },
          [joinDepIDTuple([
            'git',
            'git@github.com/vltpkg/foo',
            'main',
          ])]: {
            node_modules: {
              '@vltpkg': {
                foo: {
                  'package.json': JSON.stringify({
                    name: '@vltpkg/foo',
                    version: '1.1.1',
                  }),
                },
              },
            },
          },
        },
      },
      src: {
        foo: {
          'package.json': JSON.stringify({
            dependencies: {
              abbrev: '1',
            },
          }),
          node_modules: {
            abbrev: t.fixture(
              'symlink',
              `../../../node_modules/.vlt/${joinDepIDTuple(['registry', '', 'abbrev@1.1.1'])}/node_modules/abbrev`,
            ),
          },
        },
      },
    })

    const packageJson = new PackageJson()
    const scurry = new PathScurry(projectRoot)
    const remover = {
      rm: async (path: string) => await rm(path),
    } as unknown as RollbackRemove

    const graph = actual.load({
      projectRoot,
      mainManifest,
      scurry,
      packageJson,
      monorepo: Monorepo.load(projectRoot),
    })

    await internalHoist(
      graph,
      {
        projectRoot,
        scurry,
      },
      remover,
    )

    t.strictSame(
      readdirSync(
        resolve(projectRoot, 'node_modules/.vlt/node_modules'),
      ).sort((a, b) => a.localeCompare(b, 'en')),
      ['@vltpkg', 'abbrev'],
    )
    t.strictSame(
      readdirSync(
        resolve(
          projectRoot,
          'node_modules/.vlt/node_modules/@vltpkg',
        ),
      ),
      ['foo'],
    )
  },
)

t.test('deciding which node to hoist', async t => {
  t.test('do not pick importer', async t => {
    const n = { importer: true } as unknown as Node
    t.equal(pickNodeToHoist(new Set([n])), undefined)
  })

  t.test('do not pick node not in vlt store', async t => {
    const n = {
      importer: false,
      inVltStore: () => false,
    } as unknown as Node
    t.equal(pickNodeToHoist(new Set([n])), undefined)
  })

  t.test('pick node if only one', async t => {
    const n = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@1.2.3']),
    } as unknown as Node
    t.equal(pickNodeToHoist(new Set([n])), n)
  })

  t.test('pick importer dep over non-importer dep', async t => {
    const n = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@1.2.3']),
      edgesIn: new Set([{ from: { importer: true } }]),
    } as unknown as Node
    const m = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@2.3.4']),
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    t.equal(pickNodeToHoist(new Set([m, n])), n)
    t.equal(pickNodeToHoist(new Set([n, m])), n)
  })

  t.test('pick registry node over non-registry', async t => {
    const n = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@1.2.3']),
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    const m = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['git', 'git@git.com/x', 'main']),
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    t.equal(pickNodeToHoist(new Set([m, n])), n)
    t.equal(pickNodeToHoist(new Set([n, m])), n)
  })

  t.test('pick lexically higher of all non-reg deps', async t => {
    const n = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['git', 'git@git.com/x', 'apple']),
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    const m = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['git', 'git@git.com/x', 'main']),
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    t.equal(pickNodeToHoist(new Set([m, n])), n)
    t.equal(pickNodeToHoist(new Set([n, m])), n)
  })

  t.test('pick higher version registry dependency', async t => {
    const n = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@1.2.3']),
      version: '1.2.3',
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    const m = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@2.3.4']),
      version: '2.3.4',
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    t.equal(pickNodeToHoist(new Set([m, n])), m)
    t.equal(pickNodeToHoist(new Set([n, m])), m)
  })

  t.test('pick versioned dependency over unversioned', async t => {
    // this is mostly just for completion's sake, it's very rare
    const n = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@1.2.3']),
      version: '1.2.3',
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    const m = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@2.3.4']),
      edgesIn: new Set([{ from: { importer: false } }]),
    } as unknown as Node
    t.equal(pickNodeToHoist(new Set([m, n])), n)
    t.equal(pickNodeToHoist(new Set([n, m])), n)
  })
})

t.test('hoisting with aliased dependencies', async t => {
  const mainManifest = { name: 'root' }

  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': JSON.stringify({
      dependencies: {
        foo: 'npm:bar@1.0.0',
        baz: 'npm:bar@1.0.0',
      },
    }),
    node_modules: {
      foo: t.fixture(
        'symlink',
        `.vlt/${joinDepIDTuple(['registry', '', 'bar@1.0.0'])}/node_modules/bar`,
      ),
      baz: t.fixture(
        'symlink',
        `.vlt/${joinDepIDTuple(['registry', '', 'bar@1.0.0'])}/node_modules/bar`,
      ),
      '.vlt': {
        [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: {
          node_modules: {
            bar: {
              'package.json': JSON.stringify({
                name: 'bar',
                version: '1.0.0',
              }),
            },
          },
        },
      },
    },
  })

  const packageJson = new PackageJson()
  const scurry = new PathScurry(projectRoot)
  const remover = {
    rm: async (path: string) => await rm(path),
  } as unknown as RollbackRemove

  const graph = actual.load({
    projectRoot,
    mainManifest,
    scurry,
    packageJson,
    monorepo: Monorepo.load(projectRoot),
    // the `npm` alias is no longer built in; configure it so the
    // `npm:bar` aliased deps resolve
    registries: { npm: 'https://registry.npmjs.org/' },
  })

  await internalHoist(
    graph,
    {
      projectRoot,
      scurry,
    },
    remover,
  )

  const hoistDir = readdirSync(
    resolve(projectRoot, 'node_modules/.vlt/node_modules'),
  )
  t.notOk(hoistDir.includes('bar'), 'canonical name NOT hoisted')
  t.ok(hoistDir.includes('foo'), 'alias foo hoisted')
  t.ok(hoistDir.includes('baz'), 'alias baz hoisted')
})
