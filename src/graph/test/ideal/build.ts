import t from 'tap'
import { build } from '../../src/ideal/build.js'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.js'

t.test('build from lockfile', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }),
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
        ['file;.', 'prod', 'foo@^1.0.0', 'registry;;foo@1.0.0'],
      ],
    }),
  })

  const graph = await build({
    projectRoot,
    add: new Map([['file;.', new Map()]]),
    remove: new Map(),
  })

  t.matchSnapshot(
    humanReadableOutput(graph),
    'should build an ideal tree starting from a virtual graph',
  )
})

t.test('build from actual files', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }),
    node_modules: {
      '.vlt': {
        'registry;;foo@1.0.0': {
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
        '.vlt/registry;;foo@1.0.0/node_modules/foo',
      ),
    },
  })

  const graph = await build({
    projectRoot,
  })

  t.matchSnapshot(
    humanReadableOutput(graph),
    'should build an ideal tree starting from a virtual graph',
  )
})
