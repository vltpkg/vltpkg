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

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${this}}`
  },
})

t.test('empty graph and nothing to add', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = new Graph({
    projectRoot,
    mainManifest: {},
    monorepo: Monorepo.maybeLoad(projectRoot),
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
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
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = load({
    projectRoot,
    scurry,
    packageJson,
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
  t.matchSnapshot(specs.add, 'should have no items to add')
})

t.test('empty graph and something to add', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
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
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
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
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = load({
    projectRoot,
    scurry,
    packageJson,
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
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
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = load({
    projectRoot,
    scurry,
    packageJson,
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
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
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
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = load({
    projectRoot,
    scurry,
    packageJson,
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
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
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
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = load({
    projectRoot,
    scurry,
    packageJson,
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
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
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
    const scurry = new PathScurry(projectRoot)
    const packageJson = new PackageJson()
    const graph = load({
      projectRoot,
      scurry,
      packageJson,
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
    const specs = getImporterSpecs({
      add,
      graph,
      remove,
      scurry,
      packageJson,
    })
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
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = new Graph({
    projectRoot: projectRoot,
    mainManifest: {},
    monorepo: Monorepo.maybeLoad(projectRoot),
  })
  const add = new Map([
    // this file dep id does not exist in the given graph
    [
      joinDepIDTuple(['file', 'nested/folder']),
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
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
  // Non-importer file deps should be stored in transientAdd for later injection
  t.matchSnapshot(
    inspect(specs, { depth: Infinity }),
    'should store non-importer file deps in transientAdd',
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
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = load({
    projectRoot,
    scurry,
    packageJson,
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
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
    const scurry = new PathScurry(projectRoot)
    const packageJson = new PackageJson()
    const graph = load({
      projectRoot,
      scurry,
      packageJson,
      monorepo: Monorepo.maybeLoad(projectRoot),
    })
    const add = new Map() as AddImportersDependenciesMap
    const remove = new Map([
      [joinDepIDTuple(['workspace', 'packages/b']), new Set(['a'])],
    ]) as RemoveImportersDependenciesMap
    const specs = getImporterSpecs({
      add,
      graph,
      remove,
      scurry,
      packageJson,
    })
    t.matchSnapshot(
      inspect(specs, { depth: Infinity }),
      'should have root and workspaces nodes with specs to remove',
    )
  },
)

t.test('removing from a non existing importer', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = new Graph({
    projectRoot: projectRoot,
    mainManifest: {},
    monorepo: Monorepo.maybeLoad(projectRoot),
  })
  const add = new Map() as AddImportersDependenciesMap
  // this file dep id does not exist in the given graph
  const remove = new Map([
    [joinDepIDTuple(['file', 'nested/folder']), new Set(['baz'])],
  ]) as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
  // Non-importer file deps should be stored in transientRemove for later processing
  t.matchSnapshot(
    inspect(specs, { depth: Infinity }),
    'should store non-importer file deps in transientRemove',
  )
})

t.test('transientAdd from file-type directory manifest', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      nested: 'file:./nested',
    },
  }
  const nestedManifest = {
    name: 'nested',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0', // <-- unchanged from lockfile
      bar: '^2.0.0', // <-- new
      baz: '^3.0.0', // <-- updating from ^1.0.0 in lockfile
    },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': '{}',
    nested: {
      'package.json': JSON.stringify(nestedManifest),
    },
    node_modules: {
      nested: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['file', 'nested']) +
          '/node_modules/nested',
      ),
      '.vlt-lock.json': JSON.stringify({
        lockfileVersion: 1,
        options: {},
        nodes: {
          [joinDepIDTuple(['file', 'nested'])]: [
            0,
            'nested',
            null,
            null,
            null,
            {
              name: 'nested',
              version: '1.0.0',
              dependencies: {
                foo: '^1.0.0',
                baz: '^1.0.0',
              },
            },
          ],
          [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
            0,
            'foo',
            null,
            null,
            null,
            {
              name: 'foo',
              version: '1.0.0',
            },
          ],
          [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
            0,
            'baz',
            null,
            null,
            null,
            {
              name: 'baz',
              version: '1.0.0',
            },
          ],
        },
        edges: {
          [`${joinDepIDTuple(['file', '.'])} nested`]:
            'prod file:./nested ' +
            joinDepIDTuple(['file', 'nested']),
          [`${joinDepIDTuple(['file', 'nested'])} foo`]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'foo@1.0.0']),
          [`${joinDepIDTuple(['file', 'nested'])} baz`]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'baz@1.0.0']),
        },
      }),
    },
  })
  t.chdir(projectRoot)
  unload('project')
  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const graph = load({
    projectRoot,
    scurry,
    packageJson,
    loadManifests: true,
    skipHiddenLockfile: false,
  })
  const add = new Map() as AddImportersDependenciesMap
  const remove = new Map() as RemoveImportersDependenciesMap
  const specs = getImporterSpecs({
    add,
    graph,
    remove,
    scurry,
    packageJson,
  })
  t.matchSnapshot(
    inspect(specs, { depth: Infinity }),
    'should populate transientAdd from nested directory manifest',
  )
})

t.test(
  'transientRemove from file-type directory with removed edge',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        nested: 'file:./nested',
      },
    }
    // Manifest no longer has foo dependency
    const nestedManifest = {
      name: 'nested',
      version: '1.0.0',
    }
    const projectRoot = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      'vlt.json': '{}',
      nested: {
        'package.json': JSON.stringify(nestedManifest),
      },
      node_modules: {
        '.vlt': {
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
        nested: t.fixture(
          'symlink',
          '.vlt/' +
            joinDepIDTuple(['file', 'nested']) +
            '/node_modules/nested',
        ),
      },
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 1,
        options: {},
        nodes: {
          [joinDepIDTuple(['file', 'nested'])]: [0, 'nested'],
        },
        edges: {
          [`${joinDepIDTuple(['file', '.'])} nested`]:
            'prod file:./nested ' +
            joinDepIDTuple(['file', 'nested']),
          [`${joinDepIDTuple(['file', 'nested'])} foo`]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        },
      }),
    })
    t.chdir(projectRoot)
    unload('project')
    const scurry = new PathScurry(projectRoot)
    const packageJson = new PackageJson()
    const graph = load({
      projectRoot,
      scurry,
      packageJson,
    })

    const add = new Map() as AddImportersDependenciesMap
    const remove = new Map() as RemoveImportersDependenciesMap
    const specs = getImporterSpecs({
      add,
      graph,
      remove,
      scurry,
      packageJson,
    })
    t.matchSnapshot(
      inspect(specs, { depth: Infinity }),
      'should populate transientRemove for edge not in manifest',
    )
  },
)

t.test(
  'transientAdd and transientRemove combined via params',
  async t => {
    const projectRoot = t.testdir({ 'vlt.json': '{}' })
    t.chdir(projectRoot)
    unload('project')
    const scurry = new PathScurry(projectRoot)
    const packageJson = new PackageJson()
    const graph = new Graph({
      projectRoot: projectRoot,
      mainManifest: {},
      monorepo: Monorepo.maybeLoad(projectRoot),
    })
    // Add to non-importer
    const add = new Map([
      [
        joinDepIDTuple(['file', 'nested/folder']),
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
    // Remove from non-importer
    const remove = new Map([
      [joinDepIDTuple(['file', 'other/folder']), new Set(['bar'])],
    ]) as RemoveImportersDependenciesMap

    const specs = getImporterSpecs({
      add,
      graph,
      remove,
      scurry,
      packageJson,
    })
    t.matchSnapshot(
      inspect(specs, { depth: Infinity }),
      'should store both transientAdd and transientRemove from params',
    )
  },
)

t.test(
  'skips non-file type nodes for transient processing',
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
      'vlt.json': '{}',
      node_modules: {
        '.vlt': {
          [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: {
            node_modules: {
              foo: {
                'package.json': JSON.stringify({
                  name: 'foo',
                  version: '1.0.0',
                  dependencies: {
                    bar: '^1.0.0',
                  },
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
    })
    t.chdir(projectRoot)
    unload('project')
    const scurry = new PathScurry(projectRoot)
    const packageJson = new PackageJson()
    const graph = load({
      projectRoot,
      scurry,
      packageJson,
    })
    const add = new Map() as AddImportersDependenciesMap
    const remove = new Map() as RemoveImportersDependenciesMap
    const specs = getImporterSpecs({
      add,
      graph,
      remove,
      scurry,
      packageJson,
    })
    // Registry deps should NOT appear in transientAdd
    t.strictSame(
      specs.transientAdd.size,
      0,
      'should not have transient deps from registry nodes',
    )
    t.strictSame(
      specs.transientRemove.size,
      0,
      'should not have transient remove from registry nodes',
    )
  },
)

t.test(
  'merging remove entries into existing transientRemove',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        nested: 'file:./nested',
      },
    }
    // Manifest has no dependencies left
    const nestedManifest = {
      name: 'nested',
      version: '1.0.0',
      // the nested-direct-dep is defined in the hidden lockfile and is
      // going to be present in the loaded graph but it's missing here
      // so that a transientRemove entry is going to be created for it
    }
    const projectRoot = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      'vlt.json': '{}',
      nested: {
        'package.json': JSON.stringify(nestedManifest),
        node_modules: {
          'nested-direct-dep': t.fixture(
            'symlink',
            '../nested-direct-dep',
          ),
        },
      },
      'nested-direct-dep': {
        'package.json': JSON.stringify({
          name: 'nested-direct-dep',
          version: '1.0.0',
        }),
      },
      node_modules: {
        '.vlt': {
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
        nested: t.fixture('symlink', '../nested'),
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 1,
          options: {},
          nodes: {
            [joinDepIDTuple(['file', 'nested'])]: [
              0,
              'nested',
              null,
              null,
              null,
              {
                name: 'nested',
                version: '1.0.0',
                dependencies: {
                  foo: '^1.0.0',
                  'nested-direct-dep': 'file:../nested-direct-dep',
                },
              },
            ],
            [joinDepIDTuple(['file', 'nested-direct-dep'])]: [
              0,
              'nested-direct-dep',
              null,
              null,
              null,
              {
                name: 'nested-direct-dep',
                version: '1.0.0',
              },
            ],
            [joinDepIDTuple(['file', 'foo'])]: [
              0,
              'foo',
              null,
              null,
              null,
              {
                name: 'foo',
                version: '1.0.0',
              },
            ],
          },
          edges: {
            [`${joinDepIDTuple(['file', '.'])} nested`]:
              'prod file:./nested ' +
              joinDepIDTuple(['file', 'nested']),
            [`${joinDepIDTuple(['file', 'nested'])} foo`]:
              'prod ^1.0.0 ' +
              joinDepIDTuple(['registry', '', 'foo@1.0.0']),
            [`${joinDepIDTuple(['file', 'nested'])} nested-direct-dep`]:
              'prod file:../nested-direct-dep ' +
              joinDepIDTuple(['file', 'nested-direct-dep']),
          },
        }),
      },
    })
    t.chdir(projectRoot)
    unload('project')
    const scurry = new PathScurry(projectRoot)
    const packageJson = new PackageJson()
    const graph = load({
      projectRoot,
      scurry,
      packageJson,
      loadManifests: true,
      skipHiddenLockfile: false,
    })
    const nestedId = joinDepIDTuple(['file', 'nested'])
    const add = new Map([
      [
        joinDepIDTuple(['file', 'nested']),
        new Map([
          [
            'foo',
            asDependency({
              spec: Spec.parse('foo@^1.0.0'),
              type: 'prod',
            }),
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap

    // Provide a remove param that targets same file node that will already
    // have transientRemove entry from manifest comparison (foo edge exists
    // but is no longer in manifest) - this tests the merge branch
    const remove = new Map([
      [nestedId, new Set(['baz'])],
    ]) as RemoveImportersDependenciesMap

    const specs = getImporterSpecs({
      add,
      graph,
      remove,
      scurry,
      packageJson,
    })

    // assert that the transientRemove for the nestedId has expected entries
    const nestedRemoves = specs.transientRemove.get(nestedId)
    t.ok(
      nestedRemoves,
      'should have transientRemove entry for nested',
    )
    t.ok(
      nestedRemoves?.has('baz'),
      'should have baz from remove param',
    )
    t.ok(
      nestedRemoves?.has('nested-direct-dep'),
      'should have nested-direct-dep inferred from graph vs manifest',
    )
    t.notOk(
      nestedRemoves?.has('foo'),
      'foo is not to be removed since it is being added back in add param',
    )
    t.equal(nestedRemoves?.size, 2, 'should have expected items')
  },
)
