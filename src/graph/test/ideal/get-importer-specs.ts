import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { inspect } from 'node:util'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { load } from '../../src/actual/load.ts'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../../src/dependencies.ts'
import { asDependency } from '../../src/dependencies.ts'
import { Edge } from '../../src/edge.ts'
import { Graph } from '../../src/graph.ts'
import { getImporterSpecs } from '../../src/ideal/get-importer-specs.ts'
import type { GraphModifier } from '../../src/modifiers.ts'

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${this}}`
  },
})

t.test('empty graph and nothing to add', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    mainManifest: {},
    monorepo: Monorepo.maybeLoad(projectRoot),
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
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
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
  })
  t.chdir(projectRoot)
  unload('project')
  const graph = load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(specs.add, 'should have no items to add')
})

t.test('empty graph and something to add', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    mainManifest: {},
    monorepo: Monorepo.maybeLoad(projectRoot),
  })
  const add = new Map([
    [
      joinDepIDTuple(['file', '.']),
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
  ]) as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
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
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')
  const graph = load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
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
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')
  const graph = load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const add = new Map([
    [
      joinDepIDTuple(['file', '.']),
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
  ]) as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
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
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')
  const graph = load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const add = new Map([
    [
      joinDepIDTuple(['file', '.']),
      new Map(
        Object.entries({
          foo: asDependency({
            spec: Spec.parse('foo@^2.0.0'),
            type: 'prod',
          }),
        }),
      ),
    ],
  ]) as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(
    inspect(specs.add, { depth: Infinity }),
    'should have the updated root spec',
  )
})

t.test('installing over a dangling edge', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')
  const graph = load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  // this simulates a dangling edge, representing a missing node
  graph.mainImporter.edgesOut.set(
    'foo',
    new Edge('prod', Spec.parse('foo@^1.0.0'), graph.mainImporter),
  )
  const add = new Map([
    [
      joinDepIDTuple(['file', '.']),
      new Map(
        Object.entries({
          foo: asDependency({
            spec: Spec.parse('foo@^1.0.0'),
            type: 'prod',
          }),
        }),
      ),
    ],
  ]) as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({ add, graph, remove })
  t.matchSnapshot(
    inspect(specs, { depth: Infinity }),
    'should add the missing dep',
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
      'vlt.json': JSON.stringify({
        workspaces: {
          packages: ['./packages/*'],
        },
      }),
    })
    t.chdir(projectRoot)
    unload('project')
    const graph = load({
      projectRoot,
      scurry: new PathScurry(projectRoot),
      packageJson: new PackageJson(),
      monorepo: Monorepo.maybeLoad(projectRoot),
    })
    const add = new Map([
      [
        joinDepIDTuple(['file', '.']),
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
        joinDepIDTuple(['workspace', 'packages/a']),
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
        joinDepIDTuple(['workspace', 'packages/b']),
        new Map(
          Object.entries({
            baz: asDependency({
              spec: Spec.parse('baz@^1.0.0'),
              type: 'prod',
            }),
          }),
        ),
      ],
    ]) as AddImportersDependenciesMap
    const remove = new Map() as RemoveImportersDependenciesMap
    const specs = getImporterSpecs({ add, graph, remove })
    t.matchSnapshot(
      inspect(specs.add, { depth: Infinity }),
      'should have root and workspaces nodes with specs to add',
    )
  },
)

t.test('adding to a non existing importer', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot: projectRoot,
    mainManifest: {},
    monorepo: Monorepo.maybeLoad(projectRoot),
  })
  const add = new Map([
    // this workspace id does not exist in the given graph
    [
      joinDepIDTuple(['workspace', 'packages/a']),
      new Map(
        Object.entries({
          baz: asDependency({
            spec: Spec.parse('baz@^1.0.0'),
            type: 'prod',
          }),
        }),
      ),
    ],
  ]) as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
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
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: {
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
      bar: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', '', 'bar@1.0.0']) +
          '/node_modules/bar',
      ),
      foo: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']) +
          '/node_modules/foo',
      ),
    },
  })
  const graph = load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
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
          [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: {
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
          '.vlt/' +
            joinDepIDTuple(['registry', '', 'foo@1.0.0']) +
            '/node_modules/foo',
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
              '../../../node_modules/.vlt/' +
                joinDepIDTuple(['registry', '', 'bar@1.0.0']) +
                '/node_modules/bar',
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
      'vlt.json': JSON.stringify({
        workspaces: {
          packages: ['./packages/*'],
        },
      }),
    })
    t.chdir(projectRoot)
    unload('project')
    const graph = load({
      projectRoot,
      scurry: new PathScurry(projectRoot),
      packageJson: new PackageJson(),
      monorepo: Monorepo.maybeLoad(projectRoot),
    })
    const add = new Map() as AddImportersDependenciesMap
    const remove = new Map([
      [joinDepIDTuple(['workspace', 'packages/b']), new Set(['a'])],
    ]) as RemoveImportersDependenciesMap
    const specs = getImporterSpecs({ add, graph, remove })
    t.matchSnapshot(
      inspect(specs, { depth: Infinity }),
      'should have root and workspaces nodes with specs to remove',
    )
  },
)

t.test('graph specs with modifiers', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      bar: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  // Create a graph manually instead of loading from files
  const graph = new Graph({
    projectRoot,
    mainManifest,
  })

  // Create nodes and edges manually instead of loading from filesystem
  const fooSpec = Spec.parse('foo', '^1.0.0')
  const barSpec = Spec.parse('bar', '^1.0.0')

  // Create foo and bar nodes with manifests
  const fooManifest = { name: 'foo', version: '1.0.0' }
  const barManifest = { name: 'bar', version: '1.0.0' }

  // Place packages in the graph with proper nodes
  graph.placePackage(graph.mainImporter, 'prod', fooSpec, fooManifest)
  graph.placePackage(graph.mainImporter, 'prod', barSpec, barManifest)

  // Verify nodes and edges are properly set up
  t.ok(
    graph.mainImporter.edgesOut.get('foo')?.to,
    'should have edge to foo',
  )
  t.ok(
    graph.mainImporter.edgesOut.get('bar')?.to,
    'should have edge to bar',
  )

  const mockModifier = {
    maybeHasModifier: (depName: string) => depName === 'foo',
  } as unknown as GraphModifier

  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    modifiers: mockModifier,
  })

  // Check that the 'foo' dependency is in the check map but not 'bar'
  const checkDeps = specs.check.get(joinDepIDTuple(['file', '.']))
  t.ok(checkDeps, 'should have check deps for root')
  t.ok(checkDeps?.has('foo'), 'should have foo in check deps')
  t.notOk(checkDeps?.has('bar'), 'should not have bar in check deps')

  // Instead of comparing the entire complex object, just check for the structure
  const checkDepKeys = [...specs.check.keys()]
  t.equal(checkDepKeys.length, 1, 'should have one importer in check')
  t.equal(
    checkDepKeys[0],
    joinDepIDTuple(['file', '.']),
    'should have the main importer as the key',
  )

  const fooDepEntry = checkDeps?.get('foo')
  t.ok(fooDepEntry, 'foo dependency entry should exist')
  t.equal(
    fooDepEntry?.type,
    'prod',
    'should have correct dependency type',
  )
  t.ok(
    fooDepEntry?.spec.name === 'foo',
    'should have correct dependency name in spec',
  )
})

t.test('graph specs with no modifiers', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')
  const graph = load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })

  const mockModifier = {
    maybeHasModifier: () => false,
  } as unknown as GraphModifier

  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    modifiers: mockModifier,
  })

  const checkDeps = specs.check.get(joinDepIDTuple(['file', '.']))
  t.ok(checkDeps, 'should have empty check deps for root')
  t.equal(checkDeps?.size, 0, 'should have no deps to check')
})
