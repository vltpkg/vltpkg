import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
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
  const projectRoot = t.testdir()
  const graph = new Graph({
    ...configData,
    projectRoot,
    mainManifest,
  })
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
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
  foo.location = 'node_modules/.pnpm/foo@1.0.0/node_modules/foo'
  graph
    .placePackage(foo, 'prod', Spec.parse('bar@^1.0.0'), {
      name: 'bar',
      version: '1.0.0',
    })
    ?.setResolved()
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
  save({ ...configData, graph })
  t.matchSnapshot(
    readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
      encoding: 'utf8',
    }),
  )

  await t.test('save manifests', async t => {
    save({ ...configData, graph, saveManifests: true })
    t.matchSnapshot(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
        encoding: 'utf8',
      }),
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
  const projectRoot = t.testdir()
  const graph = new Graph({
    projectRoot,
    ...borkedConfigData,
    mainManifest,
  })
  save({ ...borkedConfigData, graph })
  t.matchSnapshot(
    readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
      encoding: 'utf8',
    }),
  )
})

t.test('workspaces', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const projectRoot = t.testdir({
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
  const monorepo = Monorepo.load(projectRoot)
  const graph = new Graph({
    projectRoot,
    ...configData,
    mainManifest,
    monorepo,
  })
  const b = graph.nodes.get('workspace;packages%2Fb')
  if (!b) {
    throw new Error('Missing workspace b')
  }
  graph
    .placePackage(b, 'prod', Spec.parse('c@^1.0.0'), {
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
    save({ ...configData, graph, saveManifests: true })
    t.matchSnapshot(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
        encoding: 'utf8',
      }),
    )
  })
})
