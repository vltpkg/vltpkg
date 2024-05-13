import { resolve } from 'node:path'
import { inspect } from 'node:util'
import t from 'tap'
import { buildActual } from '../src/build-actual.js'
import { Graph } from '../src/graph.js'
import { humanReadableOutput } from '../src/visualization/human-readable-output.js'

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
          registry: {
            'https%3A%2F%2Fregistry.npmjs.org': {
              'foo@1.0.0': {
                'package.json': JSON.stringify({
                  name: 'foo',
                  version: '0.0.0',
                }),
              },
              'bar@1.0.0': {
                node_modules: {
                  '@scoped': {
                    baz: t.fixture(
                      'symlink',
                      '../../../%40scoped%2Fbaz@1.0.0',
                    ),
                  },
                  foo: t.fixture('symlink', '../../../foo@1.0.0'),
                },
                'package.json': JSON.stringify({
                  name: 'bar',
                  version: '1.0.0',
                  dependencies: {
                    '@scoped/baz': '^1.0.0',
                    foo: '^1.0.0',
                  },
                }),
              },
              '%40scoped%2Fbaz@1.0.0': {
                'package.json': JSON.stringify({
                  name: '@scoped/baz',
                  version: '1.0.0',
                }),
              },
            },
          },
        },
        foo: t.fixture(
          'symlink',
          '.vlt/registry/https%3A%2F%2Fregistry.npmjs.org/foo@1.0.0',
        ),
        bar: t.fixture(
          'symlink',
          '.vlt/registry/https%3A%2F%2Fregistry.npmjs.org/bar@1.0.0',
        ),
      },
    })
    const graph = new Graph(rootPkg)
    buildActual(graph, graph.root, resolve(dir, 'node_modules'))
    t.matchSnapshot(
      inspect(humanReadableOutput(graph), { depth: Infinity }),
    )
    t.strictSame(
      graph.packages.size,
      4,
      'should have expected number of packages',
    )
    t.strictSame(
      [...graph.root.edgesOut.values()].map(e => e.to?.pkg.name),
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
  buildActual(graph, graph.root, resolve(dir, 'node_modules'))
  t.strictSame(
    graph.packages.size,
    1,
    'should have only root package in inventory',
  )
  t.match(
    [...graph.missingDependencies].map(e => ({
      name: e.name,
      spec: e.spec,
    })),
    [
      { name: 'foo', spec: { name: 'foo', bareSpec: '^1.0.0' } },
      { name: 'bar', spec: { name: 'bar', bareSpec: '^1.0.0' } },
    ],
    'should have a set of missing direct dependencies',
  )
})

t.test('non registry dependency', async t => {
  const rootPkg = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: 'http://example.com/foo-tarball.tgz',
    },
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(rootPkg),
    node_modules: {
      '.vlt': {
        remote: {
          'http%3A%2F%2Fexample.com': {
            'foo@http%3A%2F%2Fexample.com%2Ffoo-tarball.tgz': {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '0.0.0',
              }),
            },
          },
        },
      },
      foo: t.fixture(
        'symlink',
        '.vlt/remote/http%3A%2F%2Fexample.com/foo@http%3A%2F%2Fexample.com%2Ffoo-tarball.tgz',
      ),
    },
  })
  const graph = new Graph(rootPkg)
  buildActual(graph, graph.root, resolve(dir, 'node_modules'))
  t.strictSame(
    graph.packages.get('foo@0.0.0').origin,
    '',
    'should have package in inventory with a blank origin',
  )
})

t.test('unconfigured registry found', async t => {
  const rootPkg = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(rootPkg),
    node_modules: {
      '.vlt': {
        registry: {
          'http%3A%2F%2Fexample.com': {
            'foo@1.0.0': {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '0.0.0',
              }),
            },
          },
        },
      },
      foo: t.fixture(
        'symlink',
        '.vlt/registry/http%3A%2F%2Fexample.com/foo@1.0.0',
      ),
    },
  })
  const graph = new Graph(rootPkg)
  t.throws(
    () =>
      buildActual(graph, graph.root, resolve(dir, 'node_modules')),
    /Registry http:\/\/example.com\/.* was not found in configs/,
    'should throw on finding unconfigured registry',
  )
})
