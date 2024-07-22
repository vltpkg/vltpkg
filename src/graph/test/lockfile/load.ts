import { SpecOptions } from '@vltpkg/spec'
import t from 'tap'
import { load } from '../../src/lockfile/load.js'
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
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
        custom: 'https://registry.example.com',
      },
      nodes: {
        'file;.': ['my-project'],
        'file;linked': ['linked'],
        ';;foo@1.0.0': [
          'foo',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        ],
        ';;bar@1.0.0': [
          'bar',
          'sha512-6/deadbeef==',
          'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        ],
        ';;baz@1.0.0': [
          'baz',
          null,
          null,
          './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
        ],
      },
      edges: [
        ['file;.', 'prod', 'linked@file:./linked', 'file;linked'],
        ['file;.', 'prod', 'foo@^1.0.0', ';;foo@1.0.0'],
        ['file;.', 'prod', 'bar@^1.0.0', ';;bar@1.0.0'],
        ['file;.', 'prod', 'missing@^1.0.0'],
        [';;bar@1.0.0', 'prod', 'baz@^1.0.0', ';;baz@1.0.0'],
      ],
    }),
  })

  const graph = load({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(humanReadableOutput(graph))
})

t.test('workspaces', async t => {
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
        custom: 'http://example.com',
      },
      nodes: {
        'file;.': ['my-project'],
        ';;c@1.0.0': [
          'c',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        ],
        'workspace;packages%2Fa': ['a'],
        'workspace;packages%2Fb': ['b'],
      },
      edges: [
        ['workspace;packages%2Fb', 'prod', 'c@^1.0.0', ';;c@1.0.0'],
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
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(humanReadableOutput(graph))
})

t.test('unknown dep type', async t => {
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
      },
      nodes: {
        'file;.': ['my-project'],
        ';;foo@1.0.0': [
          'foo',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        ],
      },
      edges: [['file;.', 'unknown', 'foo@^1.0.0', ';;foo@1.0.0']],
    }),
  })

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

t.test('missing root pkg', async t => {
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
      },
      nodes: {},
      edges: [['file;.', 'unknown', 'foo@^1.0.0', ';;foo@1.0.0']],
    }),
  })

  t.throws(
    () =>
      load({
        ...configData,
        projectRoot,
        mainManifest,
      }),
    /Missing nodes from lockfile/,
    'should throw a missing root package metadata error',
  )
})

t.test('missing root pkg', async t => {
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
      },
      nodes: {
        'file;.': ['my-project'],
        ';;foo@1.0.0': [
          'foo',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        ],
      },
      edges: [[null, 'prod', 'foo@^1.0.0', ';;foo@1.0.0']],
    }),
  })

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
