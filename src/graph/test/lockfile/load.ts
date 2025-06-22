import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import t from 'tap'
import type { LockfileNode } from '../../src/index.ts'
import {
  load,
  loadHidden,
  loadObject,
} from '../../src/lockfile/load.ts'
import type {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileEdgeValue,
} from '../../src/lockfile/types.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import { GraphModifier } from '../../src/modifiers.ts'

t.cleanSnapshot = s =>
  s.replace(
    /^(\s+)"projectRoot": ".*"/gm,
    '$1"projectRoot": "{ROOT}"',
  )

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
    custom: 'http://example.com',
  },
} satisfies SpecOptions

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
}

const edgeKey = (from: DepIDTuple, to: string): LockfileEdgeKey =>
  `${joinDepIDTuple(from)} ${to}`

t.test('load', async t => {
  // split these out to verify TS will complain about them.
  // otherwise it stops at the first '': '' type error in the object.
  //@ts-expect-error
  const spaceKey: LockfileEdgeKey = ' '
  //@ts-expect-error
  const spaceVal: LockfileEdgeValue = ' '
  const edges: LockfileEdges = {
    [edgeKey(['file', '.'], 'linked')]:
      'prod file:./linked ' + joinDepIDTuple(['file', 'linked']),
    // a spec with spaces, verify it doesn't get confused
    [edgeKey(['file', '.'], 'foo')]:
      'prod ^1.0.0 || 1.2.3 ||  2.3.4 ' +
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    [edgeKey(['file', '.'], 'bar')]:
      'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'bar@1.0.0']),
    [edgeKey(['file', '.'], 'missing')]: 'prod ^1.0.0 MISSING',
    [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
      'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'baz@1.0.0']),
    //@ts-expect-error
    '': '',
    [spaceKey]: spaceVal,
  }
  const lockfileData: LockfileData = {
    options: {
      registries: {
        custom: 'https://registry.example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['file', 'linked'])]: [0, 'linked'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
      [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
        0,
        'bar',
        'sha512-6/deadbeef==',
        'https://registry.example.com/bar/-/bar-1.0.0.tgz',
      ],
      [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
        0,
        'baz',
        null,
        null,
        './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
      ],
    } as Record<DepID, LockfileNode>,
    edges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  const graph = load({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(objectLikeOutput(graph))
})

t.test('loadHidden', async t => {
  // split these out to verify TS will complain about them.
  // otherwise it stops at the first '': '' type error in the object.
  //@ts-expect-error
  const spaceKey: LockfileEdgeKey = ' '
  //@ts-expect-error
  const spaceVal: LockfileEdgeValue = ' '
  const edges: LockfileEdges = {
    [edgeKey(['file', '.'], 'linked')]:
      'prod file:./linked ' + joinDepIDTuple(['file', 'linked']),
    // a spec with spaces, verify it doesn't get confused
    [edgeKey(['file', '.'], 'foo')]:
      'prod ^1.0.0 || 1.2.3 ||  2.3.4 ' +
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    [edgeKey(['file', '.'], 'bar')]:
      'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'bar@1.0.0']),
    [edgeKey(['file', '.'], 'missing')]: 'prod ^1.0.0 MISSING',
    [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
      'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'baz@1.0.0']),
    //@ts-expect-error
    '': '',
    [spaceKey]: spaceVal,
  }
  const lockfileData: LockfileData = {
    options: {
      registries: {
        custom: 'https://registry.example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['file', 'linked'])]: [0, 'linked'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
      [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
        0,
        'bar',
        'sha512-6/deadbeef==',
        'https://registry.example.com/bar/-/bar-1.0.0.tgz',
      ],
      [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
        0,
        'baz',
        null,
        null,
        './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
      ],
    } as Record<DepID, LockfileNode>,
    edges,
  }
  const projectRoot = t.testdir({
    'vlt.json': '{}',
    node_modules: {
      '.vlt-lock.json': JSON.stringify(lockfileData),
    },
  })
  t.chdir(projectRoot)
  unload('project')

  const graph = loadHidden({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(objectLikeOutput(graph))
})

t.test('workspaces', async t => {
  const lockfileData: LockfileData = {
    options: {
      registries: {
        custom: 'http://example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'c@1.0.0'])]: [
        0,
        'c',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
      [joinDepIDTuple(['workspace', 'packages/a'])]: [0, 'a'],
      [joinDepIDTuple(['workspace', 'packages/b'])]: [0, 'b'],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['workspace', 'packages/b'], 'c')]:
        'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'c@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
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
          dependencies: {
            c: '^1.0.0',
          },
        }),
      },
    },
  })
  t.chdir(projectRoot)
  unload('project')

  const graph = load({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(objectLikeOutput(graph))
})

t.test('unknown dep type', async t => {
  const lockfileData: LockfileData = {
    options: {},
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], 'foo')]:
        'unknown 1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  t.throws(
    () =>
      load({
        ...configData,
        projectRoot,
        mainManifest,
      }),
    /Found unsupported dependency type in lockfile/,
    'should throw a dependency type not found',
  )
})

t.test('invalid dep id in edge', async t => {
  const lockfileData: LockfileData = {
    options: {},
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      //@ts-expect-error
      'null foo':
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    },
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  t.throws(
    () =>
      load({
        ...configData,
        projectRoot,
        mainManifest,
      }),
    /Expected dep id/,
    'should throw a missing from edge property',
  )
})

t.test('missing edge `from`', async t => {
  const lockfileData: LockfileData = {
    options: {},
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['registry', '', 'bar@1.2.3'], 'foo')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  t.throws(
    () =>
      load({
        ...configData,
        projectRoot,
        mainManifest,
      }),
    /Edge info missing its `from` node/,
    'should throw a missing from edge property',
  )
})

t.test('load with custom git hosts', async t => {
  const lockfileData: LockfileData = {
    options: {
      'git-hosts': {
        example: 'git+ssh://example.com/$1/$2.git',
      },
      'git-host-archives': {
        example: 'git+ssh://example.com/$1/$2/archive/$3.tar.gz',
      },
    },
    nodes: {
      [joinDepIDTuple(['git', 'example:foo/bar', ''])]: [0, 'foo'],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], 'foo')]:
        'prod example:foo/bar ' +
        joinDepIDTuple(['git', 'example:foo/bar', '']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  const graph = load({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(
    objectLikeOutput(graph),
    'should load custom git hosts graph',
  )
  const [edge] = graph.edges
  t.matchSnapshot(
    edge?.spec,
    'should build specs with custom git hosts',
  )
})

t.test('load with custom scope registry', async t => {
  const lockfileData: LockfileData = {
    options: {
      'scope-registries': {
        '@myscope': 'http://example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['registry', '', '@myscope/foo@1.0.0'])]: [
        0,
        '@myscope/foo',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], '@myscope/foo')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', '@myscope/foo@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  const graph = load({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(
    objectLikeOutput(graph),
    'should load custom scope registry graph',
  )
  const [edge] = graph.edges
  t.matchSnapshot(
    edge?.spec,
    'should build specs with custom scope registry',
  )
})

t.test(
  'option-defined values should overwrite lockfile values',
  async t => {
    const projectRoot = t.testdir({ 'vlt.json': '{}' })
    t.chdir(projectRoot)
    unload('project')
    const mainManifest = { name: 'my-project', version: '1.0.0' }
    const loadOptions = {
      registries: {
        example: 'http://foo',
      },
      mainManifest,
      projectRoot,
    }
    const lockfileData: LockfileData = {
      options: {
        registry: 'http://example.com',
        registries: {
          example: 'http://bar',
          lorem: 'http://lorem',
        },
      },
      nodes: {},
      edges: {},
    }
    t.matchSnapshot(
      JSON.stringify(loadObject(loadOptions, lockfileData), null, 2),
      'should overwrite lockfile values with option-defined values',
    )
  },
)

t.test('missing options object', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const mainManifest = { name: 'my-project', version: '1.0.0' }
  const loadOptions = {
    registries: {
      example: 'http://foo',
    },
    mainManifest,
    projectRoot,
  }
  const lockfileData = {
    nodes: {},
    edges: {},
  } as LockfileData
  t.matchSnapshot(
    JSON.stringify(loadObject(loadOptions, lockfileData), null, 2),
    'should be able to parse lockfile without options object',
  )
})

t.test('skipLoadingNodesOnModifiersChange behavior', async t => {
  const fooDepID = joinDepIDTuple(['registry', '', 'foo@1.0.0'])
  const barDepID = joinDepIDTuple(['registry', '', 'bar@1.0.0'])

  // Helper to create basic lockfile data with a dependency
  const createLockfileData = (
    depName: string,
    depID: DepID,
    modifiersConfig?: Record<string, string>,
  ): LockfileData => ({
    options: {
      modifiers: modifiersConfig,
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'test-project'],
      [depID]: [0, depName],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], depName)]: `prod ^1.0.0 ${depID}`,
    } as LockfileEdges,
  })

  await t.test(
    'modifiers changed - should skip loading dependencies when enabled',
    async t => {
      const projectRoot = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: { ':root > #foo': '^2.0.0' },
        }),
        'vlt-lock.json': JSON.stringify(
          createLockfileData('foo', fooDepID, {
            ':root > #foo': '^1.0.0',
          }),
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData)
      const graph = loadObject(
        {
          ...configData,
          projectRoot,
          mainManifest,
          modifiers,
          skipLoadingNodesOnModifiersChange: true,
        },
        createLockfileData('foo', fooDepID, {
          ':root > #foo': '^1.0.0',
        }),
      )

      t.notOk(
        graph.nodes.get(fooDepID),
        'dependency should not be loaded when modifiers changed and skipLoadingNodesOnModifiersChange is true',
      )
      t.equal(
        graph.nodes.size,
        1,
        'graph should contain only the root node',
      )
    },
  )

  await t.test(
    'modifiers unchanged - should load dependencies when enabled',
    async t => {
      const modifiersConfig = { ':root > #bar': '^1.0.0' }
      const projectRoot = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: modifiersConfig,
        }),
        'vlt-lock.json': JSON.stringify(
          createLockfileData('bar', barDepID, modifiersConfig),
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData)
      const graph = loadObject(
        {
          ...configData,
          projectRoot,
          mainManifest,
          modifiers,
          skipLoadingNodesOnModifiersChange: true,
        },
        createLockfileData('bar', barDepID, modifiersConfig),
      )

      t.ok(
        graph.nodes.get(barDepID),
        'dependency should be loaded when modifiers are unchanged',
      )
      t.equal(
        graph.nodes.size,
        2,
        'graph should contain root and dependency nodes',
      )
    },
  )

  await t.test(
    'skipLoadingNodesOnModifiersChange disabled - should always load',
    async t => {
      const projectRoot = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: { ':root > #foo': '^2.0.0' },
        }),
        'vlt-lock.json': JSON.stringify(
          createLockfileData('foo', fooDepID, {
            ':root > #foo': '^1.0.0',
          }),
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData)
      const graph = loadObject(
        {
          ...configData,
          projectRoot,
          mainManifest,
          modifiers,
          skipLoadingNodesOnModifiersChange: false,
        },
        createLockfileData('foo', fooDepID, {
          ':root > #foo': '^1.0.0',
        }),
      )

      t.ok(
        graph.nodes.get(fooDepID),
        'dependency should be loaded even when modifiers changed and skipLoadingNodesOnModifiersChange is false',
      )
      t.equal(
        graph.nodes.size,
        2,
        'graph should contain root and dependency nodes',
      )
    },
  )

  await t.test(
    'missing vlt.json but existing lockfile modifiers - should skip loading',
    async t => {
      const projectRoot = t.testdir({
        // No vlt.json file
        'vlt-lock.json': JSON.stringify(
          createLockfileData('foo', fooDepID, {
            ':root > #foo': '^1.0.0',
          }),
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      // modifiers will be undefined since no vlt.json exists
      const modifiers = GraphModifier.maybeLoad(configData)
      const graph = loadObject(
        {
          ...configData,
          projectRoot,
          mainManifest,
          modifiers,
          skipLoadingNodesOnModifiersChange: true,
        },
        createLockfileData('foo', fooDepID, {
          ':root > #foo': '^1.0.0',
        }),
      )

      t.notOk(
        graph.nodes.get(fooDepID),
        'dependency should not be loaded when vlt.json is missing but lockfile has modifiers',
      )
      t.equal(
        graph.nodes.size,
        1,
        'graph should contain only the root node',
      )
    },
  )

  await t.test(
    'missing lockfile modifiers but existing vlt.json modifiers - should skip loading',
    async t => {
      const projectRoot = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: { ':root > #bar': '^1.0.0' },
        }),
        'vlt-lock.json': JSON.stringify(
          createLockfileData('bar', barDepID, undefined), // No modifiers in lockfile
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData)
      const graph = loadObject(
        {
          ...configData,
          projectRoot,
          mainManifest,
          modifiers,
          skipLoadingNodesOnModifiersChange: true,
        },
        createLockfileData('bar', barDepID, undefined),
      )

      t.notOk(
        graph.nodes.get(barDepID),
        'dependency should not be loaded when lockfile modifiers are missing but vlt.json has modifiers',
      )
      t.equal(
        graph.nodes.size,
        1,
        'graph should contain only the root node',
      )
    },
  )

  await t.test(
    'both vlt.json and lockfile missing modifiers - should load',
    async t => {
      const projectRoot = t.testdir({
        'vlt.json': '{}', // No modifiers - this creates an empty modifiers object
        'vlt-lock.json': JSON.stringify(
          createLockfileData('foo', fooDepID, undefined), // No modifiers - this is undefined
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData) // This loads empty modifiers from vlt.json
      const graph = loadObject(
        {
          ...configData,
          projectRoot,
          mainManifest,
          modifiers,
          skipLoadingNodesOnModifiersChange: true,
        },
        createLockfileData('foo', fooDepID, undefined),
      )

      t.ok(
        graph.nodes.get(fooDepID),
        'dependency should be loaded when both files have no modifiers (they match as empty objects)',
      )
      t.equal(
        graph.nodes.size,
        2,
        'graph should contain root and dependency nodes',
      )
    },
  )

  await t.test(
    'complex modifiers matching - should load dependencies',
    async t => {
      const complexModifiers = {
        ':root > #foo': '^1.0.0',
        ':root > #bar > #baz': '^2.0.0',
        '#qux': 'latest',
      }
      const projectRoot = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: complexModifiers,
        }),
        'vlt-lock.json': JSON.stringify(
          createLockfileData('foo', fooDepID, complexModifiers),
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData)
      const graph = loadObject(
        {
          ...configData,
          projectRoot,
          mainManifest,
          modifiers,
          skipLoadingNodesOnModifiersChange: true,
        },
        createLockfileData('foo', fooDepID, complexModifiers),
      )

      t.ok(
        graph.nodes.get(fooDepID),
        'dependency should be loaded when complex modifiers match',
      )
      t.equal(
        graph.nodes.size,
        2,
        'graph should contain root and dependency nodes',
      )
    },
  )

  await t.test(
    'complex modifiers not matching - should skip loading',
    async t => {
      const vltModifiers = {
        ':root > #foo': '^1.0.0',
        ':root > #bar > #baz': '^2.0.0',
        '#qux': 'latest',
      }
      const lockfileModifiers = {
        ':root > #foo': '^1.0.0',
        ':root > #bar > #baz': '^3.0.0', // Different version
        '#qux': 'latest',
      }
      const projectRoot = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: vltModifiers,
        }),
        'vlt-lock.json': JSON.stringify(
          createLockfileData('bar', barDepID, lockfileModifiers),
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData)
      const graph = loadObject(
        {
          ...configData,
          projectRoot,
          mainManifest,
          modifiers,
          skipLoadingNodesOnModifiersChange: true,
        },
        createLockfileData('bar', barDepID, lockfileModifiers),
      )

      t.notOk(
        graph.nodes.get(barDepID),
        'dependency should not be loaded when complex modifiers do not match',
      )
      t.equal(
        graph.nodes.size,
        1,
        'graph should contain only the root node',
      )
    },
  )

  await t.test(
    'using load() function with skipLoadingNodesOnModifiersChange',
    async t => {
      const projectRoot = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: { ':root > #test': '^2.0.0' },
        }),
        'vlt-lock.json': JSON.stringify(
          createLockfileData(
            'test',
            joinDepIDTuple(['registry', '', 'test@1.0.0']),
            {
              ':root > #test': '^1.0.0',
            },
          ),
        ),
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData)
      const graph = load({
        ...configData,
        projectRoot,
        mainManifest,
        modifiers,
        skipLoadingNodesOnModifiersChange: true,
      })

      t.notOk(
        graph.nodes.get(
          joinDepIDTuple(['registry', '', 'test@1.0.0']),
        ),
        'dependency should not be loaded when using load() function with changed modifiers',
      )
      t.equal(
        graph.nodes.size,
        1,
        'graph should contain only the root node',
      )
    },
  )

  await t.test(
    'using loadHidden() function with skipLoadingNodesOnModifiersChange',
    async t => {
      const testDepID = joinDepIDTuple([
        'registry',
        '',
        'hidden-test@1.0.0',
      ])
      const projectRoot = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: { ':root > #hidden-test': '^2.0.0' },
        }),
        node_modules: {
          '.vlt-lock.json': JSON.stringify(
            createLockfileData('hidden-test', testDepID, {
              ':root > #hidden-test': '^1.0.0',
            }),
          ),
        },
      })
      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier(configData)
      const graph = loadHidden({
        ...configData,
        projectRoot,
        mainManifest,
        modifiers,
        skipLoadingNodesOnModifiersChange: true,
      })

      t.notOk(
        graph.nodes.get(testDepID),
        'dependency should not be loaded when using loadHidden() function with changed modifiers',
      )
      t.equal(
        graph.nodes.size,
        1,
        'graph should contain only the root node',
      )
    },
  )
})
