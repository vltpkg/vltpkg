import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { Monorepo } from '@vltpkg/workspaces'
import { readdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Node } from '../../src/index.ts'
import { actual } from '../../src/index.ts'
import {
  internalHoist,
  pickNodeToHoist,
} from '../../src/reify/internal-hoist.ts'

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
    const cache = new Map()
    t.equal(pickNodeToHoist(new Set([n]), cache), undefined)
  })

  t.test('do not pick node not in vlt store', async t => {
    const n = {
      importer: false,
      inVltStore: () => false,
    } as unknown as Node
    const cache = new Map()
    t.equal(pickNodeToHoist(new Set([n]), cache), undefined)
  })

  t.test('pick node if only one', async t => {
    const n = {
      importer: false,
      inVltStore: () => true,
      id: joinDepIDTuple(['registry', '', 'x@1.2.3']),
    } as unknown as Node
    const cache = new Map()
    t.equal(pickNodeToHoist(new Set([n]), cache), n)
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
    const cache = new Map()
    t.equal(pickNodeToHoist(new Set([m, n]), cache), n)
    t.equal(pickNodeToHoist(new Set([n, m]), cache), n)
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
    const cache = new Map()
    t.equal(pickNodeToHoist(new Set([m, n]), cache), n)
    t.equal(pickNodeToHoist(new Set([n, m]), cache), n)
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
    const cache = new Map()
    t.equal(pickNodeToHoist(new Set([m, n]), cache), n)
    t.equal(pickNodeToHoist(new Set([n, m]), cache), n)
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
    const cache = new Map()
    t.equal(pickNodeToHoist(new Set([m, n]), cache), m)
    t.equal(pickNodeToHoist(new Set([n, m]), cache), m)
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
    const cache = new Map()
    t.equal(pickNodeToHoist(new Set([m, n]), cache), n)
    t.equal(pickNodeToHoist(new Set([n, m]), cache), n)
  })

  t.test('cache is reused across calls', async t => {
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
    const cache = new Map()
    // First call populates cache (needs 2+ nodes to trigger comparison)
    pickNodeToHoist(new Set([m, n]), cache)
    t.equal(cache.size, 2, 'cache populated with both nodes')
    t.equal(cache.get(n), true, 'n cached as importer dep')
    t.equal(cache.get(m), false, 'm cached as non-importer dep')
    // Second call reuses cache (no iteration needed)
    pickNodeToHoist(new Set([m, n]), cache)
    t.equal(cache.size, 2, 'cache unchanged')
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
