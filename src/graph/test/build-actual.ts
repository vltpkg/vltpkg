import { resolve } from 'node:path'
import t from 'tap'
import { Graph } from '../src/graph.js'
import { buildActual } from '../src/build-actual.js'

t.test(
  'build a graph representing what is actually in the fs',
  async t => {
    const rootPkg = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
        bar: '^1.0.0',
      },
    }
    const dir = t.testdir({
      'package.json': JSON.stringify(rootPkg),
      node_modules: {
        '.vlt': {
          'registry.npmjs.com': {
            'foo@1.0.0': {
              node_modules: {
                foo: {
                  'package.json': JSON.stringify({
                    name: 'foo',
                    version: '1.0.0',
                  }),
                },
              },
            },
            'bar@1.0.0': {
              node_modules: {
                bar: {
                  'package.json': JSON.stringify({
                    name: 'bar',
                    version: '1.0.0',
                    dependencies: {
                      '@scoped/baz': '^1.0.0',
                      foo: '^1.0.0',
                    },
                  }),
                },
                '@scoped': {
                  baz: t.fixture(
                    'symlink',
                    '../../../@scoped+baz@1.0.0/node_modules/@scoped/baz',
                  ),
                },
                foo: t.fixture(
                  'symlink',
                  '../../foo@1.0.0/node_modules/foo',
                ),
              },
            },
            '@scoped+baz@1.0.0': {
              node_modules: {
                '@scoped': {
                  baz: {
                    'package.json': JSON.stringify({
                      name: '@scoped/baz',
                      version: '1.0.0',
                    }),
                  },
                },
              },
            },
          },
        },
        foo: t.fixture(
          'symlink',
          '.vlt/registry.npmjs.com/foo@1.0.0/node_modules/foo',
        ),
        bar: t.fixture(
          'symlink',
          '.vlt/registry.npmjs.com/bar@1.0.0/node_modules/bar',
        ),
      },
    })
    const graph = new Graph(rootPkg)
    await buildActual(graph, graph.root, resolve(dir, 'node_modules'))
    t.strictSame(
      graph.packages.size,
      4,
      'should have expected number of packages',
    )
    t.strictSame(
      [...graph.root.edgesOut.values()].map(e => e.to.pkg.name),
      ['foo', 'bar'],
      'should have root edges to its direct dependency nodes',
    )
  },
)

t.test('build a graph with missing direct dependencies', async t => {
  const rootPkg = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      bar: '^1.0.0',
    },
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(rootPkg),
  })
  const graph = new Graph(rootPkg)
  await buildActual(graph, graph.root, resolve(dir, 'node_modules'))
  t.strictSame(
    graph.packages.size,
    1,
    'should have only root package in inventory',
  )
  t.strictSame(
    [...graph.missingDirectDependencies].map(e => ({
      name: e.name,
      spec: e.spec,
    })),
    [
      { name: 'foo', spec: '^1.0.0' },
      { name: 'bar', spec: '^1.0.0' },
    ],
    'should have a set of missing direct dependencies',
  )
})
