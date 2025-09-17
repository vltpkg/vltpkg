import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { Edge } from '../../src/edge.ts'
import { Graph } from '../../src/graph.ts'
import {
  lockfileData,
  save,
  saveHidden,
} from '../../src/lockfile/save.ts'
import { GraphModifier } from '../../src/modifiers.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
    custom: 'http://example.com',
  },
} satisfies SpecOptions

t.test('save', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      baz: 'custom:^1.0.0',
      foo: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    ...configData,
    projectRoot,
    mainManifest,
  })
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo@^1.0.0 || 1.2.3 || 2'),
    {
      name: 'foo',
      version: '1.0.0',
      dist: {
        integrity:
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      },
    },
  )
  if (!foo) {
    throw new Error('Missing expected package')
  }
  const fooBarEdge = new Edge('prod', Spec.parse('bar@1.2.3'), foo)
  graph.edges.add(fooBarEdge)
  foo.setResolved()
  foo.location = 'node_modules/.pnpm/foo@1.0.0/node_modules/foo'
  foo.dev = true
  graph
    .placePackage(foo, 'prod', Spec.parse('bar@^1.0.0'), {
      name: 'bar',
      version: '1.0.0',
    })
    ?.setResolved()
  const bar = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'bar@1.0.0']),
  )
  if (!bar) throw new Error('no bar')
  bar.dev = true
  bar.optional = true
  graph
    .placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('baz@custom:baz@^1.0.0', configData as SpecOptions),
      {
        name: 'baz',
        version: '1.0.0',
        dist: {
          tarball: 'http://example.com/baz.tgz',
        },
      },
    )
    ?.setResolved()
  const baz = graph.nodes.get(
    joinDepIDTuple(['registry', 'custom', 'baz@1.0.0']),
  )
  if (!baz) throw new Error('no baz node')
  baz.optional = true
  save({ ...configData, graph })
  t.matchSnapshot(
    readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
      encoding: 'utf8',
    }),
  )

  await t.test('save normal (no manifests)', async t => {
    save({ ...configData, graph })
    t.matchSnapshot(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
        encoding: 'utf8',
      }),
    )
  })

  await t.test('save hidden (yes manifests)', async t => {
    saveHidden({ ...configData, graph })
    t.matchSnapshot(
      readFileSync(
        resolve(projectRoot, 'node_modules/.vlt-lock.json'),
        {
          encoding: 'utf8',
        },
      ),
    )
  })
})

t.test('missing registries', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      baz: 'custom:^1.0.0',
      foo: '^1.0.0',
    },
  }
  const borkedConfigData = {
    registry: 'http://example.com',
    registries: undefined,
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    ...borkedConfigData,
    mainManifest,
  })
  const lockfile = lockfileData({ ...borkedConfigData, graph })
  t.matchSnapshot(JSON.stringify(lockfile, null, 2))
})

t.test('custom git hosts and catalogs', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: 'example:foo/bar',
    },
  }
  const specOptions = {
    catalog: { x: '1.2.3' },
    catalogs: { a: { x: '2.3.4' } },
    'git-hosts': {
      example: 'git+ssh://example.com/$1/$2.git',
    },
    'git-host-archives': {
      example: 'https://example.com/$1/$2/archive/$3.tar.gz',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    ...specOptions,
    mainManifest,
  })
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo', mainManifest.dependencies.foo, specOptions),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  const lockfile = lockfileData({ ...specOptions, graph })
  t.matchSnapshot(JSON.stringify(lockfile, null, 2))
})

t.test('jsr-registries', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      '@myscope/foo': '^1.0.0',
    },
  }
  const specOptions = {
    'scope-registries': {
      '@myscope': 'https://example.com/',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    ...specOptions,
    mainManifest,
  })
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse(
      'foo',
      mainManifest.dependencies['@myscope/foo'],
      specOptions,
    ),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  const lockfile = lockfileData({ ...specOptions, graph })
  t.matchSnapshot(JSON.stringify(lockfile, null, 2))
})

t.test('jsr-registries', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      '@foo/bar': 'intl:@foo/bar@1',
    },
  }
  const specOptions = {
    'jsr-registries': {
      intl: 'https://jsr.example.com/',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    ...specOptions,
    mainManifest,
  })
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse(
      '@foo/bar',
      mainManifest.dependencies['@foo/bar'],
      specOptions,
    ),
    {
      name: '@foo/bar',
      version: '1.0.0',
    },
  )
  const lockfile = lockfileData({ ...specOptions, graph })
  t.matchSnapshot(JSON.stringify(lockfile, null, 2))
})

t.test('overrides default registries', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const specOptions = {
    registry: 'http://example.com',
    registries: {
      npm: 'http://example.com',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    ...specOptions,
    mainManifest,
  })
  const lockfile = lockfileData({ ...specOptions, graph })
  t.matchSnapshot(JSON.stringify(lockfile, null, 2))
})

t.test('workspaces', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
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
  const monorepo = Monorepo.load(projectRoot)
  const graph = new Graph({
    projectRoot,
    ...configData,
    mainManifest,
    monorepo,
  })
  const b = graph.nodes.get(
    joinDepIDTuple(['workspace', 'packages/b']),
  )
  if (!b) {
    throw new Error('Missing workspace b')
  }
  // verify (in the snapshot) that the lockfile saves '' as '*'
  graph
    .placePackage(b, 'prod', Spec.parse('c@'), {
      name: 'c',
      version: '1.0.0',
      dist: {
        integrity:
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      },
    })
    ?.setResolved()

  save({ ...configData, graph })

  t.matchSnapshot(
    readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
      encoding: 'utf8',
    }),
    'should save lockfile with workspaces nodes',
  )

  await t.test('save manifests', async t => {
    save({ ...configData, graph })
    t.matchSnapshot(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
        encoding: 'utf8',
      }),
    )
  })
})

t.test('confused manifest', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    ...configData,
    projectRoot,
    mainManifest,
  })
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'test', // Different name to trigger confusion
      version: '1.0.0',
    },
  )
  if (!foo) {
    throw new Error('Missing expected package')
  }
  foo.setResolved()
  foo.location = 'node_modules/.pnpm/foo@1.0.0/node_modules/foo'

  // Save with manifests to include rawManifest
  saveHidden({ ...configData, graph })
  t.matchSnapshot(
    readFileSync(
      resolve(projectRoot, 'node_modules/.vlt-lock.json'),
      {
        encoding: 'utf8',
      },
    ),
    'should save lockfile with confused manifest',
  )
})

t.test('store modifiers', async t => {
  await t.test('with valid modifiers', async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({
      'vlt.json': JSON.stringify({
        modifiers: {
          ':root > #foo': '2',
        },
      }),
    })
    t.chdir(projectRoot)
    unload('project')
    const graph = new Graph({
      ...configData,
      projectRoot,
      mainManifest,
    })
    const foo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0'),
      {
        name: 'foo',
        version: '2.0.0',
        dist: {
          integrity:
            'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        },
      },
      undefined,
      ':root > #foo',
    )
    if (!foo) {
      throw new Error('Missing expected package')
    }
    foo.setResolved()
    save({
      ...configData,
      modifiers: new GraphModifier(configData),
      graph,
    })
    t.matchSnapshot(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), 'utf8'),
      'should save lockfile with modifiers',
    )
  })

  await t.test('with missing modifiers', async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({})
    t.chdir(projectRoot)
    unload('project')
    const graph = new Graph({
      ...configData,
      projectRoot,
      mainManifest,
    })
    const foo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0'),
      {
        name: 'foo',
        version: '1.0.0',
        dist: {
          integrity:
            'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        },
      },
    )!
    foo.setResolved()

    // Test with undefined modifiers
    // (should not include modifiers in lockfile data)
    t.matchSnapshot(
      lockfileData({ ...configData, graph, modifiers: undefined }),
      'should save lockfile without modifiers when undefined',
    )
  })

  await t.test('with empty modifiers config', async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({ 'vlt.json': '{}' })
    t.chdir(projectRoot)
    unload('project')
    const graph = new Graph({
      ...configData,
      projectRoot,
      mainManifest,
    })
    const foo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0'),
      {
        name: 'foo',
        version: '1.0.0',
        dist: {
          integrity:
            'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        },
      },
    )!
    foo.setResolved()

    // Create a modifiers object with empty config
    const mockModifiers = {
      config: {}, // Empty config should not be included in lockfile
    }

    // Test with empty modifiers config (should not include modifiers in lockfile)
    t.matchSnapshot(
      lockfileData({
        ...configData,
        graph,
        modifiers: mockModifiers as any,
      }),
      'should save lockfile without modifiers when config is empty',
    )
  })

  await t.test('with undefined scope registries', async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({ 'vlt.json': '{}' })
    t.chdir(projectRoot)
    unload('project')
    const graph = new Graph({
      ...configData,
      projectRoot,
      mainManifest,
    })
    const foo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0'),
      {
        name: 'foo',
        version: '1.0.0',
        dist: {
          integrity:
            'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        },
      },
    )!
    foo.setResolved()

    // Test with undefined scope registries
    // (should not include scope-registries in lockfile)
    t.matchSnapshot(
      lockfileData({
        ...configData,
        graph,
        'scope-registries': undefined,
      }),
      'should save lockfile without scope registries when undefined',
    )
  })

  await t.test('with invalid scope registries', async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({ 'vlt.json': '{}' })
    t.chdir(projectRoot)
    unload('project')
    const graph = new Graph({
      ...configData,
      projectRoot,
      mainManifest,
    })
    const foo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0'),
      {
        name: 'foo',
        version: '1.0.0',
        dist: {
          integrity:
            'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        },
      },
    )
    if (!foo) {
      throw new Error('Missing expected package')
    }
    foo.setResolved()

    // Test with invalid scope registries (not a record of strings) - should not include scope-registries in lockfile
    t.matchSnapshot(
      lockfileData({
        ...configData,
        graph,
        'scope-registries': 'invalid-type' as any,
      }),
      'should save lockfile without scope registries when invalid type',
    )
  })
})

t.test(
  'saveManifests with normalized author and contributors',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({ 'vlt.json': '{}' })
    t.chdir(projectRoot)
    unload('project')
    const graph = new Graph({
      ...configData,
      projectRoot,
      mainManifest,
    })

    // Import normalizeManifest function and types
    const { normalizeManifest } = await import('@vltpkg/types')

    // Create a package manifest with both author and contributors
    const rawManifest = {
      name: 'foo',
      version: '1.0.0',
      author: 'John Doe <john@example.com>',
      contributors: [
        'Jane Smith <jane@example.com>',
        { name: 'Bob Wilson', email: 'bob@example.com' },
      ],
      dist: {
        integrity:
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==' as const,
      },
    } as any

    // Normalize the manifest as required by Node class
    const normalizedManifest = normalizeManifest(rawManifest)

    const foo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo@^1.0.0'),
      normalizedManifest,
    )
    if (!foo) {
      throw new Error('Missing expected package')
    }
    foo.setResolved()

    // Use saveHidden which automatically sets saveManifests: true
    saveHidden({ ...configData, graph })
    t.matchSnapshot(
      readFileSync(
        resolve(projectRoot, 'node_modules/.vlt-lock.json'),
        {
          encoding: 'utf8',
        },
      ),
      'should save hidden lockfile with normalized manifest containing author and contributors',
    )
  },
)

t.test('save platform data for optional dependencies', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
    optionalDependencies: {
      bar: '^1.0.0',
      baz: '^1.0.0',
    },
  }

  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')

  const graph = new Graph({
    ...configData,
    projectRoot,
    mainManifest,
  })

  // Regular dependency (should not have platform data in lockfile)
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo@^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
      engines: { node: '>=14' },
      os: ['linux', 'darwin'],
      cpu: ['x64', 'arm64'],
      dist: {
        integrity:
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      },
    },
  )
  if (!foo) throw new Error('Missing foo package')
  foo.setResolved()

  // Optional dependency with platform requirements
  const bar = graph.placePackage(
    graph.mainImporter,
    'optional',
    Spec.parse('bar@^1.0.0'),
    {
      name: 'bar',
      version: '1.0.0',
      engines: { node: '>=16' },
      os: ['linux'],
      cpu: ['x64'],
      dist: {
        integrity:
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      },
    },
  )
  if (!bar) throw new Error('Missing bar package')
  bar.setResolved()
  bar.optional = true

  // Optional dependency without platform requirements
  const baz = graph.placePackage(
    graph.mainImporter,
    'optional',
    Spec.parse('baz@^1.0.0'),
    {
      name: 'baz',
      version: '1.0.0',
      dist: {
        integrity:
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      },
    },
  )
  if (!baz) throw new Error('Missing baz package')
  baz.setResolved()
  baz.optional = true

  // Save the lockfile and check that platform data is included for optional deps
  save({ ...configData, graph })
  const lockfileContent = JSON.parse(
    readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
      encoding: 'utf8',
    }),
  )

  // Verify platform data is saved for bar but not for foo or baz
  // Debug: log all node keys to see what format they're using
  const nodeKeys = Object.keys(lockfileContent.nodes)
  t.comment('Node keys in lockfile:', nodeKeys)

  // Find the actual key for bar
  const barKey = nodeKeys.find(k => k.includes('bar'))
  const barNode = barKey ? lockfileContent.nodes[barKey] : undefined
  t.ok(barNode, 'bar node exists in lockfile')
  t.ok(barNode?.[7], 'bar has platform data at index 7')
  t.same(
    barNode?.[7],
    {
      engines: { node: '>=16' },
      os: ['linux'],
      cpu: ['x64'],
    },
    'bar platform data is correct',
  )

  const fooKey = nodeKeys.find(k => k.includes('foo'))
  const fooNode = fooKey ? lockfileContent.nodes[fooKey] : undefined
  t.ok(fooNode, 'foo node exists in lockfile')
  t.notOk(
    fooNode?.[7],
    'foo does not have platform data (not optional)',
  )

  const bazKey = nodeKeys.find(k => k.includes('baz'))
  const bazNode = bazKey ? lockfileContent.nodes[bazKey] : undefined
  t.ok(bazNode, 'baz node exists in lockfile')
  t.notOk(
    bazNode?.[7],
    'baz does not have platform data (no platform requirements)',
  )

  t.matchSnapshot(
    JSON.stringify(lockfileContent, null, 2),
    'lockfile with platform data for optional dependencies',
  )
})
