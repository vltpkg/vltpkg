import t from 'tap'
import { load } from '../../src/lockfile/load.js'
import { SpecOptions } from '@vltpkg/spec'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.js'

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
    custom: 'http://example.com',
  },
} satisfies SpecOptions

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
}

t.test('load', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
        custom: 'https://registry.example.com',
      },
      nodes: {
        'file;.': ['my-project'],
        'registry;;foo@1.0.0': [
          'foo',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        ],
        'registry;;bar@1.0.0': [
          'bar',
          'sha512-6/deadbeef==',
          'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        ],
        'registry;;baz@1.0.0': ['baz', null],
      },
      edges: [
        ['file;.', 'prod', 'foo@^1.0.0', 'registry;;foo@1.0.0'],
        ['file;.', 'prod', 'bar@^1.0.0', 'registry;;bar@1.0.0'],
        ['file;.', 'prod', 'missing@^1.0.0'],
        [
          'registry;;bar@1.0.0',
          'prod',
          'baz@^1.0.0',
          'registry;;baz@1.0.0',
        ],
      ],
    }),
  })

  const graph = load({
    ...configData,
    dir,
    mainManifest,
  })
  t.matchSnapshot(humanReadableOutput(graph))
})

t.test('workspaces', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
        custom: 'http://example.com',
      },
      nodes: {
        'file;.': ['my-project'],
        'registry;;c@1.0.0': [
          'c',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        ],
        'workspace;packages%2Fa': ['a'],
        'workspace;packages%2Fb': ['b'],
      },
      edges: [
        [
          'workspace;packages%2Fb',
          'prod',
          'c@^1.0.0',
          'registry;;c@1.0.0',
        ],
      ],
    }),
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

  const graph = load({
    ...configData,
    dir,
    mainManifest,
  })
  t.matchSnapshot(humanReadableOutput(graph))
})

t.test('unknown dep type', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
      },
      nodes: {
        'file;.': ['my-project'],
        'registry;;foo@1.0.0': [
          'foo',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        ],
      },
      edges: [
        ['file;.', 'unknown', 'foo@^1.0.0', 'registry;;foo@1.0.0'],
      ],
    }),
  })

  t.throws(
    () =>
      load({
        ...configData,
        dir,
        mainManifest,
      }),
    /Found unsupported dependency type in lockfile/,
    'should throw a dependency type not found',
  )
})

t.test('missing root pkg', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
      },
      nodes: {},
      edges: [
        ['file;.', 'unknown', 'foo@^1.0.0', 'registry;;foo@1.0.0'],
      ],
    }),
  })

  t.throws(
    () =>
      load({
        ...configData,
        dir,
        mainManifest,
      }),
    /Missing nodes from lockfile/,
    'should throw a missing root package metadata error',
  )
})

t.test('missing root pkg', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
      },
      nodes: {
        'file;.': ['my-project'],
        'registry;;foo@1.0.0': [
          'foo',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        ],
      },
      edges: [[null, 'prod', 'foo@^1.0.0', 'registry;;foo@1.0.0']],
    }),
  })

  t.throws(
    () =>
      load({
        ...configData,
        dir,
        mainManifest,
      }),
    /Edge info missing its `from` node/,
    'should throw a missing from edge property',
  )
})
