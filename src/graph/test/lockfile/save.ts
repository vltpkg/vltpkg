import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { DependencyTypeLong } from '../../src/dependencies.js'
import { Graph } from '../../src/graph.js'
import { save } from '../../src/lockfile/save.js'

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
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
  const dir = t.testdir()
  const graph = new Graph(
    {
      mainManifest,
    },
    configData,
  )
  const foo = graph.placePackage(
    graph.mainImporter,
    'dependencies',
    Spec.parse('foo@^1.0.0'),
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
  graph
    .placePackage(foo, 'dependencies', Spec.parse('bar@^1.0.0'), {
      name: 'bar',
      version: '1.0.0',
    })
    ?.setResolved()
  graph
    .placePackage(
      graph.mainImporter,
      'dependencies',
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
  save({ ...configData, graph, dir })
  t.matchSnapshot(
    readFileSync(resolve(dir, 'vlt-lock.json'), { encoding: 'utf8' }),
  )
})

t.test('edge missing type', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      missing: '^1.0.0',
    },
  }
  const dir = t.testdir()
  const graph = new Graph(
    {
      mainManifest,
    },
    configData,
  )
  graph.newEdge(
    '' as DependencyTypeLong,
    Spec.parse('missing', '^1.0.0'),
    graph.mainImporter,
  )
  t.throws(
    () => save({ ...configData, graph, dir }),
    /Found edge with a missing type/,
    'should throw if finds an edge with missing type',
  )
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
  const dir = t.testdir()
  const graph = new Graph(
    {
      mainManifest,
    },
    borkedConfigData,
  )
  save({ ...borkedConfigData, graph, dir })
  t.matchSnapshot(
    readFileSync(resolve(dir, 'vlt-lock.json'), { encoding: 'utf8' }),
  )
})

t.test('workspaces', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt-workspaces.json': JSON.stringify({
      packages: ['./packages/*'],
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
  const monorepo = Monorepo.load(dir)
  const graph = new Graph(
    {
      mainManifest,
      monorepo,
    },
    configData,
  )
  const b = graph.nodes.get('workspace;packages%2Fb')
  if (!b) {
    throw new Error('Missing workspace b')
  }
  graph
    .placePackage(b, 'dependencies', Spec.parse('c@^1.0.0'), {
      name: 'c',
      version: '1.0.0',
      dist: {
        integrity:
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      },
    })
    ?.setResolved()

  save({ ...configData, graph, dir })

  t.matchSnapshot(
    readFileSync(resolve(dir, 'vlt-lock.json'), { encoding: 'utf8' }),
    'should save lockfile with workspaces nodes',
  )
})
