import { asDepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import { inspect } from 'node:util'
import t from 'tap'
import { load } from '../../src/actual/load.js'
import { asDependency } from '../../src/dependencies.js'
import { Graph } from '../../src/graph.js'
import { getImporterSpecs } from '../../src/ideal/get-importer-specs.js'

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')
Object.assign(Spec.prototype, {
  [kCustomInspect]() {
    return `Spec {${this}}`
  },
})

t.test('empty graph and nothing to add', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    mainManifest: {},
  })
  const add = new Map()
  const remove = new Map()
  const specs = getImporterSpecs({ add, graph, remove })
  t.strictSame(specs.add.size, 0, 'should have no items to add')
})

t.test('empty graph with workspaces and nothing to add', async t => {
  const mainManifest = { name: 'my-project', version: '1.0.0' }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    packages: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
        }),
      },
    },
    'vlt-workspaces.json': JSON.stringify({
      packages: ['./packages/*'],
    }),
  })
  const graph = load({ projectRoot })
  const add = new Map()
  const remove = new Map()
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(specs.add, 'should have no items to add')
})

t.test('empty graph and something to add', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    mainManifest: {},
  })
  const add = new Map([
    [
      asDepID('file;.'),
      new Map(
        Object.entries({
          bar: asDependency({
            spec: Spec.parse('bar@custom:bar@^1.1.1'),
            type: 'dev',
          }),
          foo: asDependency({
            spec: Spec.parse('foo@^1.1.1'),
            type: 'prod',
          }),
        }),
      ),
    ],
  ])
  const remove = new Map()
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(
    inspect(specs.add, { depth: Infinity }),
    'should result in only added specs',
  )
})

t.test('graph specs and nothing to add', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
    devDependencies: {
      bar: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
  })
  const graph = load({ projectRoot })
  const add = new Map()
  const remove = new Map()
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(
    inspect(specs.add, { depth: Infinity }),
    'should have root specs added only',
  )
})

t.test('graph specs and new things to add', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
  })
  const graph = load({ projectRoot })
  const add = new Map([
    [
      asDepID('file;.'),
      new Map(
        Object.entries({
          bar: asDependency({
            spec: Spec.parse('bar@^1.0.0'),
            type: 'dev',
          }),
          baz: asDependency({
            spec: Spec.parse('baz@^1.0.0'),
            type: 'prod',
          }),
        }),
      ),
    ],
  ])
  const remove = new Map()
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(
    inspect(specs.add, { depth: Infinity }),
    'should have root specs along with the added ones',
  )
})

t.test('graph specs and something to update', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
  })
  const graph = load({ projectRoot })
  const add = new Map([
    [
      asDepID('file;.'),
      new Map(
        Object.entries({
          foo: asDependency({
            spec: Spec.parse('foo@^2.0.0'),
            type: 'prod',
          }),
        }),
      ),
    ],
  ])
  const remove = new Map()
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(
    inspect(specs.add, { depth: Infinity }),
    'should have the updated root spec',
  )
})

t.test(
  'graph specs with workspaces and something to add',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
            devDependencies: {
              bar: '^1.0.0',
            },
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
            version: '1.0.0',
            dependencies: {
              a: 'workspace:*',
            },
          }),
        },
      },
      'vlt-workspaces.json': JSON.stringify({
        packages: ['./packages/*'],
      }),
    })
    const graph = load({ projectRoot })
    const add = new Map([
      [
        asDepID('file;.'),
        new Map(
          Object.entries({
            bar: asDependency({
              spec: Spec.parse('bar@^2.0.0'),
              type: 'prod',
            }),
          }),
        ),
      ],
      [
        asDepID('workspace;packages%2Fa'),
        new Map(
          Object.entries({
            baz: asDependency({
              spec: Spec.parse('baz@^1.0.0'),
              type: 'prod',
            }),
          }),
        ),
      ],
      [
        asDepID('workspace;packages%2Fb'),
        new Map(
          Object.entries({
            baz: asDependency({
              spec: Spec.parse('baz@^1.0.0'),
              type: 'prod',
            }),
          }),
        ),
      ],
    ])
    const remove = new Map()
    const specs = getImporterSpecs({ add, graph, remove })
    t.matchSnapshot(
      inspect(specs.add, { depth: Infinity }),
      'should have root and workspaces nodes with specs to add',
    )
  },
)

t.test('adding to a non existing importer', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    mainManifest: {},
  })
  const add = new Map([
    // this workspace id does not exist in the given graph
    [
      asDepID('workspace;packages%2Fa'),
      new Map(
        Object.entries({
          baz: asDependency({
            spec: Spec.parse('baz@^1.0.0'),
            type: 'prod',
          }),
        }),
      ),
    ],
  ])
  const remove = new Map()
  t.throws(
    () => getImporterSpecs({ add, graph, remove }),
    /Not an importer/,
    'should throw an bad importer id error',
  )
})

t.test('graph specs and something to remove', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      bar: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    node_modules: {
      '.vlt': {
        ';;bar@1.0.0': {
          node_modules: {
            bar: {
              'package.json': JSON.stringify({
                name: 'bar',
                version: '1.0.0',
              }),
            },
          },
        },
        ';;foo@1.0.0': {
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
      bar: t.fixture('symlink', '.vlt/;;bar@1.0.0/node_modules/bar'),
      foo: t.fixture('symlink', '.vlt/;;foo@1.0.0/node_modules/foo'),
    },
  })
  const graph = load({ projectRoot })
  const add = new Map()
  const remove = new Map()
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(
    inspect(specs, { depth: Infinity }),
    'should removed entries missing from manifest file',
  )
})

t.test(
  'graph specs with workspaces and somethings to remove',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      node_modules: {
        '.vlt': {
          ';;bar@1.0.0': {
            node_modules: {
              bar: {
                'package.json': JSON.stringify({
                  name: 'bar',
                  version: '1.0.0',
                }),
              },
            },
          },
          ';;foo@1.0.0': {
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
        foo: t.fixture(
          'symlink',
          '.vlt/;;foo@1.0.0/node_modules/foo',
        ),
      },
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
          }),
          node_modules: {
            bar: t.fixture(
              'symlink',
              '../../../node_modules/.vlt/;;bar@1.0.0/node_modules/bar',
            ),
          },
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
            version: '1.0.0',
            dependencies: {
              a: 'workspace:*',
            },
          }),
          node_modules: {
            a: t.fixture('symlink', '../../a'),
          },
        },
      },
      'vlt-workspaces.json': JSON.stringify({
        packages: ['./packages/*'],
      }),
    })
    const graph = load({ projectRoot })
    const add = new Map()
    const remove = new Map([
      [asDepID('workspace;packages%2Fb'), new Set(['a'])],
    ])
    const specs = getImporterSpecs({ add, graph, remove })
    t.matchSnapshot(
      inspect(specs, { depth: Infinity }),
      'should have root and workspaces nodes with specs to remove',
    )
  },
)
