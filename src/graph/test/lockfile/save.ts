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

t.test('custom git hosts', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: 'example:foo/bar',
    },
  }
  const specOptions = {
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
