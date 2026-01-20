import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { PackageJson } from '@vltpkg/package-json'
import t from 'tap'
import type { LockfileNode } from '../../src/index.ts'
import { Graph } from '../../src/graph.ts'
import {
  load,
  loadHidden,
  loadObject,
} from '../../src/lockfile/load.ts'
import { loadEdges } from '../../src/lockfile/load-edges.ts'
import type {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileEdgeValue,
} from '../../src/lockfile/types.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'

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
    lockfileVersion: 1,
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
    lockfileVersion: 1,
    options: {
      registries: {
        custom: 'https://registry.example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [
        0,
        'my-project',
        // integrity
        null,
        // resolved
        null,
        // location
        null,
        // manifest
        {
          name: 'my-project',
          version: '1.0.0',
          // placeholder: add additional fields as needed for test
        },
      ],
      [joinDepIDTuple(['file', 'linked'])]: [
        0,
        'linked',
        null,
        null,
        null,
        {
          name: 'linked',
          version: '1.0.0',
        },
      ],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        null,
        null,
        {
          name: 'foo',
          version: '1.0.0',
        },
      ],
      [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
        0,
        'bar',
        'sha512-6/deadbeef==',
        'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        null,
        {
          name: 'bar',
          version: '1.0.0',
        },
      ],
      [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
        0,
        'baz',
        null,
        null,
        './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
        {
          name: 'baz',
          version: '1.0.0',
        },
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
    lockfileVersion: 1,
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
    lockfileVersion: 1,
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
    lockfileVersion: 1,
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
    lockfileVersion: 1,
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
    lockfileVersion: 1,
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
    lockfileVersion: 1,
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
      lockfileVersion: 1,
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
    lockfileVersion: 1,
    options: {},
    nodes: {},
    edges: {},
  } as LockfileData
  t.matchSnapshot(
    JSON.stringify(loadObject(loadOptions, lockfileData), null, 2),
    'should be able to parse lockfile without options object',
  )
})

t.test('load with optimization path for large graphs', async t => {
  const nodes: LockfileData['nodes'] = {}
  const edges: LockfileData['edges'] = {}

  // Add root
  const mainDepId = joinDepIDTuple(['file', '.'])
  nodes[mainDepId] = [
    0,
    'my-project',
    null,
    null,
    null,
    {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {},
    },
  ]

  // Add many nodes and edges to trigger optimization code paths (>50)
  for (let i = 0; i < 60; i++) {
    const packageName = `opt-pkg-${i}`
    const depId = joinDepIDTuple([
      'registry',
      '',
      `${packageName}@1.0.${i}`,
    ])

    nodes[depId] = [
      0,
      packageName,
      null,
      null,
      null,
      {
        name: packageName,
        version: `1.0.${i}`,
        dependencies: {},
      },
    ]

    edges[`${mainDepId} ${packageName}`] = `prod ^1.0.${i} ${depId}`
  }

  const lockfileData: LockfileData = {
    lockfileVersion: 1,
    options: { registry: 'https://registry.npmjs.org/' },
    nodes,
    edges,
  }

  const graph = loadObject(
    {
      projectRoot: t.testdirName,
      mainManifest: {
        name: 'my-project',
        version: '1.0.0',
      },
      packageJson: new PackageJson(),
    },
    lockfileData,
  )

  t.equal(
    graph.nodes.size,
    61,
    'should load all nodes using optimization path',
  )
  t.equal(
    graph.edges.size,
    60,
    'should load all edges using optimization path',
  )

  // Verify optimization was used by checking some nodes exist
  t.ok(graph.nodes.has(mainDepId), 'root node exists')
  t.ok(
    graph.nodes.has(
      joinDepIDTuple(['registry', '', 'opt-pkg-0@1.0.0']),
    ),
    'first optimized node exists',
  )
})

t.test(
  'loadEdges with optimization path for large graphs',
  async t => {
    const edges: LockfileData['edges'] = {}

    // Create a graph with pre-existing nodes
    const graph = new Graph({
      mainManifest: {
        name: 'my-project',
        version: '1.0.0',
      },
      projectRoot: t.testdirName,
    })

    const mainDepId = joinDepIDTuple(['file', '.'])

    // Add many edges to trigger optimization code paths (>50)
    for (let i = 0; i < 60; i++) {
      const packageName = `edge-pkg-${i}`
      const depId = joinDepIDTuple([
        'registry',
        '',
        `${packageName}@1.0.${i}`,
      ])

      // Add nodes to graph first
      graph.addNode(depId, {
        name: packageName,
        version: `1.0.${i}`,
        dependencies: {},
      })

      edges[`${mainDepId} ${packageName}`] = `prod ^1.0.${i} ${depId}`
    }

    // Test direct loadEdges call
    loadEdges(graph, edges, {
      registry: 'https://registry.npmjs.org/',
    })

    t.equal(
      graph.edges.size,
      60,
      'should load all edges using optimization path',
    )

    // Verify some edges exist
    const firstEdge = [...graph.edges][0]
    t.ok(firstEdge, 'first edge exists')
    if (firstEdge) {
      t.equal(
        firstEdge.spec.name,
        'edge-pkg-0',
        'edge has correct spec name',
      )
    }
  },
)

t.test('load platform data for optional dependencies', async t => {
  const projectRoot = t.testdir()
  const packageJson = new PackageJson()

  const lockfileData: LockfileData = {
    lockfileVersion: 1,
    options: configData,
    nodes: {
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        null,
        null,
        null,
        null,
        null,
      ] as LockfileNode,
      [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
        1, // optional flag
        'bar',
        null,
        null,
        null,
        null,
        null,
        {
          engines: { node: '>=16' },
          os: 'linux',
          cpu: ['x64'],
        },
      ] as LockfileNode,
      [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
        1, // optional flag
        'baz',
        null,
        null,
        null,
        null,
        null,
        {
          engines: { node: '>=14' },
          os: ['linux', 'darwin'],
          cpu: ['x64', 'arm64'],
        },
      ] as LockfileNode,
    },
    edges: {
      [`${joinDepIDTuple(['file', '.'])} foo`]:
        `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'foo@1.0.0'])}` as LockfileEdgeValue,
      [`${joinDepIDTuple(['file', '.'])} bar`]:
        `optional ^1.0.0 ${joinDepIDTuple(['registry', '', 'bar@1.0.0'])}` as LockfileEdgeValue,
      [`${joinDepIDTuple(['file', '.'])} baz`]:
        `optional ^1.0.0 ${joinDepIDTuple(['registry', '', 'baz@1.0.0'])}` as LockfileEdgeValue,
    },
  }

  const graph = loadObject(
    {
      ...configData,
      mainManifest,
      projectRoot,
      packageJson,
    },
    lockfileData,
  )

  // Verify nodes are loaded correctly
  const foo = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'foo@1.0.0']),
  )
  t.ok(foo, 'foo node exists')
  t.notOk(foo?.platform, 'foo does not have platform data')
  t.equal(foo?.optional, false, 'foo is not optional')

  const bar = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'bar@1.0.0']),
  )
  t.ok(bar, 'bar node exists')
  t.ok(bar?.platform, 'bar has platform data')
  t.same(
    bar?.platform,
    {
      engines: { node: '>=16' },
      os: 'linux',
      cpu: ['x64'],
    },
    'bar platform data is loaded correctly',
  )
  t.equal(bar?.optional, true, 'bar is optional')

  const baz = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'baz@1.0.0']),
  )
  t.ok(baz, 'baz node exists')
  t.ok(baz?.platform, 'baz has platform data')
  t.same(
    baz?.platform,
    {
      engines: { node: '>=14' },
      os: ['linux', 'darwin'],
      cpu: ['x64', 'arm64'],
    },
    'baz platform data is loaded correctly',
  )
  t.equal(baz?.optional, true, 'baz is optional')
})

t.test('load with peerSetHash in extra parameter', async t => {
  const projectRoot = t.testdir()
  const packageJson = new PackageJson()

  const lockfileData: LockfileData = {
    lockfileVersion: 1,
    options: configData,
    nodes: {
      // Node with modifier only
      [joinDepIDTuple([
        'registry',
        '',
        'with-modifier@1.0.0',
        ':root > #with-modifier',
      ])]: [
        0,
        'with-modifier',
        null,
        null,
        null,
        { name: 'with-modifier', version: '1.0.0' },
      ] as LockfileNode,
      // Node with peerSetHash only
      [joinDepIDTuple([
        'registry',
        '',
        'with-peer@1.0.0',
        'peer.hash123',
      ])]: [
        0,
        'with-peer',
        null,
        null,
        null,
        { name: 'with-peer', version: '1.0.0' },
      ] as LockfileNode,
      // Node with both modifier and peerSetHash
      [joinDepIDTuple([
        'registry',
        '',
        'with-both@1.0.0',
        ':root > #with-bothpeer.hash456',
      ])]: [
        0,
        'with-both',
        null,
        null,
        null,
        { name: 'with-both', version: '1.0.0' },
      ] as LockfileNode,
      // Node with neither
      [joinDepIDTuple(['registry', '', 'regular@1.0.0'])]: [
        0,
        'regular',
        null,
        null,
        null,
        { name: 'regular', version: '1.0.0' },
      ] as LockfileNode,
    },
    edges: {
      [`${joinDepIDTuple(['file', '.'])} with-modifier`]:
        `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'with-modifier@1.0.0', ':root > #with-modifier'])}` as LockfileEdgeValue,
      [`${joinDepIDTuple(['file', '.'])} with-peer`]:
        `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'with-peer@1.0.0', 'peer.hash123'])}` as LockfileEdgeValue,
      [`${joinDepIDTuple(['file', '.'])} with-both`]:
        `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'with-both@1.0.0', ':root > #with-bothpeer.hash456'])}` as LockfileEdgeValue,
      [`${joinDepIDTuple(['file', '.'])} regular`]:
        `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'regular@1.0.0'])}` as LockfileEdgeValue,
    },
  }

  const graph = loadObject(
    {
      ...configData,
      mainManifest,
      projectRoot,
      packageJson,
    },
    lockfileData,
  )

  // Verify modifier-only node
  const withModifier = graph.nodes.get(
    joinDepIDTuple([
      'registry',
      '',
      'with-modifier@1.0.0',
      ':root > #with-modifier',
    ]),
  )
  t.ok(withModifier, 'with-modifier node exists')
  t.equal(
    withModifier?.modifier,
    ':root > #with-modifier',
    'has modifier',
  )
  t.notOk(withModifier?.peerSetHash, 'no peerSetHash')

  // Verify peerSetHash-only node
  const withPeer = graph.nodes.get(
    joinDepIDTuple([
      'registry',
      '',
      'with-peer@1.0.0',
      'peer.hash123',
    ]),
  )
  t.ok(withPeer, 'with-peer node exists')
  t.notOk(withPeer?.modifier, 'no modifier')
  t.equal(withPeer?.peerSetHash, 'peer.hash123', 'has peerSetHash')

  // Verify node with both
  const withBoth = graph.nodes.get(
    joinDepIDTuple([
      'registry',
      '',
      'with-both@1.0.0',
      ':root > #with-bothpeer.hash456',
    ]),
  )
  t.ok(withBoth, 'with-both node exists')
  t.equal(withBoth?.modifier, ':root > #with-both', 'has modifier')
  t.equal(withBoth?.peerSetHash, 'peer.hash456', 'has peerSetHash')

  // Verify regular node
  const regular = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'regular@1.0.0']),
  )
  t.ok(regular, 'regular node exists')
  t.notOk(regular?.modifier, 'no modifier')
  t.notOk(regular?.peerSetHash, 'no peerSetHash')
})

t.test('lockfile version validation', async t => {
  const projectRoot = t.testdir()
  const packageJson = new PackageJson()
  const { LOCKFILE_VERSION } = await t.mockImport<
    typeof import('../../src/lockfile/types.ts')
  >('../../src/lockfile/types.ts')

  t.test('load with matching version succeeds', async t => {
    const lockfileData: LockfileData = {
      lockfileVersion: LOCKFILE_VERSION,
      options: {},
      nodes: {},
      edges: {},
    }
    const graph = loadObject(
      {
        ...configData,
        mainManifest,
        projectRoot,
        packageJson,
      },
      lockfileData,
    )
    t.ok(graph, 'graph loaded successfully')
  })

  t.test('load with missing version throws error', async t => {
    const lockfileData: Omit<LockfileData, 'lockfileVersion'> & {
      lockfileVersion?: number
    } = {
      options: {},
      nodes: {},
      edges: {},
    }
    t.throws(
      () =>
        loadObject(
          {
            ...configData,
            mainManifest,
            projectRoot,
            packageJson,
          },
          lockfileData,
        ),
      {
        message: 'Missing lockfile version',
        cause: {
          code: 'ELOCKFILEVERSION',
          found: undefined,
          wanted: LOCKFILE_VERSION,
        },
      },
      'throws with missing version',
    )
  })

  t.test(
    'load with older version throws ELOCKFILEVERSION',
    async t => {
      const lockfileData: LockfileData = {
        lockfileVersion: LOCKFILE_VERSION - 1,
        options: {},
        nodes: {},
        edges: {},
      }
      t.throws(
        () =>
          loadObject(
            {
              ...configData,
              mainManifest,
              projectRoot,
              packageJson,
            },
            lockfileData,
          ),
        {
          message: 'Unsupported lockfile version',
          cause: {
            code: 'ELOCKFILEVERSION',
            found: LOCKFILE_VERSION - 1,
            wanted: LOCKFILE_VERSION,
          },
        },
        'throws with older version',
      )
    },
  )

  t.test(
    'load with newer version throws ELOCKFILEVERSION',
    async t => {
      const lockfileData: LockfileData = {
        lockfileVersion: LOCKFILE_VERSION + 1,
        options: {},
        nodes: {},
        edges: {},
      }
      t.throws(
        () =>
          loadObject(
            {
              ...configData,
              mainManifest,
              projectRoot,
              packageJson,
            },
            lockfileData,
          ),
        {
          message: 'Unsupported lockfile version',
          cause: {
            code: 'ELOCKFILEVERSION',
            found: LOCKFILE_VERSION + 1,
            wanted: LOCKFILE_VERSION,
          },
        },
        'throws with newer version',
      )
    },
  )
})
