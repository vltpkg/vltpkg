import { SpecOptions } from '@vltpkg/spec'
import t from 'tap'
import { load } from '../../src/actual/load.js'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.js'

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    custom: 'http://example.com',
    npm: 'https://registry.npmjs.org',
  },
} satisfies SpecOptions

t.test('load actual', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        '@scoped/a': '^1.0.0',
        '@scoped/b': '^1.0.0',
        foo: '^1.0.0',
        bar: '^1.0.0',
        link: 'file:./linked',
        missing: '^1.0.0',
      },
      devDependencies: {
        aliased: 'custom:foo@^1.0.0',
      },
    }),
    linked: {
      'package.json': JSON.stringify({
        name: 'linked',
        version: '1.0.0',
      }),
    },
    node_modules: {
      '.vlt': {
        'registry;;@scoped%2Fa@1.0.0': {
          node_modules: {
            '@scoped': {
              a: {
                'package.json': JSON.stringify({
                  name: '@scoped/a',
                  version: '1.0.0',
                }),
              },
            },
          },
        },
        'registry;;@scoped%2Fb@1.0.0': {
          node_modules: {
            '@scoped': {
              b: {
                'package.json': JSON.stringify({
                  name: '@scoped/b',
                  version: '1.0.0',
                  dependencies: {
                    '@scoped/c': '^1.0.0',
                  },
                }),
              },
              c: t.fixture(
                'symlink',
                '../../../../.vlt/registry;;@scoped%2Fc@1.0.0/node_modules/@scoped/c',
              ),
            },
          },
        },
        'registry;;@scoped%2Fc@1.0.0': {
          node_modules: {
            '@scoped': {
              c: {
                'package.json': JSON.stringify({
                  name: '@scoped/c',
                  version: '1.0.0',
                }),
              },
            },
          },
        },
        'registry;;bar@1.0.0': {
          node_modules: {
            bar: {
              'package.json': JSON.stringify({
                name: 'bar',
                version: '1.0.0',
                dependencies: {
                  baz: 'custom:baz@^1.0.0',
                },
              }),
            },
            baz: t.fixture(
              'symlink',
              '../../registry;custom;baz@1.0.0/node_modules/baz',
            ),
          },
        },
        'registry;;foo@1.0.0': {
          node_modules: {
            foo: {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '1.0.0',
              }),
            },
          },
        },
        'registry;;ipsum@1.0.0': {
          node_modules: {
            ipsum: {
              'package.json': JSON.stringify({
                name: 'ipsum',
                version: '1.0.0',
              }),
            },
          },
        },
        'registry;;extraneous@1.0.0': {
          node_modules: {
            extraneous: {
              'package.json': JSON.stringify({
                name: 'extraneous',
                version: '1.0.0',
              }),
            },
          },
        },
        'registry;custom;baz@1.0.0': {
          node_modules: {
            baz: {
              'package.json': JSON.stringify({
                name: 'baz',
                version: '1.0.0',
              }),
            },
          },
        },
        'registry;custom;foo@1.0.0': {
          node_modules: {
            foo: {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '1.0.0',
              }),
            },
          },
        },
      },
      '@scoped': {
        a: t.fixture(
          'symlink',
          '../.vlt/registry;;@scoped%2Fa@1.0.0/node_modules/@scoped/a',
        ),
        b: t.fixture(
          'symlink',
          '../.vlt/registry;;@scoped%2Fb@1.0.0/node_modules/@scoped/b',
        ),
      },
      aliased: t.fixture(
        'symlink',
        '.vlt/registry;custom;foo@1.0.0/node_modules/foo',
      ),
      bar: t.fixture(
        'symlink',
        '.vlt/registry;;bar@1.0.0/node_modules/bar',
      ),
      // This should be ignored when traversing the file system
      broken_symlink: t.fixture('symlink', './link-to-nowhere'),
      extraneous: t.fixture(
        'symlink',
        '.vlt/registry;;extraneous@1.0.0/node_modules/extraneous',
      ),
      foo: t.fixture(
        'symlink',
        '.vlt/registry;;foo@1.0.0/node_modules/foo',
      ),
      link: t.fixture('symlink', '../linked'),
    },
    packages: {
      'workspace-a': {
        'package.json': JSON.stringify({
          name: 'workspace-a',
          version: '1.0.0',
          devDependencies: {
            foo: '^1.0.0',
            ipsum: '^1.0.0',
            'workspace-b': 'workspace:*',
          },
        }),
        node_modules: {
          foo: t.fixture(
            'symlink',
            '../../../node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo',
          ),
          ipsum: t.fixture(
            'symlink',
            '../../../node_modules/.vlt/registry;;ipsum@1.0.0/node_modules/ipsum',
          ),
          'workspace-b': t.fixture('symlink', '../../workspace-b'),
        },
      },
      'workspace-b': {
        'package.json': JSON.stringify({
          name: 'workspace-b',
          version: '1.0.0',
        }),
      },
    },
    'vlt-workspaces.json': JSON.stringify({
      packages: ['./packages/*'],
    }),
  })

  const fullGraph = load({
    projectRoot,
    loadManifests: true,
    ...configData,
  })

  t.strictSame(
    fullGraph.missingDependencies.size,
    1,
    'should only have a single missing dependency',
  )

  t.strictSame(
    fullGraph.extraneousDependencies.size,
    1,
    'should only have found a single extraneous dependency',
  )

  t.matchSnapshot(
    humanReadableOutput(fullGraph),
    'should load an actual graph containing missing deps info',
  )

  t.matchSnapshot(
    humanReadableOutput(
      load({ projectRoot, loadManifests: false, ...configData }),
    ),
    'should load an actual graph without any manifest info',
  )
})

t.test('cycle', async t => {
  // my-project
  // +- a
  //    +- b
  //       +- a
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        a: '^1.0.0',
      },
    }),
    node_modules: {
      '.vlt': {
        'registry;;a@1.0.0': {
          node_modules: {
            a: {
              'package.json': JSON.stringify({
                name: 'a',
                version: '1.0.0',
                dependencies: {
                  b: '^1.0.0',
                },
              }),
            },
            b: t.fixture(
              'symlink',
              '../../registry;;b@1.0.0/node_modules/b',
            ),
          },
        },
        'registry;;b@1.0.0': {
          node_modules: {
            b: {
              'package.json': JSON.stringify({
                name: 'b',
                version: '1.0.0',
                dependencies: {
                  a: '^1.0.0',
                },
              }),
            },
            a: t.fixture(
              'symlink',
              '../../registry;;a@1.0.0/node_modules/a',
            ),
          },
        },
      },
      a: t.fixture(
        'symlink',
        '.vlt/registry;;a@1.0.0/node_modules/a',
      ),
    },
  })
  t.matchSnapshot(
    humanReadableOutput(
      load({ projectRoot, loadManifests: true, ...configData }),
    ),
    'should load an actual graph with cycle containing missing deps info',
  )
  t.matchSnapshot(
    humanReadableOutput(
      load({ projectRoot, loadManifests: false, ...configData }),
    ),
    'should load an actual graph with cycle without any manifest info',
  )
})
